import axios from 'axios';
import OpenAI from 'openai';
import { config } from '../../config';
import { roofEstimatorRepository } from './roof-estimator.repository';
import {
    CreateEstimateDto, UpdateEstimateDto, EstimateQueryDto, UpdateSettingsDto,
} from './roof-estimator.dto';
import { logger } from '../../common/utils/logger';
import { activityLogger } from '../../common/services/activity-logger.service';
import { BadRequestError, ServiceUnavailableError } from '../../common/errors/HttpErrors';

const GOOGLE_GEOCODING_API_KEY = config.integrations.google.geocodingApiKey || '';
const GOOGLE_STATIC_MAPS_API_KEY = config.integrations.google.staticMapsApiKey || GOOGLE_GEOCODING_API_KEY || '';
const GOOGLE_PLACES_API_KEY = config.integrations.google.placesApiKey || '';
const ATTOM_API_KEY = config.integrations.attomApiKey || '';
const OPENAI_API_KEY = config.ai.openaiApiKey || '';
const AI_SERVICE_URL = config.integrations.aiServiceUrl;
const HEAT_SERVICE_URL = config.integrations.heatServiceUrl;
const SAM_SERVICE_URL = config.integrations.samServiceUrl;
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

// ── In-memory parcel cache (keyed by rounded lat,lng) ─────────────────────
const parcelCache = new Map<string, { data: any; timestamp: number }>();
const PARCEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type GoogleAddressComponent = {
    long_name: string;
    short_name: string;
    types: string[];
};

type GoogleGeocodingResult = {
    formatted_address?: string;
    address_components?: GoogleAddressComponent[];
    geometry?: {
        location?: {
            lat?: number;
            lng?: number;
        };
        location_type?: string;
    };
    partial_match?: boolean;
    types?: string[];
};

type NominatimResult = {
    lat?: string;
    lon?: string;
    display_name?: string;
    importance?: number | string;
    address?: Record<string, string | undefined>;
};

type GeocodeInput = {
    postalCode: string | null;
    houseNumber: string | null;
    streetToken: string;
    route: string | null;
    locality: string | null;
    normalizedAddress: string;
};

export class RoofEstimatorService {
    private normalizeText(value: string): string {
        return value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
    }

    private normalizeCanadianPostalCode(value?: string | null): string | null {
        if (!value) return null;
        const match = value.toUpperCase().match(/\b([ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z])[ -]?(\d[ABCEGHJ-NPRSTV-Z]\d)\b/);
        if (!match) return null;
        return `${match[1]}${match[2]}`;
    }

    private extractHouseNumber(address: string): string | null {
        const firstSegment = (address.split(',')[0] || '').trim();
        const match = firstSegment.match(/^(\d{1,8})\b/);
        return match ? match[1] : null;
    }

    private extractStreetToken(address: string): string {
        const firstSegment = (address.split(',')[0] || address).trim();
        return firstSegment.replace(/^(\d{1,8}\s+)/, '').trim();
    }

    private extractLocality(address: string): string | null {
        const segments = address
            .split(',')
            .map((segment) => segment.trim())
            .filter(Boolean);
        if (segments.length < 2) return null;

        const provincePattern = /\b(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\b/i;

        for (let index = 1; index < segments.length; index += 1) {
            const segment = segments[index];
            if (/^canada$/i.test(segment)) continue;
            if (this.normalizeCanadianPostalCode(segment)) continue;
            if (provincePattern.test(segment)) continue;
            if (/^\d/.test(segment)) continue;
            return segment;
        }

        return null;
    }

    private buildGeocodeInput(address: string): GeocodeInput {
        const route = this.extractStreetToken(address);
        return {
            postalCode: this.normalizeCanadianPostalCode(address),
            houseNumber: this.extractHouseNumber(address),
            streetToken: route,
            route: route || null,
            locality: this.extractLocality(address),
            normalizedAddress: this.normalizeText(address),
        };
    }

    private buildGoogleComponentsForAddress(address: string): string {
        const parsed = this.buildGeocodeInput(address);
        const components: string[] = ['country:ca|country:us'];
        if (parsed.postalCode) {
            components.push(`postal_code:${parsed.postalCode}`);
        }
        if (parsed.locality) {
            components.push(`locality:${parsed.locality}`);
        }
        if (parsed.route) {
            components.push(`route:${parsed.route}`);
        }
        return components.join('|');
    }

    private getGoogleAddressComponent(result: GoogleGeocodingResult, type: string): string | null {
        const component = (result.address_components || []).find((entry) => entry.types.includes(type));
        if (!component) return null;
        return component.long_name || component.short_name || null;
    }

    private scoreGoogleResult(result: GoogleGeocodingResult, input: GeocodeInput): number {
        let score = 0;

        const postal = this.normalizeCanadianPostalCode(this.getGoogleAddressComponent(result, 'postal_code'));
        if (input.postalCode && postal) {
            if (postal === input.postalCode) score += 120;
            else if (postal.slice(0, 3) === input.postalCode.slice(0, 3)) score += 45;
        }

        const house = this.getGoogleAddressComponent(result, 'street_number');
        if (input.houseNumber && house) {
            const normalizedHouse = house.replace(/\D/g, '');
            if (normalizedHouse === input.houseNumber) score += 90;
        }

        const route = this.getGoogleAddressComponent(result, 'route');
        const normalizedInputStreet = this.normalizeText(input.streetToken);
        const normalizedRoute = this.normalizeText(route || '');
        if (normalizedInputStreet && normalizedRoute) {
            if (normalizedInputStreet === normalizedRoute) score += 70;
            else if (normalizedInputStreet.includes(normalizedRoute) || normalizedRoute.includes(normalizedInputStreet)) {
                score += 40;
            }
        }

        if (result.partial_match) score -= 35;

        const locationType = result.geometry?.location_type;
        if (locationType === 'ROOFTOP') score += 20;
        else if (locationType === 'RANGE_INTERPOLATED') score += 8;

        if ((result.types || []).includes('street_address')) score += 20;
        else if ((result.types || []).includes('premise')) score += 12;

        const formattedAddressNormalized = this.normalizeText(result.formatted_address || '');
        if (formattedAddressNormalized && normalizedInputStreet && formattedAddressNormalized.includes(normalizedInputStreet)) {
            score += 12;
        }

        return score;
    }

    private selectBestGoogleResult(results: GoogleGeocodingResult[], address: string): GoogleGeocodingResult | null {
        if (!results.length) return null;
        if (results.length === 1) return results[0];

        const input = this.buildGeocodeInput(address);
        let best: GoogleGeocodingResult | null = null;
        let bestScore = Number.NEGATIVE_INFINITY;

        results.forEach((result) => {
            const score = this.scoreGoogleResult(result, input);
            if (score > bestScore) {
                bestScore = score;
                best = result;
            }
        });

        return best || results[0];
    }

    private scoreNominatimResult(result: NominatimResult, input: GeocodeInput): number {
        let score = 0;
        const addr = result.address || {};

        const postal = this.normalizeCanadianPostalCode(addr.postcode);
        if (input.postalCode && postal) {
            if (postal === input.postalCode) score += 115;
            else if (postal.slice(0, 3) === input.postalCode.slice(0, 3)) score += 40;
        }

        const house = (addr.house_number || '').replace(/\D/g, '');
        if (input.houseNumber && house && house === input.houseNumber) {
            score += 85;
        }

        const street = addr.road || addr.pedestrian || addr.residential || addr.cycleway || '';
        const normalizedInputStreet = this.normalizeText(input.streetToken);
        const normalizedStreet = this.normalizeText(street);
        if (normalizedInputStreet && normalizedStreet) {
            if (normalizedInputStreet === normalizedStreet) score += 65;
            else if (normalizedInputStreet.includes(normalizedStreet) || normalizedStreet.includes(normalizedInputStreet)) {
                score += 36;
            }
        }

        const display = this.normalizeText(result.display_name || '');
        if (input.houseNumber && display.includes(input.houseNumber)) {
            score += 16;
        }
        if (normalizedInputStreet && display.includes(normalizedInputStreet)) {
            score += 14;
        }

        const importance = Number(result.importance);
        if (Number.isFinite(importance)) {
            score += importance * 5;
        }

        return score;
    }

    private selectBestNominatimResult(results: NominatimResult[], address: string): NominatimResult | null {
        if (!results.length) return null;
        if (results.length === 1) return results[0];

        const input = this.buildGeocodeInput(address);
        let best: NominatimResult | null = null;
        let bestScore = Number.NEGATIVE_INFINITY;

        results.forEach((result) => {
            const score = this.scoreNominatimResult(result, input);
            if (score > bestScore) {
                bestScore = score;
                best = result;
            }
        });

        return best || results[0];
    }

    private async geocodeAddressViaNominatim(address: string): Promise<{ lat: number; lng: number; formattedAddress: string }> {
        const cleanedAddress = address
            .replace(/[^\x20-\x7E]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const withoutCountry = cleanedAddress.replace(/,\s*canada$/i, '').trim();
        const withoutPostal = withoutCountry
            .replace(/\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d\b/gi, '')
            .replace(/\s+,/g, ',')
            .replace(/,+/g, ',')
            .replace(/\s+/g, ' ')
            .replace(/,\s*$/, '')
            .trim();

        const candidates = Array.from(
            new Set(
                [
                    cleanedAddress,
                    withoutCountry,
                    withoutPostal,
                ].filter(Boolean)
            )
        ).map((q, idx) => ({
            q,
            countrycodes: idx < 2 ? 'ca,us' : undefined,
        }));

        const collectedResults: NominatimResult[] = [];

        for (const candidate of candidates) {
            const response = await axios.get(NOMINATIM_SEARCH_URL, {
                params: {
                    q: candidate.q,
                    format: 'json',
                    limit: 8,
                    addressdetails: 1,
                    ...(candidate.countrycodes ? { countrycodes: candidate.countrycodes } : {}),
                },
                headers: {
                    // Required by Nominatim usage policy
                    'User-Agent': 'ZODO-CRM-RoofEstimator/1.0 (support@zodo.ca)',
                    'Accept-Language': 'en',
                },
                timeout: 10000,
            });

            const results = Array.isArray(response.data) ? (response.data as NominatimResult[]) : [];
            if (results.length) {
                collectedResults.push(...results);
            }
        }

        const best = this.selectBestNominatimResult(collectedResults, cleanedAddress);
        if (best) {
            const lat = Number(best.lat);
            const lng = Number(best.lon);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                return {
                    lat,
                    lng,
                    formattedAddress: best.display_name || cleanedAddress,
                };
            }
        }

        throw new BadRequestError(
            'Could not find coordinates for this address. Please enter a complete Canadian address.',
            'GEOCODING_ZERO_RESULTS'
        );
    }

    async geocodeAddressWithFallback(
        address: string,
        reason: string,
        originalMessage?: string,
    ): Promise<{ lat: number; lng: number; formattedAddress: string }> {
        try {
            const fallback = await this.geocodeAddressViaNominatim(address);
            logger.warn('Using fallback geocoder for roof estimator', {
                reason,
                address,
                formattedAddress: fallback.formattedAddress,
            });
            return fallback;
        } catch (fallbackErr: unknown) {
            if (fallbackErr instanceof BadRequestError) {
                throw fallbackErr;
            }

            logger.error('Fallback geocoding failed', {
                reason,
                address,
                error: (fallbackErr as Error).message,
            });

            throw new ServiceUnavailableError(
                originalMessage
                    ? `${originalMessage} Fallback geocoder also failed.`
                    : 'Geocoding is temporarily unavailable. Please try again later.'
            );
        }
    }

    private async autocompleteAddressViaNominatim(input: string): Promise<Array<{ description: string; placeId: string }>> {
        try {
            const response = await axios.get(NOMINATIM_SEARCH_URL, {
                params: {
                    q: input,
                    format: 'json',
                    limit: 6,
                    addressdetails: 1,
                    countrycodes: 'ca,us',
                },
                headers: {
                    'User-Agent': 'ZODO-CRM-RoofEstimator/1.0 (support@zodo.ca)',
                    'Accept-Language': 'en',
                },
                timeout: 7000,
            });

            const results = Array.isArray(response.data) ? (response.data as NominatimResult[]) : [];
            return results
                .map((entry) => ({
                    description: String(entry.display_name || '').trim(),
                    // Keep empty so frontend won't send a non-Google placeId to geocoder.
                    placeId: '',
                }))
                .filter((entry) => entry.description.length > 0);
        } catch (err: any) {
            logger.error('Nominatim autocomplete fallback failed', {
                message: err.message,
                status: err.response?.status,
            });
            return [];
        }
    }

    /**
     * Autocomplete address using Google Places API
     */
    async autocompleteAddress(input: string): Promise<Array<{ description: string; placeId: string }>> {
        const apiKey = GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
            logger.error('Google Places API key not configured — set GOOGLE_PLACES_API_KEY, GOOGLE_GEOCODING_API_KEY, or GOOGLE_MAPS_JS_API_KEY in .env');
            return this.autocompleteAddressViaNominatim(input);
        }

        try {
            const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
                params: {
                    input,
                    key: apiKey,
                    types: 'address',
                    components: 'country:ca|country:us',
                    language: 'en',
                },
                timeout: 5000,
            });

            if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
                logger.warn('Places autocomplete API error', {
                    status: response.data.status,
                    errorMessage: response.data.error_message,
                    input,
                });
                return this.autocompleteAddressViaNominatim(input);
            }
            const predictions = (response.data.predictions || []).map((p: any) => ({
                description: p.description,
                placeId: p.place_id || '',
            }));
            if (predictions.length > 0) {
                return predictions;
            }
            return this.autocompleteAddressViaNominatim(input);
        } catch (err: any) {
            logger.error('Places autocomplete request failed', {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data,
            });
            return this.autocompleteAddressViaNominatim(input);
        }
    }

    private async geocodePlaceIdViaGeocoding(placeId: string): Promise<{ lat: number; lng: number; formattedAddress: string; locationType: string }> {
        if (!GOOGLE_GEOCODING_API_KEY) {
            throw new ServiceUnavailableError(
                'Roof estimator geocoding is not configured. Set GOOGLE_GEOCODING_API_KEY (or GOOGLE_MAPS_JS_API_KEY) on the backend.'
            );
        }

        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                place_id: placeId,
                key: GOOGLE_GEOCODING_API_KEY,
                language: 'en',
            },
            timeout: 10000,
        });

        const status = response.data.status as string;
        const errorMessage = response.data.error_message as string | undefined;

        if (status !== 'OK' || !response.data.results?.length) {
            if (status === 'ZERO_RESULTS') {
                throw new BadRequestError(
                    'Selected address could not be resolved. Please choose another suggestion.',
                    'GEOCODING_PLACE_ID_ZERO_RESULTS'
                );
            }

            if (status === 'INVALID_REQUEST') {
                throw new BadRequestError(
                    'Selected address is invalid. Please choose a suggestion again.',
                    'GEOCODING_PLACE_ID_INVALID_REQUEST'
                );
            }

            throw new ServiceUnavailableError(
                errorMessage
                    ? `Google Geocoding API failed for selected address: ${errorMessage}`
                    : `Google Geocoding API failed for selected address (${status}).`
            );
        }

        const result = response.data.results[0];
        return {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            formattedAddress: result.formatted_address,
            locationType: result.geometry?.location_type || 'UNKNOWN',
        };
    }

    private assertRooftopPrecision(locationType: string, placeId: string): void {
        // Accept ROOFTOP (exact) and RANGE_INTERPOLATED (interpolated between two points — good enough for houses)
        if (locationType === 'ROOFTOP' || locationType === 'RANGE_INTERPOLATED' || locationType === 'PLACE_DETAILS') return;
        throw new BadRequestError(
            `Selected suggestion is ${locationType.replace(/_/g, ' ')} precision, not ROOFTOP. Please choose a more specific house address.`,
            'GEOCODING_PLACE_ID_NOT_ROOFTOP',
            { placeId, locationType }
        );
    }

    /**
     * Google Place Details API — fetch detailed place info after autocomplete selection.
     * Returns full address, coordinates, place types, and viewport for precise map centering.
     */
    async getPlaceDetails(placeId: string): Promise<{
        placeId: string;
        formattedAddress: string;
        lat: number;
        lng: number;
        locationType: string;
        types: string[];
        url: string | null;
        viewport: { northeast: { lat: number; lng: number }; southwest: { lat: number; lng: number } } | null;
    }> {
        if (!GOOGLE_PLACES_API_KEY) {
            throw new ServiceUnavailableError(
                'Google Places API key is not configured. Set GOOGLE_PLACES_API_KEY in .env'
            );
        }

        const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: {
                place_id: placeId,
                key: GOOGLE_PLACES_API_KEY,
                fields: 'formatted_address,geometry,types,url,address_component,place_id',
                language: 'en',
            },
            timeout: 10000,
        });

        const status = response.data.status as string;
        const errorMessage = response.data.error_message as string | undefined;

        if (status !== 'OK' || !response.data.result?.geometry?.location) {
            if (status === 'NOT_FOUND' || status === 'ZERO_RESULTS') {
                throw new BadRequestError(
                    'Selected place could not be found. Please choose another suggestion.',
                    'PLACE_DETAILS_NOT_FOUND'
                );
            }
            throw new ServiceUnavailableError(
                errorMessage
                    ? `Google Place Details API error: ${errorMessage}`
                    : `Google Place Details API error (${status}).`
            );
        }

        const result = response.data.result;
        const lat = Number(result.geometry.location.lat);
        const lng = Number(result.geometry.location.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new ServiceUnavailableError('Google Place Details returned invalid coordinates.');
        }

        const viewport = result.geometry.viewport
            ? {
                northeast: {
                    lat: Number(result.geometry.viewport.northeast.lat),
                    lng: Number(result.geometry.viewport.northeast.lng),
                },
                southwest: {
                    lat: Number(result.geometry.viewport.southwest.lat),
                    lng: Number(result.geometry.viewport.southwest.lng),
                },
            }
            : null;

        return {
            placeId: result.place_id || placeId,
            formattedAddress: result.formatted_address || '',
            lat,
            lng,
            locationType: result.geometry.location_type || 'ROOFTOP', // Place Details gives precise coords
            types: Array.isArray(result.types) ? result.types : [],
            url: result.url || null,
            viewport,
        };
    }

    private async geocodeByPlaceId(placeId: string): Promise<{ lat: number; lng: number; formattedAddress: string; locationType: string }> {
        // Use Google Place Details API — this gives precise lat/lng from the place_id
        // which is the most accurate source (derived from Google's Places database)
        const placeDetails = await this.getPlaceDetails(placeId);

        // Place Details locationType is typically 'ROOFTOP' equivalent
        // Use the Place Details coordinates directly — no need for secondary geocoding
        let locationType = placeDetails.locationType || 'PLACE_DETAILS';

        // Only try Geocoding API if we need to validate location_type
        // and Place Details didn't provide one
        if (locationType === 'UNKNOWN' || !locationType) {
            try {
                const geocoded = await this.geocodePlaceIdViaGeocoding(placeId);
                locationType = geocoded.locationType || 'UNKNOWN';
            } catch {
                // Geocoding validation failed — still use Place Details coords
                locationType = 'PLACE_DETAILS';
            }
        }

        this.assertRooftopPrecision(locationType, placeId);

        return {
            lat: placeDetails.lat,
            lng: placeDetails.lng,
            formattedAddress: placeDetails.formattedAddress,
            locationType,
        };
    }

    /**
     * Resolve selected autocomplete place into rooftop-validated coordinates.
     * Free-text geocoding is intentionally not used in this pipeline.
     */
    async geocodeAddress(address: string, placeId?: string): Promise<{ lat: number; lng: number; formattedAddress: string; locationType: string }> {
        const normalizedPlaceId = typeof placeId === 'string' ? placeId.trim() : '';

        // If no placeId (e.g. Nominatim autocomplete fallback), geocode by address text
        if (!normalizedPlaceId) {
            if (!address || address.trim().length < 5) {
                throw new BadRequestError(
                    'Select an autocomplete suggestion before loading satellite imagery.',
                    'PLACE_ID_REQUIRED'
                );
            }

            logger.info('No placeId provided, falling back to Nominatim geocoding', {
                inputAddress: address,
            });

            const fallback = await this.geocodeAddressWithFallback(
                address,
                'No placeId — Nominatim autocomplete suggestion selected',
            );
            return {
                ...fallback,
                locationType: 'NOMINATIM',
            };
        }

        try {
            const resolved = await this.geocodeByPlaceId(normalizedPlaceId);
            logger.info('Resolved address using placeId for roof estimator geocoding', {
                placeId: normalizedPlaceId,
                inputAddress: address,
                formattedAddress: resolved.formattedAddress,
                locationType: resolved.locationType,
            });
            return resolved;
        } catch (err: unknown) {
            if (err instanceof BadRequestError || err instanceof ServiceUnavailableError) {
                throw err;
            }
            logger.error('PlaceId rooftop geocoding failed', {
                placeId: normalizedPlaceId,
                inputAddress: address,
                error: (err as Error).message,
            });
            throw new ServiceUnavailableError(
                'Unable to resolve the selected address with rooftop precision. Please pick another suggestion.'
            );
        }
    }

    /**
     * Fetch satellite image URL from Google Maps Static API
     */
    getSatelliteImageUrl(lat: number, lng: number, zoom = 20, size = '640x640'): string {
        if (!GOOGLE_STATIC_MAPS_API_KEY) {
            throw new ServiceUnavailableError(
                'Roof estimator satellite imagery is not configured. Set GOOGLE_STATIC_MAPS_API_KEY (or GOOGLE_MAPS_JS_API_KEY) on the backend.'
            );
        }

        return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=satellite&key=${GOOGLE_STATIC_MAPS_API_KEY}`;
    }

    /**
     * Fetch the satellite image as a buffer (for sending to AI service)
     */
    async fetchSatelliteImageBuffer(url: string): Promise<Buffer> {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 15000,
        });
        return Buffer.from(response.data);
    }

    /**
     * Send image to Python AI microservice for roof detection
     */
    async detectRoof(params: {
        imageBuffer: Buffer;
        latitude?: number;
        zoom?: number;
    }): Promise<{
        roof_area_sqft: number;
        confidence: number;
        processing_time_seconds: number;
        model: string;
    }> {
        const FormData = (await import('form-data')).default;

        let retries = 2;
        let lastError: Error | null = null;

        while (retries >= 0) {
            try {
                // Recreate form-data on every retry attempt to avoid reusing consumed streams.
                const formData = new FormData();
                formData.append('file', params.imageBuffer, { filename: 'satellite.png', contentType: 'image/png' });
                if (Number.isFinite(params.latitude)) {
                    formData.append('latitude', String(params.latitude));
                }
                if (Number.isFinite(params.zoom)) {
                    formData.append('zoom', String(params.zoom));
                }

                const response = await axios.post(`${AI_SERVICE_URL}/detect-roof`, formData, {
                    headers: formData.getHeaders(),
                    timeout: 30000, // 30s timeout for AI inference
                    maxBodyLength: 10 * 1024 * 1024,
                });
                return response.data;
            } catch (error: any) {
                lastError = error;
                retries--;
                if (retries >= 0) {
                    logger.warn(`AI service call failed, retrying... (${retries + 1} retries left)`, {
                        error: error.message,
                        status: error?.response?.status,
                        data: error?.response?.data,
                    });
                    await new Promise((r) => setTimeout(r, 1000));
                }
            }
        }

        throw new Error(`AI service unavailable after retries: ${lastError?.message}`);
    }

    /**
     * Check AI service health
     */
    async checkAiHealth(): Promise<boolean> {
        try {
            const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
            return response.data?.status === 'healthy';
        } catch {
            return false;
        }
    }

    /**
     * Send satellite image URL to HEAT Python microservice for roof plane extraction.
     * Returns detected roof plane polygons with vertices and edges.
     */
    async detectRoofPlanes(imageUrl: string): Promise<{
        roof_planes: Array<{
            plane_id: number;
            polygon: number[][];
            area_pixels: number;
            centroid: number[];
            num_vertices: number;
        }>;
        plane_count: number;
        vertices: number[][];
        edges: number[][];
        inference_time_seconds: number;
        original_image_size: number[];
    }> {
        let retries = 2;
        let lastError: Error | null = null;

        while (retries >= 0) {
            try {
                const response = await axios.post(
                    `${HEAT_SERVICE_URL}/analyze-roof`,
                    { image_url: imageUrl },
                    { timeout: 60000 }, // 60s — CPU inference can be slow
                );
                return response.data;
            } catch (error: any) {
                lastError = error;
                retries--;
                if (retries >= 0) {
                    logger.warn(`HEAT service call failed, retrying... (${retries + 1} left)`, {
                        error: error.message,
                        status: error?.response?.status,
                    });
                    await new Promise((r) => setTimeout(r, 1000));
                }
            }
        }

        throw new Error(`HEAT service unavailable after retries: ${lastError?.message}`);
    }

    /**
     * Check HEAT service health
     */
    async checkHeatHealth(): Promise<boolean> {
        try {
            const response = await axios.get(`${HEAT_SERVICE_URL}/health`, { timeout: 5000 });
            return response.data?.model_loaded === true;
        } catch {
            return false;
        }
    }

    /**
     * Send satellite image URL to SAM service for roof segmentation.
     * Returns colored overlay image (base64), roof polygon, and mask area.
     */
    async segmentRoof(imageUrl: string): Promise<{
        found: boolean;
        roof_polygon: number[][];
        mask_area: number;
        overlay_image: string;
        bbox: number[];
        centroid: number[];
        score: number;
        image_size: number[];
        inference_time_seconds: number;
    }> {
        let retries = 2;
        let lastError: Error | null = null;

        while (retries >= 0) {
            try {
                const response = await axios.post(
                    `${SAM_SERVICE_URL}/segment-roof`,
                    { image_url: imageUrl },
                    { timeout: 120000 }, // 120s — SAM on CPU can be slow
                );
                return response.data;
            } catch (error: any) {
                lastError = error;
                retries--;
                if (retries >= 0) {
                    logger.warn(`SAM service call failed, retrying... (${retries + 1} left)`, {
                        error: error.message,
                        status: error?.response?.status,
                    });
                    await new Promise((r) => setTimeout(r, 1000));
                }
            }
        }

        throw new Error(`SAM service unavailable after retries: ${lastError?.message}`);
    }

    /**
     * Check SAM service health
     */
    async checkSamHealth(): Promise<boolean> {
        try {
            const response = await axios.get(`${SAM_SERVICE_URL}/health`, { timeout: 5000 });
            return response.data?.model_loaded === true;
        } catch {
            return false;
        }
    }

    /**
     * Full segmentation pipeline:
     *   satellite image → AI segmentation → mask→polygon → Solar API validation
     *   → roof plane detection → ridge/valley/hip/eave/rake → pitch correction
     *   → confidence scoring → final measurements
     *
     * Integrates SolarRoofService + RoofGeometryService.
     */
    async detectRoofSegmented(params: {
        lat: number;
        lng: number;
        address?: string;
        tenantId: string;
        estimateId?: string;
        zoom?: number;
        imageSize?: number;
        roofType?: string;
    }): Promise<{
        measurements: import('./roof-geometry.service').RoofMeasurements;
        solarInsights: import('./solar-roof.service').SolarRoofInsights | null;
        validation: import('./solar-roof.service').RoofValidationResult | null;
        aiModel: string;
        processingTimeSec: number;
    }> {
        const { roofGeometryService } = await import('./roof-geometry.service');
        const { solarRoofService } = await import('./solar-roof.service');

        const startTime = Date.now();
        const zoom = params.zoom || 20;
        const imageSize = params.imageSize || 1024;
        const sizeStr = `${imageSize}x${imageSize}`;

        // ── Step 1: Fetch Solar API data (parallel with satellite image) ──
        let solarInsights: import('./solar-roof.service').SolarRoofInsights | null = null;
        const solarPromise = solarRoofService
            .getRoofInsights(params.lat, params.lng, params.tenantId, params.estimateId, params.address)
            .catch((err: Error) => {
                logger.warn('[detectRoofSegmented] Solar API failed (non-blocking)', {
                    error: err.message,
                    lat: params.lat,
                    lng: params.lng,
                });
                return null;
            });

        // ── Step 2: Fetch satellite image ──
        const satelliteUrl = this.getSatelliteImageUrl(params.lat, params.lng, zoom, sizeStr);
        const imageBuffer = await this.fetchSatelliteImageBuffer(satelliteUrl);

        // ── Step 3: Send to AI service for segmentation ──
        const segResult = await this.detectRoof({
            imageBuffer,
            latitude: params.lat,
            zoom,
        });

        // Wait for Solar API
        solarInsights = await solarPromise;

        // ── Step 4: Compute geometry + measurements ──
        const solarSegments = solarInsights?.segments?.map((s) => ({
            pitchDegrees: s.pitchDegrees,
            azimuthDegrees: s.azimuthDegrees,
            areaSqft: s.areaSqft,
            areaMeters2: s.areaMeters2,
            centerLat: s.centerLat,
            centerLng: s.centerLng,
        }));

        const measurements = roofGeometryService.computeAllMeasurements({
            segmentation: segResult as any,
            centerLat: params.lat,
            centerLng: params.lng,
            zoom,
            imageWidth: imageSize,
            imageHeight: imageSize,
            solarSegments,
            solarAreaSqft: solarInsights?.roofAreaSqft,
            roofType: params.roofType,
        });

        // ── Step 5: Solar API validation ──
        let validation: import('./solar-roof.service').RoofValidationResult | null = null;
        if (solarInsights) {
            validation = solarRoofService.validateRoofArea(
                measurements.roofAreaSqft,
                solarInsights.roofAreaSqft,
            );
        }

        const processingTimeSec = (Date.now() - startTime) / 1000;

        logger.info('[detectRoofSegmented] Pipeline complete', {
            roofAreaSqft: measurements.roofAreaSqft,
            trueSurfaceArea: measurements.trueSurfaceAreaSqft,
            planes: measurements.planes.length,
            confidence: measurements.confidenceScore,
            solarValidated: !!validation?.valid,
            processingTimeSec,
        });

        return {
            measurements,
            solarInsights,
            validation,
            aiModel: segResult.model || 'unknown',
            processingTimeSec,
        };
    }

    /**
     * Generate a detailed roofing cost estimate using OpenAI GPT-4o-mini
     */
    async generateEstimate(params: {
        roofAreaSqft: number;
        roofType: string;
        material: string;
        location?: string;
        stories?: number;
        pitch?: string;
        currentCondition?: string;
    }): Promise<{
        summary: string;
        laborCost: number;
        materialCost: number;
        totalEstimate: number;
        breakdown: Array<{ item: string; quantity?: string; unitPrice?: number; total: number }>;
        timeline: string;
        notes: string[];
    }> {
        if (!OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured');
        }

        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

        const prompt = `You are an expert roofing contractor estimator in Canada. Generate a detailed cost estimate for the following roof job.

Roof Details:
- Area: ${params.roofAreaSqft} sq ft
- Roof Type: ${params.roofType}
- Material: ${params.material}
- Location: ${params.location || 'Canada'}
- Stories: ${params.stories || 1}
- Pitch: ${params.pitch || 'Standard (4/12 to 6/12)'}
- Current Condition: ${params.currentCondition || 'Unknown'}

Provide a realistic estimate in CAD. Return ONLY valid JSON with this exact structure:
{
  "summary": "Brief description of the job",
  "laborCost": <number>,
  "materialCost": <number>,
  "totalEstimate": <number>,
  "breakdown": [
    { "item": "description", "quantity": "amount with unit", "unitPrice": <number>, "total": <number> }
  ],
  "timeline": "estimated completion time",
  "notes": ["important note 1", "important note 2"]
}

Be realistic with Canadian pricing. Include removal & disposal, underlayment, flashing, ventilation, labor, and cleanup.`;

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 2000,
                response_format: { type: 'json_object' },
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) throw new Error('No response from OpenAI');

            const parsed = JSON.parse(content);
            logger.info('OpenAI estimate generated', {
                roofArea: params.roofAreaSqft,
                material: params.material,
                total: parsed.totalEstimate,
            });

            return parsed;
        } catch (error: any) {
            logger.error('OpenAI estimate generation failed', { error: error.message });
            throw new Error(`Failed to generate estimate: ${error.message}`);
        }
    }

    // ---- CRUD operations (delegate to repository) ----

    async create(tenantId: string, data: CreateEstimateDto, createdBy: string) {
        const estimate = await roofEstimatorRepository.create(tenantId, data, createdBy);

        activityLogger.log({
            tenantId, entityType: 'RoofEstimate', entityId: (estimate as any).id,
            action: 'CREATE', module: 'roof-estimator',
            description: `Created roof estimate for "${data.address || 'unknown address'}"`,
            userId: createdBy,
            metadata: { address: data.address, roofArea: (estimate as any).roofAreaSqft },
        });

        return estimate;
    }

    async getById(id: string, tenantId: string) {
        const estimate = await roofEstimatorRepository.findById(id, tenantId);
        if (!estimate) {
            throw Object.assign(new Error('Estimate not found'), { statusCode: 404 });
        }
        return estimate;
    }

    async getMany(tenantId: string, query: EstimateQueryDto) {
        const { data, total } = await roofEstimatorRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        };
    }

    async update(id: string, tenantId: string, data: UpdateEstimateDto) {
        await this.getById(id, tenantId); // ensure exists in tenant
        const estimate = await roofEstimatorRepository.update(id, tenantId, data);

        activityLogger.log({
            tenantId, entityType: 'RoofEstimate', entityId: id,
            action: 'UPDATE', module: 'roof-estimator',
            description: `Updated roof estimate`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return estimate;
    }

    async delete(id: string, tenantId: string) {
        await this.getById(id, tenantId); // ensure exists in tenant

        activityLogger.log({
            tenantId, entityType: 'RoofEstimate', entityId: id,
            action: 'DELETE', module: 'roof-estimator',
            description: `Deleted roof estimate`,
        });

        return roofEstimatorRepository.delete(id, tenantId);
    }

    async getSettings(tenantId: string) {
        const settings = await roofEstimatorRepository.getSettings(tenantId);
        // Return defaults if no settings exist
        return settings || {
            defaultPricePerSqft: 5.50,
            currency: 'CAD',
            snowModeDefault: true,
            companyName: null,
            companyLogo: null,
            companyPhone: null,
            companyEmail: null,
            companyAddress: null,
            pdfFooterText: null,
        };
    }

    async updateSettings(tenantId: string, data: UpdateSettingsDto) {
        return roofEstimatorRepository.upsertSettings(tenantId, data);
    }

    async getStatistics(tenantId: string) {
        return roofEstimatorRepository.getStatistics(tenantId);
    }

    // ── ATTOM Property / Parcel API ──────────────────────────────────────────

    async getParcelBoundary(latitude: number, longitude: number): Promise<{
        parcelPolygon: number[][] | null;
        attomPropertyId: string | null;
        lotSize: string | null;
    }> {
        if (!ATTOM_API_KEY) {
            logger.warn('ATTOM API key not configured — parcel boundary unavailable');
            return { parcelPolygon: null, attomPropertyId: null, lotSize: null };
        }

        // Check cache
        const cacheKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
        const cached = parcelCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < PARCEL_CACHE_TTL_MS) {
            logger.info('Returning cached parcel boundary', { cacheKey });
            return cached.data;
        }

        try {
            // ATTOM Property API — search by coordinates
            const response = await axios.get('https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/expandedprofile', {
                params: {
                    latitude,
                    longitude,
                    radius: 0.01, // Very tight radius to match exact property
                },
                headers: {
                    'apikey': ATTOM_API_KEY,
                    'Accept': 'application/json',
                },
                timeout: 10000,
            });

            const properties = response.data?.property || [];
            if (!properties.length) {
                logger.info('ATTOM returned no properties for coordinates', { latitude, longitude });
                const emptyResult = { parcelPolygon: null, attomPropertyId: null, lotSize: null };
                parcelCache.set(cacheKey, { data: emptyResult, timestamp: Date.now() });
                return emptyResult;
            }

            const property = properties[0];
            const attomPropertyId = property.identifier?.attomId
                ? String(property.identifier.attomId)
                : null;

            // Extract lot boundary if available
            let parcelPolygon: number[][] | null = null;
            const lot = property.lot;
            if (lot?.lotBoundary?.coordinates) {
                // ATTOM returns GeoJSON-style coordinates
                parcelPolygon = lot.lotBoundary.coordinates;
            } else if (lot?.lotBoundaryWKT) {
                // Parse WKT POLYGON format
                parcelPolygon = this.parseWktPolygon(lot.lotBoundaryWKT);
            }

            const lotSize = lot?.lotSize1 ? String(lot.lotSize1) : null;

            const result = { parcelPolygon, attomPropertyId, lotSize };
            parcelCache.set(cacheKey, { data: result, timestamp: Date.now() });

            logger.info('ATTOM parcel boundary retrieved', {
                attomPropertyId,
                hasPolygon: !!parcelPolygon,
                lotSize,
            });

            return result;
        } catch (err: any) {
            logger.error('ATTOM parcel boundary request failed', {
                message: err.message,
                status: err.response?.status,
                latitude,
                longitude,
            });
            // Non-blocking — return null so estimator still works without parcel
            return { parcelPolygon: null, attomPropertyId: null, lotSize: null };
        }
    }

    /**
     * Parse a WKT POLYGON string into coordinate array
     * e.g. "POLYGON((-73.98 40.74, -73.97 40.74, ...))" → [[-73.98, 40.74], ...]
     */
    private parseWktPolygon(wkt: string): number[][] | null {
        try {
            const match = wkt.match(/POLYGON\s*\(\((.+)\)\)/i);
            if (!match) return null;

            return match[1].split(',').map(pair => {
                const [lng, lat] = pair.trim().split(/\s+/).map(Number);
                return [lat, lng]; // Return as [lat, lng] for Google Maps
            });
        } catch {
            return null;
        }
    }
}

export const roofEstimatorService = new RoofEstimatorService();
