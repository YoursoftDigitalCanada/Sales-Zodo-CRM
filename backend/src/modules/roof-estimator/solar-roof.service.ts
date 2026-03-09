/**
 * Solar Roof Service
 *
 * Integrates Google Solar API (Building Insights) for:
 * • roof area validation against AI segmentation
 * • pitch/azimuth data for each roof segment
 * • segment statistics for plane verification
 *
 * Docs: https://developers.google.com/maps/documentation/solar/building-insights
 */

import axios from 'axios';
import { config } from '../../config';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';

// ── Constants ─────────────────────────────────────────────────────────────
const SOLAR_API_BASE = 'https://solar.googleapis.com';
const SQ_METERS_TO_SQ_FEET = 10.7639;

// ── Types ─────────────────────────────────────────────────────────────────

interface SolarSegmentStats {
    pitchDegrees: number;
    azimuthDegrees: number;
    stats: {
        areaMeters2: number;
        sunshineQuantiles: number[];
        groundAreaMeters2: number;
    };
    center: { latitude: number; longitude: number };
    boundingBox: {
        sw: { latitude: number; longitude: number };
        ne: { latitude: number; longitude: number };
    };
    planeHeightAtCenterMeters: number;
}

interface BuildingInsightsResponse {
    name: string;
    center: { latitude: number; longitude: number };
    boundingBox: {
        sw: { latitude: number; longitude: number };
        ne: { latitude: number; longitude: number };
    };
    imageryDate: { year: number; month: number; day: number };
    imageryProcessedDate: { year: number; month: number; day: number };
    postalCode: string;
    administrativeArea: string;
    statisticalArea: string;
    regionCode: string;
    solarPotential: {
        maxArrayPanelsCount: number;
        maxArrayAreaMeters2: number;
        maxSunshineHoursPerYear: number;
        carbonOffsetFactorKgPerMwh: number;
        wholeRoofStats: {
            areaMeters2: number;
            sunshineQuantiles: number[];
            groundAreaMeters2: number;
        };
        roofSegmentStats: SolarSegmentStats[];
        financialAnalyses?: any[];
        buildingStats?: {
            areaMeters2: number;
            sunshineQuantiles: number[];
            groundAreaMeters2: number;
        };
    };
}

export interface SolarRoofInsights {
    roofAreaSqft: number;
    roofAreaMeters2: number;
    segments: Array<{
        pitchDegrees: number;
        azimuthDegrees: number;
        areaSqft: number;
        areaMeters2: number;
        centerLat: number;
        centerLng: number;
    }>;
    primaryPitchDegrees: number;
    primaryAzimuthDegrees: number;
    maxSunshineHours: number;
    panelCapacity: number;
    carbonOffsetKg: number;
}

export interface RoofValidationResult {
    valid: boolean;
    errorPercent: number;
    correctionFactor: number;
    action: 'accept' | 'correct' | 'flag_review';
    blendedAreaSqft?: number;
    solarAreaSqft: number;
    aiAreaSqft: number;
}

// ── Service ───────────────────────────────────────────────────────────────

class SolarRoofService {

    /**
     * Fetch Building Insights from Google Solar API.
     */
    async fetchBuildingInsights(
        lat: number,
        lng: number,
    ): Promise<BuildingInsightsResponse> {
        const apiKey = config.integrations.google.solarApiKey;
        if (!apiKey) {
            throw new Error('GOOGLE_SOLAR_API_KEY is not configured');
        }

        const url = `${SOLAR_API_BASE}/v1/buildingInsights:findClosest`;

        const response = await axios.get<BuildingInsightsResponse>(url, {
            params: {
                'location.latitude': lat,
                'location.longitude': lng,
                requiredQuality: 'MEDIUM',
                key: apiKey,
            },
            timeout: 15000,
        });

        logger.info('[SolarRoofService] Building insights fetched', {
            lat, lng,
            roofArea: response.data.solarPotential?.wholeRoofStats?.areaMeters2,
            segmentCount: response.data.solarPotential?.roofSegmentStats?.length,
        });

        return response.data;
    }

    /**
     * Extract structured roof data from API response.
     */
    extractRoofData(response: BuildingInsightsResponse): SolarRoofInsights {
        const sp = response.solarPotential;
        const wholeRoof = sp.wholeRoofStats;

        const segments = (sp.roofSegmentStats || []).map((seg) => ({
            pitchDegrees: seg.pitchDegrees,
            azimuthDegrees: seg.azimuthDegrees,
            areaSqft: seg.stats.areaMeters2 * SQ_METERS_TO_SQ_FEET,
            areaMeters2: seg.stats.areaMeters2,
            centerLat: seg.center.latitude,
            centerLng: seg.center.longitude,
        }));

        // Primary segment = largest area
        const primary = segments.length > 0
            ? segments.reduce((a, b) => (a.areaMeters2 > b.areaMeters2 ? a : b))
            : null;

        return {
            roofAreaSqft: wholeRoof.areaMeters2 * SQ_METERS_TO_SQ_FEET,
            roofAreaMeters2: wholeRoof.areaMeters2,
            segments,
            primaryPitchDegrees: primary?.pitchDegrees ?? 0,
            primaryAzimuthDegrees: primary?.azimuthDegrees ?? 0,
            maxSunshineHours: sp.maxSunshineHoursPerYear,
            panelCapacity: sp.maxArrayPanelsCount,
            carbonOffsetKg: sp.carbonOffsetFactorKgPerMwh || 0,
        };
    }

    /**
     * Full pipeline: fetch + extract + save to DB.
     * If lat/lng are 0 or missing, geocode from address using the existing geocoding service.
     */
    async getRoofInsights(
        lat: number,
        lng: number,
        tenantId: string,
        estimateId?: string,
        address?: string,
    ): Promise<SolarRoofInsights & { id: string }> {
        // Geocode if lat/lng not provided but address is
        let resolvedLat = lat;
        let resolvedLng = lng;

        if ((!resolvedLat || !resolvedLng) && address) {
            try {
                const { roofEstimatorService } = await import('./roof-estimator.service');
                const geo = await roofEstimatorService.geocodeAddressWithFallback(address, 'solar-insights');
                resolvedLat = geo.lat;
                resolvedLng = geo.lng;
                logger.info('[SolarRoofService] Geocoded address for Solar API', {
                    address, lat: resolvedLat, lng: resolvedLng,
                });
            } catch (geoErr: any) {
                logger.error('[SolarRoofService] Geocoding failed', { address, error: geoErr.message });
                throw new Error(`Cannot geocode address for Solar API: ${geoErr.message}`);
            }
        }

        if (!resolvedLat || !resolvedLng) {
            throw new Error('Latitude and longitude are required (or provide an address to geocode)');
        }

        const raw = await this.fetchBuildingInsights(resolvedLat, resolvedLng);
        const insights = this.extractRoofData(raw);

        const saved = await prisma.solarRoofData.create({
            data: {
                latitude: resolvedLat,
                longitude: resolvedLng,
                address,
                roofAreaSqft: insights.roofAreaSqft,
                roofAreaMeters2: insights.roofAreaMeters2,
                roofSegments: insights.segments as any,
                pitchDegrees: insights.primaryPitchDegrees,
                azimuthDegrees: insights.primaryAzimuthDegrees,
                maxSunshineHours: insights.maxSunshineHours,
                carbonOffset: insights.carbonOffsetKg,
                panelCapacity: insights.panelCapacity,
                rawResponse: raw as any,
                estimateId,
                tenantId,
            },
        });

        logger.info('[SolarRoofService] Roof insights saved', {
            id: saved.id,
            roofAreaSqft: insights.roofAreaSqft,
            segments: insights.segments.length,
        });

        return { ...insights, id: saved.id };
    }

    /**
     * Validate AI-detected roof area against Solar API data.
     *
     * Rules:
     * - error < 10% → accept AI polygon as-is
     * - 10–20% → blend AI and Solar areas (weighted average)
     * - > 20% → flag for manual review
     */
    validateRoofArea(
        aiAreaSqft: number,
        solarAreaSqft: number,
    ): RoofValidationResult {
        if (!solarAreaSqft || solarAreaSqft <= 0) {
            return {
                valid: true,
                errorPercent: 0,
                correctionFactor: 1,
                action: 'accept',
                solarAreaSqft: 0,
                aiAreaSqft,
            };
        }

        const errorPercent = Math.abs(aiAreaSqft - solarAreaSqft) / solarAreaSqft;
        const correctionFactor = solarAreaSqft / aiAreaSqft;

        if (errorPercent < 0.10) {
            return {
                valid: true,
                errorPercent,
                correctionFactor: 1, // no correction needed
                action: 'accept',
                solarAreaSqft,
                aiAreaSqft,
            };
        }

        if (errorPercent < 0.20) {
            // Blend: 60% Solar + 40% AI (Solar is more reliable)
            const blendedAreaSqft = solarAreaSqft * 0.6 + aiAreaSqft * 0.4;
            return {
                valid: true,
                errorPercent,
                correctionFactor,
                action: 'correct',
                blendedAreaSqft,
                solarAreaSqft,
                aiAreaSqft,
            };
        }

        // > 20% error — flag for manual review
        return {
            valid: false,
            errorPercent,
            correctionFactor,
            action: 'flag_review',
            blendedAreaSqft: solarAreaSqft, // use Solar as fallback
            solarAreaSqft,
            aiAreaSqft,
        };
    }
}

export const solarRoofService = new SolarRoofService();
