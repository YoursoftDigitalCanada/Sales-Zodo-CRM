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
     * 2. Call Nearmap API
     * 3. Parse response
     * 4. Store in RoofData table
     * 5. Return structured result
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
                };
            }
        }

        // 2. Call Nearmap API
        logger.info('[NearmapService] Fetching from Nearmap API', { clientId, latitude, longitude });
        const { features, rawResponse } = await this.fetchFromNearmap(latitude, longitude);

        // 3. Parse response
        const buildingOutline = extractBuildingOutline(features);
        const roofOutline = extractRoofOutline(features);
        const propertyInsights = extractPropertyInsights(features);
        const areaSqFt = calculateAreaSqFt(features);

        // 4. Store in database
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
        };
    }
}

export const nearmapService = new NearmapService();
