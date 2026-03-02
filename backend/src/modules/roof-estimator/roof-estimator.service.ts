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
const OPENAI_API_KEY = config.ai.openaiApiKey || '';
const AI_SERVICE_URL = config.integrations.aiServiceUrl;
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

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
        const components: string[] = ['country:CA'];
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
            countrycodes: idx < 2 ? 'ca' : undefined,
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
                    countrycodes: 'ca',
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
                    components: 'country:ca',
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
                placeId: p.place_id,
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

    private async geocodePlaceIdViaGeocoding(placeId: string): Promise<{ lat: number; lng: number; formattedAddress: string }> {
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
        };
    }

    private async geocodePlaceIdViaPlacesDetails(placeId: string): Promise<{ lat: number; lng: number; formattedAddress: string }> {
        if (!GOOGLE_PLACES_API_KEY) {
            throw new ServiceUnavailableError(
                'Google Places API key is not configured for place ID resolution.'
            );
        }

        const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: {
                place_id: placeId,
                key: GOOGLE_PLACES_API_KEY,
                fields: 'formatted_address,geometry/location',
                language: 'en',
            },
            timeout: 10000,
        });

        const status = response.data.status as string;
        const errorMessage = response.data.error_message as string | undefined;

        if (status !== 'OK' || !response.data.result?.geometry?.location) {
            if (status === 'NOT_FOUND' || status === 'ZERO_RESULTS') {
                throw new BadRequestError(
                    'Selected address could not be found. Please choose another suggestion.',
                    'PLACES_DETAILS_NOT_FOUND'
                );
            }

            throw new ServiceUnavailableError(
                errorMessage
                    ? `Google Places Details failed for selected address: ${errorMessage}`
                    : `Google Places Details failed for selected address (${status}).`
            );
        }

        const lat = Number(response.data.result.geometry.location.lat);
        const lng = Number(response.data.result.geometry.location.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new ServiceUnavailableError('Google Places Details returned invalid coordinates.');
        }

        return {
            lat,
            lng,
            formattedAddress: response.data.result.formatted_address || placeId,
        };
    }

    private async geocodeByPlaceId(placeId: string): Promise<{ lat: number; lng: number; formattedAddress: string }> {
        try {
            return await this.geocodePlaceIdViaGeocoding(placeId);
        } catch (err: unknown) {
            logger.warn('Place ID geocoding via Geocoding API failed; trying Places Details', {
                placeId,
                error: (err as Error).message,
            });
        }

        return this.geocodePlaceIdViaPlacesDetails(placeId);
    }

    /**
     * Geocode an address using Google Geocoding API.
     * If a Google placeId is provided, resolve that first for exact matching.
     */
    async geocodeAddress(address: string, placeId?: string): Promise<{ lat: number; lng: number; formattedAddress: string }> {
        const normalizedPlaceId = typeof placeId === 'string' ? placeId.trim() : '';
        if (normalizedPlaceId) {
            try {
                const resolved = await this.geocodeByPlaceId(normalizedPlaceId);
                logger.info('Resolved address using placeId for roof estimator geocoding', {
                    placeId: normalizedPlaceId,
                    formattedAddress: resolved.formattedAddress,
                });
                return resolved;
            } catch (err: unknown) {
                logger.warn('Failed to geocode by placeId; falling back to address text', {
                    placeId: normalizedPlaceId,
                    address,
                    error: (err as Error).message,
                });
            }
        }

        if (!GOOGLE_GEOCODING_API_KEY) {
            return this.geocodeAddressWithFallback(
                address,
                'google_key_missing',
                'Roof estimator geocoding is not configured. Set GOOGLE_GEOCODING_API_KEY (or GOOGLE_MAPS_JS_API_KEY) on the backend.'
            );
        }

        try {
            const components = this.buildGoogleComponentsForAddress(address);
            const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                params: {
                    address,
                    key: GOOGLE_GEOCODING_API_KEY,
                    components,
                    region: 'ca',
                },
                timeout: 10000,
            });

            const status = response.data.status as string;
            const errorMessage = response.data.error_message as string | undefined;
            if (status !== 'OK' || !response.data.results?.length) {
                logger.warn('Geocoding API returned non-OK status', {
                    status,
                    errorMessage,
                    address,
                });

                if (status === 'ZERO_RESULTS') {
                    throw new BadRequestError(
                        'Could not find coordinates for this address. Please enter a complete Canadian address.',
                        'GEOCODING_ZERO_RESULTS'
                    );
                }

                if (status === 'INVALID_REQUEST') {
                    throw new BadRequestError(
                        'Invalid address input. Please provide a valid street address.',
                        'GEOCODING_INVALID_REQUEST'
                    );
                }

                if (status === 'REQUEST_DENIED') {
                    return this.geocodeAddressWithFallback(
                        address,
                        'google_request_denied',
                        errorMessage
                            ? `Google Geocoding API denied the request: ${errorMessage}`
                            : 'Google Geocoding API denied the request. Check key restrictions and billing.'
                    );
                }

                if (status === 'OVER_DAILY_LIMIT' || status === 'OVER_QUERY_LIMIT') {
                    return this.geocodeAddressWithFallback(
                        address,
                        'google_quota_exceeded',
                        'Google Geocoding API quota exceeded. Check quota and billing in Google Cloud.'
                    );
                }

                return this.geocodeAddressWithFallback(
                    address,
                    `google_status_${status}`,
                    errorMessage || `Geocoding failed (${status}). Please try again later.`
                );
            }

            const results = response.data.results as GoogleGeocodingResult[];
            const bestResult = this.selectBestGoogleResult(results, address) || results[0];
            const lat = Number(bestResult.geometry?.location?.lat);
            const lng = Number(bestResult.geometry?.location?.lng);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                throw new ServiceUnavailableError('Geocoding response returned invalid coordinates.');
            }

            return {
                lat,
                lng,
                formattedAddress: bestResult.formatted_address || address,
            };
        } catch (err: unknown) {
            if (err instanceof BadRequestError || err instanceof ServiceUnavailableError) {
                throw err;
            }

            const axiosError = axios.isAxiosError(err) ? err : null;
            logger.error('Geocoding request failed', {
                message: axiosError?.message || (err as Error).message,
                status: axiosError?.response?.status,
                data: axiosError?.response?.data,
                address,
            });

            if (axiosError?.code === 'ECONNABORTED') {
                return this.geocodeAddressWithFallback(
                    address,
                    'google_timeout',
                    'Geocoding request timed out. Please try again.'
                );
            }

            return this.geocodeAddressWithFallback(
                address,
                'google_network_error',
                axiosError?.message
                    ? `Geocoding request failed: ${axiosError.message}`
                    : 'Geocoding request failed. Please try again.'
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
}

export const roofEstimatorService = new RoofEstimatorService();
