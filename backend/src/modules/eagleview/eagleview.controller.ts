/**
 * EagleView Controller — Measurement Order API
 *
 * Endpoints:
 *   POST   /eagleview/orders                - Place measurement order
 *   POST   /eagleview/orders/instant         - Place order + wait for report
 *   GET    /eagleview/orders/:orderId       - Get report data
 *   GET    /eagleview/health                - Health check
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../common/utils/logger';
import { sendSuccess } from '../../common/utils/responseFormatter';
import { config } from '../../config';
import { eagleViewAuthService } from './eagleview-auth.service';
import { eagleViewImageryService } from './eagleview-imagery.service';
import { eagleViewMeasurementService, type OrderAddress } from './eagleview-measurement.service';

class EagleViewController {

    /**
     * POST /eagleview/orders
     * Place a measurement order with address parts.
     */
    async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { address, referenceId } = req.body;
            if (!address) {
                res.status(400).json({ success: false, message: 'Missing address' });
                return;
            }

            const orderAddress = this.normalizeAddress(address);

            const result = await eagleViewMeasurementService.placeOrder(orderAddress, referenceId);
            sendSuccess(res, result, 'EagleView order placed');
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /eagleview/orders/instant
     * Place order + poll for report (all-in-one for the wizard).
     * Accepts either address parts or a full address string.
     */
    async createOrderInstant(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { address } = req.body;
            if (!address) {
                res.status(400).json({ success: false, message: 'Missing address' });
                return;
            }

            const orderAddress = this.normalizeAddress(address);
            const hasStructuredAddress = Boolean(orderAddress.addressLine1 && orderAddress.postalCode);
            const hasCoordinates = Number.isFinite(orderAddress.latitude) && Number.isFinite(orderAddress.longitude);

            if (!hasStructuredAddress && !hasCoordinates) {
                res.status(400).json({
                    success: false,
                    message: 'Could not parse address. Need either street + postal code or latitude/longitude.',
                });
                return;
            }

            logger.info('[EagleView] Instant order request', { address: orderAddress });

            const report = await eagleViewMeasurementService.placeOrderAndWait(orderAddress);
            const imagery = await this.tryGetImagery(orderAddress, report.latitude, report.longitude);

            sendSuccess(res, {
                ...report,
                imageUrl: imagery?.imageUrl,
                imageType: imagery?.imageType,
                imageCaptureDate: imagery?.captureDate,
                imageResolution: imagery?.resolution,
            }, 'EagleView report retrieved');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /eagleview/orders/:orderId
     * Get report data by report ID.
     */
    async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const reportId = parseInt(req.params.orderId, 10);
            if (!reportId || isNaN(reportId)) {
                res.status(400).json({ success: false, message: 'Valid reportId is required' });
                return;
            }

            const report = await eagleViewMeasurementService.getReport(reportId);
            sendSuccess(res, report);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /eagleview/health
     */
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
                apiType: 'Measurement Order API',
                baseUrl: config.integrations.eagleview.baseUrl,
                environment: (config.integrations.eagleview.baseUrl || '').includes('sandbox')
                    ? 'sandbox'
                    : 'production',
            },
        });
    }

    /**
     * Webhook handler
     */
    async handleWebhook(req: Request, res: Response): Promise<void> {
        logger.info('[EagleView] Webhook received', { body: req.body });
        res.status(200).json({ received: true });
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private normalizeAddress(address: unknown): OrderAddress {
        if (typeof address === 'string') {
            return this.parseAddressString(address);
        }

        const raw = (address && typeof address === 'object') ? address as Record<string, unknown> : {};

        return {
            addressLine1: this.readString(raw.addressLine1) || this.readString(raw.Address),
            city: this.readString(raw.city) || this.readString(raw.City),
            state: this.readString(raw.state) || this.readString(raw.State),
            postalCode: this.readString(raw.postalCode) || this.readString(raw.Zip),
            country: this.readString(raw.country) || this.readString(raw.Country) || 'US',
            latitude: this.readNumber(raw.latitude) ?? this.readNumber(raw.Latitude),
            longitude: this.readNumber(raw.longitude) ?? this.readNumber(raw.Longitude),
        };
    }

    private parseAddressString(addr: string): OrderAddress {
        const parts = addr.split(',').map(s => s.trim());
        const addressLine1 = parts[0] || '';
        const city = parts[1] || '';
        const stateZipPart = parts[2] || '';
        const stateZipTokens = stateZipPart.split(' ').filter(Boolean);
        const state = stateZipTokens[0] || '';
        const postalCode = stateZipTokens.slice(1).join(' ') || '';
        const country = parts[3] || 'US';
        return { addressLine1, city, state, postalCode, country };
    }

    private readString(value: unknown): string {
        return typeof value === 'string' ? value.trim() : '';
    }

    private readNumber(value: unknown): number | undefined {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim()) {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
        return undefined;
    }

    private async tryGetImagery(
        address: OrderAddress,
        reportLatitude?: number,
        reportLongitude?: number,
    ) {
        const lat = Number.isFinite(reportLatitude) ? reportLatitude : address.latitude;
        const lng = Number.isFinite(reportLongitude) ? reportLongitude : address.longitude;

        if (typeof lat !== 'number' || !Number.isFinite(lat) || typeof lng !== 'number' || !Number.isFinite(lng)) {
            return null;
        }

        try {
            return await eagleViewImageryService.getPropertyImagery(lat, lng);
        } catch (error: any) {
            logger.warn('[EagleView] Property imagery unavailable', {
                status: error?.response?.status,
                message: error?.message,
                lat,
                lng,
            });
            return null;
        }
    }
}

export const eagleViewController = new EagleViewController();
