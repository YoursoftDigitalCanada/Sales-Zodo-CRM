/**
 * EagleView Property Data API v2 Service
 *
 * Uses the new Property Data API v2:
 *   POST /property/v2/request          — request property data (address or coords)
 *   GET  /property/v2/result/{id}      — get results (poll until complete)
 *   GET  /property/v2/image/{token}    — download property image (PNG)
 *
 * Base URL:
 *   Sandbox:    https://sandbox.apis.eagleview.com
 *   Production: https://apis.eagleview.com
 *
 * Sandbox test area: Omaha, NE bounding box
 *   -96.00532698173473, 41.24140396772262, -95.97589954958912, 41.25672882015283
 */

import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../common/utils/logger';
import { eagleViewAuthService } from './eagleview-auth.service';

// Use the new apis.eagleview.com base URL (not apicenter)
const PROPERTY_API_BASE = config.integrations.eagleview.baseUrl.includes('sandbox')
    ? 'https://sandbox.apis.eagleview.com'
    : 'https://apis.eagleview.com';

// ── Types ────────────────────────────────────────────────────────────────

export interface PropertyDataRequest {
    completeAddress: string;      // e.g. "694 East 6th Street, Sheridan, Wyoming 82801, United States"
    callbackUrl?: string;
}

export interface PropertyRequestResponse {
    requestId: string;
    status: string;
    href: string;
}

export interface RoofFacet {
    area?: { value: number; unit: string; confidence: number };
    pitch?: { value: string; unit: string; confidence: number };
    condition?: { value: string; unit: string; confidence: number };
}

export interface StructureData {
    structure_roof_area?: { value: number; unit: string; confidence: number };
    structure_roof_condition_rating?: { value: string; unit: string; confidence: number };
    structure_predominant_roof_pitch?: { value: string; unit: string; confidence: number };
    structure_roof_material?: { value: string; unit: string; confidence: number };
    structure_roof_facet_count?: { value: number; unit: string; confidence: number };
    structure_roof_complexity?: { value: string; unit: string; confidence: number };
    structure_stories_count?: { value: number; unit: string; confidence: number };
    structure_eave_height?: { value: number; unit: string; confidence: number };
    structure_type?: { value: string; unit: string; confidence: number };
    structure_footprint_area?: { value: number; unit: string; confidence: number };
    facets?: RoofFacet[];
    image_references?: string[];
}

export interface PropertyDataResult {
    requestId: string;
    status: string;
    address?: {
        full_address?: string;
        line1?: string;
        locality?: string;
        admin1?: string;
        zip?: string;
        country?: string;
    };
    coordinates?: { lat: number; lon: number };
    structures?: StructureData[];
    imagery?: Record<string, any>;
    propertyImages?: { image_references: string[] };
    roofConditionMin?: { value: string; confidence: number };
    roofConditionAvg?: { value: string; confidence: number };
    rawData?: any;
}

// ── Service ──────────────────────────────────────────────────────────────

class EagleViewMeasurementService {
    private async getHeaders(): Promise<Record<string, string>> {
        const token = await eagleViewAuthService.getToken();
        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
    }

    private async requestWithRetry<T>(fn: () => Promise<T>): Promise<T> {
        try {
            return await fn();
        } catch (error: any) {
            if (error?.response?.status === 401) {
                logger.warn('[EagleView] Got 401, refreshing token and retrying');
                eagleViewAuthService.invalidateToken();
                return await fn();
            }
            throw error;
        }
    }

    /**
     * POST /property/v2/request
     *
     * Submit a property data request with a complete address.
     * Returns a requestId to poll for results.
     */
    async requestPropertyData(completeAddress: string, callbackUrl?: string): Promise<PropertyRequestResponse> {
        logger.info('[EagleView] Requesting property data', { address: completeAddress });

        return this.requestWithRetry(async () => {
            const headers = await this.getHeaders();

            const body: any = {
                address: {
                    completeAddress,
                },
            };
            if (callbackUrl) {
                body.callbackUrl = callbackUrl;
            }

            const response = await axios.post(
                `${PROPERTY_API_BASE}/property/v2/request`,
                body,
                { headers, timeout: 30_000 },
            );

            const data = response.data;
            const req = data.request || data;

            logger.info('[EagleView] Property data request accepted', {
                requestId: req.id,
                status: req.status,
            });

            return {
                requestId: req.id,
                status: req.status || 'In Progress',
                href: req.href || `/property/v2/result/${req.id}`,
            };
        });
    }

    /**
     * GET /property/v2/result/{requestId}
     *
     * Retrieve results. Returns 202 if still processing, 200 if complete.
     */
    async getPropertyResult(requestId: string): Promise<PropertyDataResult> {
        logger.info('[EagleView] Fetching property result', { requestId });

        return this.requestWithRetry(async () => {
            const headers = await this.getHeaders();

            const response = await axios.get(
                `${PROPERTY_API_BASE}/property/v2/result/${requestId}`,
                { headers, timeout: 30_000 },
            );

            const d = response.data;

            // Parse structures
            const structures: StructureData[] = [];
            if (Array.isArray(d.structures)) {
                for (const s of d.structures) {
                    structures.push({
                        structure_roof_area: s.structure_roof_area,
                        structure_roof_condition_rating: s.structure_roof_condition_rating,
                        structure_predominant_roof_pitch: s.structure_predominant_roof_pitch,
                        structure_roof_material: s.structure_roof_material,
                        structure_roof_facet_count: s.structure_roof_facet_count,
                        structure_roof_complexity: s.structure_roof_complexity,
                        structure_stories_count: s.structure_stories_count,
                        structure_eave_height: s.structure_eave_height,
                        structure_type: s.structure_type,
                        structure_footprint_area: s.structure_footprint_area,
                        facets: s.facets,
                        image_references: s.image_references || [],
                    });
                }
            }

            return {
                requestId: d.request?.id || requestId,
                status: d.request?.status || (response.status === 202 ? 'In Progress' : 'Complete'),
                address: d.response_address ? {
                    full_address: d.response_address.full_address,
                    line1: d.response_address.line1,
                    locality: d.response_address.locality,
                    admin1: d.response_address.admin1,
                    zip: d.response_address.zip,
                    country: d.response_address.country,
                } : undefined,
                coordinates: d.response_coordinates ? {
                    lat: d.response_coordinates.lat,
                    lon: d.response_coordinates.lon,
                } : undefined,
                structures,
                imagery: d.imagery,
                propertyImages: d.property_images,
                roofConditionMin: d.property_roof_condition_rating_minimum,
                roofConditionAvg: d.property_roof_condition_rating_average,
                rawData: d,
            };
        });
    }

    /**
     * GET /property/v2/image/{imageToken}
     *
     * Download a property image (PNG) by its token.
     */
    async getPropertyImage(imageToken: string): Promise<Buffer> {
        logger.info('[EagleView] Downloading property image', { imageToken });

        const token = await eagleViewAuthService.getToken();

        const response = await axios.get(
            `${PROPERTY_API_BASE}/property/v2/image/${imageToken}`,
            {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'arraybuffer',
                timeout: 60_000,
            },
        );

        return Buffer.from(response.data);
    }

    /**
     * Convenience: request + poll until complete (max retries)
     */
    async requestAndWait(
        completeAddress: string,
        maxRetries = 10,
        pollIntervalMs = 3000,
    ): Promise<PropertyDataResult> {
        const req = await this.requestPropertyData(completeAddress);

        for (let i = 0; i < maxRetries; i++) {
            await new Promise(r => setTimeout(r, pollIntervalMs));

            const result = await this.getPropertyResult(req.requestId);
            if (result.status === 'Complete' || result.status === 'Completed') {
                return result;
            }

            logger.info('[EagleView] Still processing', {
                requestId: req.requestId,
                attempt: i + 1,
                status: result.status,
            });
        }

        // Return whatever we have after max retries
        return this.getPropertyResult(req.requestId);
    }

    // ── Legacy compatibility (kept for old endpoints) ────────────────────

    async placeOrder(payload: any): Promise<any> {
        const addr = payload.address;
        const completeAddress = [
            addr.addressLine1,
            addr.city,
            `${addr.state} ${addr.postalCode}`,
            addr.country || 'US',
        ].filter(Boolean).join(', ');

        return this.requestPropertyData(completeAddress);
    }

    async getReport(reportId: number | string): Promise<any> {
        return this.getPropertyResult(String(reportId));
    }

    async getReportFile(reportId: number | string, fileType = 1, fileFormat = 1): Promise<Buffer> {
        return this.getPropertyImage(String(reportId));
    }

    async getAvailableProducts(): Promise<any[]> {
        return [];
    }

    async getReports(page?: number, count?: number, filters?: any): Promise<any> {
        return { reports: [], total: 0 };
    }
}

export const eagleViewMeasurementService = new EagleViewMeasurementService();
