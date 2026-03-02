import axios from 'axios';
import { config } from '../../config';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';

// ============================================================================
// NEARMAP AI SERVICE
// Handles all communication with Nearmap AI Feature API
// ============================================================================

const NEARMAP_API_KEY = config.integrations.nearmapApiKey || '';
const NEARMAP_BASE_URL = 'https://api.nearmap.com';

// Buffer size in degrees (~100m at equator) for point-to-polygon AOI
const POINT_BUFFER = 0.001;

/**
 * Build a GeoJSON polygon AOI from a lat/lng point
 * Creates a small bounding box around the coordinate
 */
function buildAoiFromPoint(lat: number, lng: number): object {
    const minLat = lat - POINT_BUFFER;
    const maxLat = lat + POINT_BUFFER;
    const minLng = lng - POINT_BUFFER;
    const maxLng = lng + POINT_BUFFER;

    return {
        type: 'Polygon',
        coordinates: [[
            [minLng, minLat],
            [maxLng, minLat],
            [maxLng, maxLat],
            [minLng, maxLat],
            [minLng, minLat],
        ]],
    };
}

/**
 * Extract building outlines from Nearmap AI response
 */
function extractBuildingOutline(features: any[]): object | null {
    const building = features.find(
        (f: any) => f.properties?.featureType === 'building' || f.properties?.description === 'Building'
    );
    return building?.geometry || null;
}

/**
 * Extract roof outlines from Nearmap AI response
 */
function extractRoofOutline(features: any[]): object | null {
    const roof = features.find(
        (f: any) =>
            f.properties?.featureType === 'roof' ||
            f.properties?.description === 'Roof' ||
            f.properties?.parentFeatureType === 'building'
    );
    return roof?.geometry || null;
}

/**
 * Extract property-level AI insights from Nearmap response
 */
function extractPropertyInsights(features: any[]): object {
    const insights: Record<string, any> = {};

    for (const feature of features) {
        const props = feature.properties || {};
        const type = props.featureType || props.description || 'unknown';

        if (!insights[type]) {
            insights[type] = [];
        }

        insights[type].push({
            areaSqM: props.areaSqm || props.area_sqm || null,
            areaSqFt: props.areaSqft || props.area_sqft || null,
            confidence: props.confidence || null,
            attributes: props.attributes || null,
            condition: props.condition || null,
            material: props.material || null,
        });
    }

    return insights;
}

/**
 * Calculate total roof area in sqft from features
 */
function calculateAreaSqFt(features: any[]): number | null {
    let totalArea = 0;
    let found = false;

    for (const feature of features) {
        const props = feature.properties || {};
        const type = props.featureType || props.description || '';

        if (type.toLowerCase().includes('roof') || type.toLowerCase().includes('building')) {
            const areaSqft = props.areaSqft || props.area_sqft;
            const areaSqm = props.areaSqm || props.area_sqm;

            if (areaSqft) {
                totalArea += Number(areaSqft);
                found = true;
            } else if (areaSqm) {
                totalArea += Number(areaSqm) * 10.7639; // m² to ft²
                found = true;
            }
        }
    }

    return found ? Math.round(totalArea * 100) / 100 : null;
}

export class NearmapService {
    /**
     * Check if RoofData already exists for a client (caching layer)
     */
    async getCachedRoofData(clientId: string, tenantId: string) {
        return prisma.roofData.findFirst({
            where: { clientId, tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Check if Nearmap has AI coverage for a given location
     * Uses coverage.json to verify data availability before calling features API
     * Returns coverage details or null if no coverage
     */
    async checkCoverage(lat: number, lng: number): Promise<{
        hasCoverage: boolean;
        latestSurveyDate: string | null;
        packs: string[];
    }> {
        if (!NEARMAP_API_KEY) {
            throw new Error('NEARMAP_API_KEY is not configured');
        }

        try {
            const point = `${lng},${lat}`;

            const response = await axios.get(`${NEARMAP_BASE_URL}/ai/features/v4/coverage.json`, {
                params: {
                    point,
                },
                headers: {
                    'Authorization': `Bearer ${NEARMAP_API_KEY}`,
                    'Accept': 'application/json',
                },
                timeout: 15000,
            });

            const surveys = response.data?.surveys || response.data?.features || [];

            if (!surveys.length) {
                return { hasCoverage: false, latestSurveyDate: null, packs: [] };
            }

            // Get the latest survey
            const latest = surveys[0];
            const surveyDate = latest.captureDate || latest.properties?.captureDate || null;
            const availablePacks = latest.resources?.map((r: any) => r.type || r.name)
                || latest.packs
                || [];

            logger.info('[NearmapService] Coverage check result', {
                lat, lng,
                hasCoverage: true,
                surveyDate,
                packsCount: availablePacks.length,
            });

            return {
                hasCoverage: true,
                latestSurveyDate: surveyDate,
                packs: availablePacks,
            };
        } catch (error: any) {
            // 404 or similar means no coverage
            if (error?.response?.status === 404 || error?.response?.status === 204) {
                logger.info('[NearmapService] No AI coverage at location', { lat, lng });
                return { hasCoverage: false, latestSurveyDate: null, packs: [] };
            }

            logger.warn('[NearmapService] Coverage check failed', {
                error: error.message,
                status: error?.response?.status,
            });

            // Don't block extraction on coverage check failure — proceed anyway
            return { hasCoverage: true, latestSurveyDate: null, packs: [] };
        }
    }

    /**
     * Call Nearmap AI Feature API to extract roof data
     * Docs: https://docs.nearmap.com/display/ND/AI+Feature+API
     */
    async fetchFromNearmap(lat: number, lng: number): Promise<{
        features: any[];
        rawResponse: any;
    }> {
        if (!NEARMAP_API_KEY) {
            throw new Error('NEARMAP_API_KEY is not configured');
        }

        const aoi = buildAoiFromPoint(lat, lng);

        let retries = 2;
        let lastError: Error | null = null;

        while (retries >= 0) {
            try {
                // Nearmap AI Feature API endpoint
                const response = await axios.get(`${NEARMAP_BASE_URL}/ai/features/v4/features.json`, {
                    params: {
                        polygon: JSON.stringify(aoi),
                        packs: 'building,roof',
                        lat,
                        lng,
                    },
                    headers: {
                        'Authorization': `Bearer ${NEARMAP_API_KEY}`,
                        'Accept': 'application/json',
                    },
                    timeout: 30000,
                });

                const features = response.data?.features || response.data?.results || [];

                return {
                    features,
                    rawResponse: response.data,
                };
            } catch (error: any) {
                lastError = error;
                retries--;

                if (retries >= 0) {
                    logger.warn(`Nearmap API call failed, retrying... (${retries + 1} left)`, {
                        error: error.message,
                        status: error?.response?.status,
                    });
                    await new Promise((r) => setTimeout(r, 1000));
                }
            }
        }

        throw new Error(`Nearmap API unavailable after retries: ${lastError?.message}`);
    }

    /**
     * Full extraction pipeline:
     * 1. Check cache
     * 2. Check Nearmap coverage
     * 3. Call Nearmap features API
     * 4. Parse response
     * 5. Store in RoofData table
     * 6. Return structured result
     */
    async extract(params: {
        clientId: string;
        tenantId: string;
        address?: string;
        latitude: number;
        longitude: number;
        forceRefresh?: boolean;
    }) {
        const { clientId, tenantId, address, latitude, longitude, forceRefresh } = params;

        // 1. Check cache (skip API call if data exists)
        if (!forceRefresh) {
            const cached = await this.getCachedRoofData(clientId, tenantId);
            if (cached) {
                logger.info('[NearmapService] Returning cached RoofData', { clientId, roofDataId: cached.id });
                return {
                    cached: true,
                    data: cached,
                    coverage: null,
                };
            }
        }

        // 2. Check coverage before making the expensive features call
        const coverage = await this.checkCoverage(latitude, longitude);

        if (!coverage.hasCoverage) {
            logger.warn('[NearmapService] No Nearmap AI coverage at location', {
                clientId, latitude, longitude,
            });
            throw new Error(
                `No Nearmap AI coverage available at this location (${latitude}, ${longitude}). ` +
                'Nearmap may not have surveyed this area yet.'
            );
        }

        // 3. Call Nearmap features API
        logger.info('[NearmapService] Fetching from Nearmap API', { clientId, latitude, longitude });
        const { features, rawResponse } = await this.fetchFromNearmap(latitude, longitude);

        // 4. Parse response
        const buildingOutline = extractBuildingOutline(features);
        const roofOutline = extractRoofOutline(features);
        const propertyInsights = extractPropertyInsights(features);
        const areaSqFt = calculateAreaSqFt(features);

        // 5. Store in database
        const roofData = await prisma.roofData.create({
            data: {
                clientId,
                tenantId,
                source: 'nearmap',
                address: address || null,
                latitude,
                longitude,
                buildingOutline: buildingOutline || undefined,
                roofOutline: roofOutline || undefined,
                propertyInsights: propertyInsights || undefined,
                areaSqFt,
                rawApiResponse: rawResponse || undefined,
            },
        });

        logger.info('[NearmapService] RoofData saved', { clientId, roofDataId: roofData.id, areaSqFt });

        return {
            cached: false,
            data: roofData,
            coverage: {
                latestSurveyDate: coverage.latestSurveyDate,
                packs: coverage.packs,
            },
        };
    }
}

export const nearmapService = new NearmapService();

