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
import { eagleViewMeasurementService } from './eagleview-measurement.service';

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

            const orderAddress = typeof address === 'string'
                ? this.parseAddressString(address)
                : {
                    addressLine1: address.addressLine1 || address.Address || '',
                    city: address.city || address.City || '',
                    state: address.state || address.State || '',
                    postalCode: address.postalCode || address.Zip || '',
                    country: address.country || address.Country || 'CA',
                };

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

            const orderAddress = typeof address === 'string'
                ? this.parseAddressString(address)
                : {
                    addressLine1: address.addressLine1 || address.Address || '',
                    city: address.city || address.City || '',
                    state: address.state || address.State || '',
                    postalCode: address.postalCode || address.Zip || '',
                    country: address.country || address.Country || 'CA',
                };

            if (!orderAddress.addressLine1 || !orderAddress.postalCode) {
                res.status(400).json({
                    success: false,
                    message: 'Could not parse address. Need at least street address and postal code.',
                });
                return;
            }

            logger.info('[EagleView] Instant order request', { address: orderAddress });

            const report = await eagleViewMeasurementService.placeOrderAndWait(orderAddress);

            sendSuccess(res, report, 'EagleView report retrieved');
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

    private parseAddressString(addr: string) {
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
}

export const eagleViewController = new EagleViewController();
