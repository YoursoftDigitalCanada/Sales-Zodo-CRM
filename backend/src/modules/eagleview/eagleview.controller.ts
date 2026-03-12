/**
 * EagleView Controller
 *
 * Handles HTTP requests for EagleView integration:
 *   - Measurement orders (create, get, list)
 *   - Property imagery
 *   - Webhooks (measurement.completed, measurement.failed)
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../common/utils/logger';
import { sendSuccess } from '../../common/utils/responseFormatter';
import { config } from '../../config';
import { eagleViewAuthService } from './eagleview-auth.service';
import { eagleViewMeasurementService } from './eagleview-measurement.service';
import { eagleViewImageryService } from './eagleview-imagery.service';
import { prisma } from '../../config/database';

class EagleViewController {

    // ── Measurement Orders ───────────────────────────────────────────────

    /**
     * POST /eagleview/orders
     * Create a new measurement order.
     */
    async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { address, referenceId, productType } = req.body;

            if (!address || !address.addressLine1 || !address.city || !address.state || !address.postalCode) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required address fields: addressLine1, city, state, postalCode',
                });
                return;
            }

            // Build callback URL for webhooks
            const callbackUrl = `${req.protocol}://${req.get('host')}/api/v1/eagleview/webhooks`;

            const order = await eagleViewMeasurementService.createOrder({
                address,
                referenceId,
                productType,
                callbackUrl,
            });

            sendSuccess(res, order, 'Measurement order created');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /eagleview/orders/:orderId
     * Get measurement order status.
     */
    async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { orderId } = req.params;

            if (!orderId) {
                res.status(400).json({ success: false, message: 'orderId is required' });
                return;
            }

            const report = await eagleViewMeasurementService.getOrder(orderId);
            sendSuccess(res, report);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /eagleview/orders
     * List measurement orders.
     */
    async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { status, limit } = req.query;

            const orders = await eagleViewMeasurementService.listOrders({
                status: status as string | undefined,
                limit: limit ? Number(limit) : undefined,
            });

            sendSuccess(res, orders);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /eagleview/orders/:orderId/report
     * Download the measurement report (when completed).
     */
    async downloadReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { orderId } = req.params;

            // First get the order to find the report URL
            const order = await eagleViewMeasurementService.getOrder(orderId);

            if (order.status !== 'completed' && order.status !== 'Completed') {
                res.status(400).json({
                    success: false,
                    message: `Order is not completed yet. Current status: ${order.status}`,
                });
                return;
            }

            if (!order.reportUrl) {
                res.status(404).json({
                    success: false,
                    message: 'No report URL available for this order',
                });
                return;
            }

            const reportBuffer = await eagleViewMeasurementService.downloadReport(order.reportUrl);

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="eagleview-report-${orderId}.pdf"`,
                'Content-Length': reportBuffer.length.toString(),
            });
            res.send(reportBuffer);
        } catch (error) {
            next(error);
        }
    }

    // ── Imagery ──────────────────────────────────────────────────────────

    /**
     * GET /eagleview/imagery?lat=...&lng=...
     * Fetch orthographic property imagery.
     */
    async getPropertyImagery(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const lat = parseFloat(req.query.lat as string);
            const lng = parseFloat(req.query.lng as string);

            if (isNaN(lat) || isNaN(lng)) {
                res.status(400).json({ success: false, message: 'lat and lng query params required' });
                return;
            }

            const imagery = await eagleViewImageryService.getPropertyImagery(lat, lng);
            sendSuccess(res, imagery);
        } catch (error) {
            next(error);
        }
    }

    // ── Health ────────────────────────────────────────────────────────────

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
                baseUrl: config.integrations.eagleview.baseUrl,
                environment: config.integrations.eagleview.baseUrl.includes('integrations')
                    ? 'sandbox'
                    : 'production',
            },
        });
    }

    // ── Webhook ──────────────────────────────────────────────────────────

    /**
     * POST /eagleview/webhooks
     * Handle EagleView webhook events.
     * Events: measurement.completed, measurement.failed
     */
    async handleWebhook(req: Request, res: Response): Promise<void> {
        const webhookSecret = config.integrations.eagleview.webhookSecret;

        // Verify webhook signature if secret is configured
        if (webhookSecret) {
            const signature = req.headers['x-eagleview-signature'] || req.headers['x-webhook-signature'];
            if (!signature || signature !== webhookSecret) {
                logger.warn('[EagleView] Webhook signature mismatch');
                res.status(401).json({ error: 'Invalid webhook signature' });
                return;
            }
        }

        const event = req.body;
        const eventType = event?.event || event?.type || event?.eventType;
        const orderId = event?.orderId || event?.order_id || event?.data?.orderId;

        logger.info('[EagleView] Webhook received', { eventType, orderId });

        try {
            switch (eventType) {
                case 'measurement.completed': {
                    // Fetch the completed report
                    const report = await eagleViewMeasurementService.getOrder(orderId);

                    logger.info('[EagleView] Measurement completed', {
                        orderId,
                        totalArea: report.totalArea,
                        totalSquares: report.totalSquares,
                    });

                    // If there's a referenceId, try to attach results to the lead
                    const referenceId = event?.referenceId || event?.reference_id || report.rawData?.referenceId;
                    if (referenceId) {
                        await this.attachReportToLead(referenceId, report);
                    }

                    break;
                }

                case 'measurement.failed': {
                    const reason = event?.reason || event?.error || 'Unknown error';
                    logger.error('[EagleView] Measurement failed', { orderId, reason });
                    break;
                }

                default:
                    logger.info('[EagleView] Unhandled webhook event', { eventType, orderId });
            }

            // Always acknowledge the webhook
            res.status(200).json({ received: true });
        } catch (error: any) {
            logger.error('[EagleView] Webhook processing failed', {
                eventType,
                orderId,
                error: error.message,
            });
            // Still return 200 to prevent EagleView from retrying
            res.status(200).json({ received: true, processingError: true });
        }
    }

    /**
     * Attach a completed EagleView report to a lead record.
     */
    private async attachReportToLead(leadId: string, report: any): Promise<void> {
        try {
            const lead = await prisma.lead.findUnique({
                where: { id: leadId },
                select: { id: true, notes: true, tenantId: true },
            });

            if (!lead) {
                logger.warn('[EagleView] Lead not found for report attachment', { leadId });
                return;
            }

            const existingNotes = lead.notes || '';
            const reportNote = [
                '\n\n--- EagleView Report ---',
                `Order ID: ${report.orderId}`,
                `Total Area: ${report.totalArea || 'N/A'} sq ft`,
                `Total Squares: ${report.totalSquares || 'N/A'}`,
                `Completed: ${report.completedAt || new Date().toISOString()}`,
                report.reportUrl ? `Report: ${report.reportUrl}` : '',
                '--- End EagleView Report ---',
            ].join('\n');

            await prisma.lead.update({
                where: { id: leadId },
                data: {
                    notes: existingNotes + reportNote,
                },
            });

            logger.info('[EagleView] Report attached to lead', { leadId, orderId: report.orderId });
        } catch (err) {
            logger.error('[EagleView] Failed to attach report to lead', { leadId, err });
        }
    }
}

export const eagleViewController = new EagleViewController();
