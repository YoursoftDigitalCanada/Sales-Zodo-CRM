/**
 * EagleView Controller — Property Data API v2
 *
 * Protected endpoints:
 *   POST   /eagleview/property           - Request property data
 *   GET    /eagleview/property/:id       - Get property data result
 *   GET    /eagleview/property/:id/image/:token - Get property image
 *   POST   /eagleview/property/instant   - Request + wait for result
 *
 * Legacy endpoints (still wired for backward compat):
 *   POST   /eagleview/orders             - Places order (maps to property request)
 *   GET    /eagleview/orders/:orderId    - Gets report (maps to property result)
 *   GET    /eagleview/health             - Health check
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../common/utils/logger';
import { sendSuccess } from '../../common/utils/responseFormatter';
import { config } from '../../config';
import { eagleViewAuthService } from './eagleview-auth.service';
import { eagleViewMeasurementService } from './eagleview-measurement.service';

class EagleViewController {

    // ── Property Data API v2 ─────────────────────────────────────────────

    /**
     * POST /eagleview/property
     * Request property data with a complete address string.
     */
    async requestProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { address, callbackUrl } = req.body;

            if (!address) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required field: address (complete address string)',
                });
                return;
            }

            const completeAddress = typeof address === 'string'
                ? address
                : address.completeAddress || address.addressLine1 || '';

            if (!completeAddress) {
                res.status(400).json({
                    success: false,
                    message: 'Address cannot be empty',
                });
                return;
            }

            const result = await eagleViewMeasurementService.requestPropertyData(completeAddress, callbackUrl);
            sendSuccess(res, result, 'Property data request accepted');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /eagleview/property/:requestId
     * Get property data result by request ID.
     */
    async getPropertyResult(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { requestId } = req.params;

            if (!requestId) {
                res.status(400).json({ success: false, message: 'requestId is required' });
                return;
            }

            const result = await eagleViewMeasurementService.getPropertyResult(requestId);
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /eagleview/property/:requestId/image/:imageToken
     * Download a property image (PNG).
     */
    async getPropertyImage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { imageToken } = req.params;

            if (!imageToken) {
                res.status(400).json({ success: false, message: 'imageToken is required' });
                return;
            }

            const imageBuffer = await eagleViewMeasurementService.getPropertyImage(imageToken);

            res.set({
                'Content-Type': 'image/png',
                'Content-Length': imageBuffer.length.toString(),
                'Cache-Control': 'public, max-age=86400',
            });
            res.send(imageBuffer);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /eagleview/property/instant
     * Request property data and wait for it to complete (polls internally).
     * Good for the wizard flow where we want to show results immediately.
     */
    async requestPropertyInstant(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { address } = req.body;

            const completeAddress = typeof address === 'string'
                ? address
                : address?.completeAddress || address?.addressLine1 || '';

            if (!completeAddress) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required field: address',
                });
                return;
            }

            // Request and poll (max 10 tries, 3s apart = max 30s)
            const result = await eagleViewMeasurementService.requestAndWait(completeAddress, 10, 3000);

            // Extract useful roof data from structures
            const roofData: any = {};
            if (result.structures && result.structures.length > 0) {
                const s = result.structures[0];
                if (s.structure_roof_area?.value) roofData.area = s.structure_roof_area.value;
                if (s.structure_predominant_roof_pitch?.value) roofData.pitch = s.structure_predominant_roof_pitch.value;
                if (s.structure_roof_facet_count?.value) roofData.facetCount = s.structure_roof_facet_count.value;
                if (s.structure_roof_condition_rating?.value) roofData.condition = s.structure_roof_condition_rating.value;
                if (s.structure_roof_material?.value) roofData.material = s.structure_roof_material.value;
                if (s.structure_roof_complexity?.value) roofData.complexity = s.structure_roof_complexity.value;
                if (s.structure_stories_count?.value) roofData.stories = s.structure_stories_count.value;
                if (s.structure_eave_height?.value) roofData.eaveHeight = s.structure_eave_height.value;
                if (s.structure_footprint_area?.value) roofData.footprintArea = s.structure_footprint_area.value;
                roofData.imageReferences = s.image_references || [];
            }

            // Collect all image tokens
            const allImageTokens: string[] = [];
            if (result.propertyImages?.image_references) {
                allImageTokens.push(...result.propertyImages.image_references);
            }
            if (result.imagery) {
                for (const key of Object.keys(result.imagery)) {
                    const img = result.imagery[key];
                    if (img?.image_id) allImageTokens.push(img.image_id);
                    if (img?.image_reference) allImageTokens.push(img.image_reference);
                }
            }

            sendSuccess(res, {
                requestId: result.requestId,
                status: result.status,
                address: result.address,
                coordinates: result.coordinates,
                roofData,
                roofConditionMin: result.roofConditionMin,
                roofConditionAvg: result.roofConditionAvg,
                imageTokens: allImageTokens,
                structureCount: result.structures?.length || 0,
            }, 'Property data retrieved');
        } catch (error) {
            next(error);
        }
    }

    // ── Legacy endpoints (backward compat) ───────────────────────────────

    async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { address, referenceId } = req.body;
            if (!address) {
                res.status(400).json({ success: false, message: 'Missing address' });
                return;
            }
            const completeAddress = typeof address === 'string'
                ? address
                : [address.addressLine1, address.city, `${address.state} ${address.postalCode}`, address.country || 'US']
                    .filter(Boolean).join(', ');

            const result = await eagleViewMeasurementService.requestPropertyData(completeAddress);
            // Map to legacy format
            sendSuccess(res, {
                orderId: result.requestId,
                reportIds: [result.requestId],
            }, 'Property data request placed');
        } catch (error) {
            next(error);
        }
    }

    async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestId = req.params.orderId;
            if (!requestId) {
                res.status(400).json({ success: false, message: 'requestId is required' });
                return;
            }

            const result = await eagleViewMeasurementService.getPropertyResult(requestId);

            // Map to legacy report format
            const roofData = result.structures?.[0];
            sendSuccess(res, {
                reportId: result.requestId,
                status: result.status,
                displayStatus: result.status,
                street: result.address?.line1,
                city: result.address?.locality,
                state: result.address?.admin1,
                zip: result.address?.zip,
                latitude: result.coordinates?.lat,
                longitude: result.coordinates?.lon,
                area: roofData?.structure_roof_area?.value
                    ? `${roofData.structure_roof_area.value} sq. ft`
                    : undefined,
                pitch: roofData?.structure_predominant_roof_pitch?.value,
                totalRoofFacets: roofData?.structure_roof_facet_count?.value?.toString(),
                roofCondition: roofData?.structure_roof_condition_rating?.value,
                roofMaterial: roofData?.structure_roof_material?.value,
                imageReferences: roofData?.image_references || [],
            });
        } catch (error) {
            next(error);
        }
    }

    async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
        sendSuccess(res, { reports: [], total: 0 });
    }

    async downloadReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        res.status(404).json({ success: false, message: 'Use /eagleview/property/:id/image/:token for images' });
    }

    async getReportImage(req: Request, res: Response, next: NextFunction): Promise<void> {
        // Try to use image token from the request
        const imageToken = req.query.imageToken as string || req.params.orderId;
        if (!imageToken) {
            res.status(400).json({ success: false, message: 'imageToken required' });
            return;
        }
        try {
            const imageBuffer = await eagleViewMeasurementService.getPropertyImage(imageToken);
            res.set({
                'Content-Type': 'image/png',
                'Content-Length': imageBuffer.length.toString(),
                'Cache-Control': 'public, max-age=86400',
            });
            res.send(imageBuffer);
        } catch (error) {
            next(error);
        }
    }

    // ── Imagery (disabled — not available in Property Data API) ───────────

    async getPropertyImagery(req: Request, res: Response, next: NextFunction): Promise<void> {
        res.status(404).json({
            success: false,
            message: 'Imagery endpoint not available. Use POST /eagleview/property/instant to get property data with images.',
        });
    }

    // ── Health ────────────────────────────────────────────────────────────

    async healthCheck(req: Request, res: Response): Promise<void> {
        const configured = eagleViewAuthService.isConfigured();
        let tokenOk = false;

        if (configured) {
            try {
                await eagleViewAuthService.getToken();
                tokenOk = true;
            } catch {
                tokenOk = false;
            }
        }

        res.json({
            success: true,
            data: {
                configured,
                authenticated: tokenOk,
                apiVersion: 'Property Data API v2',
                baseUrl: config.integrations.eagleview.baseUrl,
                propertyApiBase: config.integrations.eagleview.baseUrl.includes('sandbox')
                    ? 'https://sandbox.apis.eagleview.com'
                    : 'https://apis.eagleview.com',
                environment: config.integrations.eagleview.baseUrl.includes('sandbox')
                    ? 'sandbox'
                    : 'production',
            },
        });
    }

    // ── Webhooks ─────────────────────────────────────────────────────────

    async handleWebhook(req: Request, res: Response): Promise<void> {
        logger.info('[EagleView] Webhook received', {
            method: req.method,
            path: req.path,
            body: req.body,
            query: req.query,
        });
        res.status(200).json({ received: true });
    }
}

export const eagleViewController = new EagleViewController();
