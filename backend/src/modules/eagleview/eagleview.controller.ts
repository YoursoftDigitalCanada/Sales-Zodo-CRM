/**
 * EagleView Controller — Measurement Order API
 *
 * Endpoints:
 *   POST   /eagleview/orders                - Place measurement order
 *   POST   /eagleview/orders/instant         - Sandbox property lookup or production order flow
 *   GET    /eagleview/orders/:orderId       - Get report data
 *   GET    /eagleview/health                - Health check
 */

import { Request, Response, NextFunction } from 'express';
import { ServiceUnavailableError } from '../../common/errors/HttpErrors';
import { logger } from '../../common/utils/logger';
import { sendSuccess } from '../../common/utils/responseFormatter';
import { config } from '../../config';
import { eagleViewAuthService } from './eagleview-auth.service';
import { eagleViewMeasurementService, type OrderAddress } from './eagleview-measurement.service';

const SANDBOX_LOOKUP_FAILURE_MESSAGE =
    'EagleView sandbox currently supports Omaha, Nebraska addresses only. Use autocomplete and pick an Omaha address to continue.';

class EagleViewController {
    private isSandboxMode(): boolean {
        return config.integrations.eagleview.environment === 'sandbox';
    }

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

            if (this.isSandboxMode()) {
                res.status(503).json({
                    success: false,
                    message: 'EagleView sandbox only supports property data requests. Order creation is unavailable in sandbox.',
                });
                return;
            }

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
            console.log(orderAddress);

            if (!eagleViewMeasurementService.isSandboxSupportedAddress(orderAddress)) {
                res.status(400).json({
                    success: false,
                    message: SANDBOX_LOOKUP_FAILURE_MESSAGE,
                });
                return;
            }

            logger.info('[EagleView] Instant order request', { address: orderAddress });

            try {
                const report = await eagleViewMeasurementService.getInstantMeasurement(orderAddress);
                const { reportDownloadLink: _reportDownloadLink, ...reportData } = report;

                sendSuccess(res, reportData, 'EagleView sandbox lookup retrieved');
            } catch (error) {
                console.log(error);
                logger.error('[EagleView] Sandbox lookup request failed', {
                    message: error instanceof Error ? error.message : String(error),
                    address: orderAddress,

                });
                next(new ServiceUnavailableError(SANDBOX_LOOKUP_FAILURE_MESSAGE));
            }
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
                apiType: 'Property Data API (Sandbox only)',
                baseUrl: config.integrations.eagleview.baseUrl,
                environment: this.isSandboxMode() ? config.integrations.eagleview.environment : 'sandbox-forced',
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

}

export const eagleViewController = new EagleViewController();
