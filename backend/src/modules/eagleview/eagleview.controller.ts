/**
 * EagleView Controller
 *
 * Handles HTTP requests for EagleView integration.
 * Based on official EagleView Measurement Order API Swagger spec.
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
     * Place a new measurement order via EagleView PlaceOrder API.
     */
    async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { address, referenceId, primaryProductId, deliveryProductId } = req.body;

            if (!address || !address.addressLine1 || !address.city || !address.state || !address.postalCode) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required address fields: addressLine1, city, state, postalCode',
                });
                return;
            }

            const order = await eagleViewMeasurementService.placeOrder({
                address,
                referenceId,
                primaryProductId: primaryProductId || 2,
                deliveryProductId: deliveryProductId || 7,
            });

            sendSuccess(res, order, 'Measurement order placed');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /eagleview/orders/:reportId
     * Get report status and measurement data.
     */
    async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const reportId = parseInt(req.params.orderId, 10);

            if (isNaN(reportId)) {
                res.status(400).json({ success: false, message: 'reportId must be a number' });
                return;
            }

            const report = await eagleViewMeasurementService.getReport(reportId);
            sendSuccess(res, report);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /eagleview/orders
     * List reports (paginated).
     */
    async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const page = parseInt(req.query.page as string, 10) || 1;
            const count = parseInt(req.query.count as string, 10) || 20;

            const result = await eagleViewMeasurementService.getReports(page, count);
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /eagleview/orders/:reportId/report
     * Download the completed report PDF file.
     */
    async downloadReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const reportId = parseInt(req.params.orderId, 10);

            if (isNaN(reportId)) {
                res.status(400).json({ success: false, message: 'reportId must be a number' });
                return;
            }

            const reportBuffer = await eagleViewMeasurementService.getReportFile(reportId, 1, 1);

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="eagleview-report-${reportId}.pdf"`,
                'Content-Length': reportBuffer.length.toString(),
            });
            res.send(reportBuffer);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /eagleview/orders/:reportId/image
     * Proxy the EagleView aerial top-down image for a completed report.
     * Tries fileType=2 (top-down image), falls back to fileType=3 (ortho).
     */
    async getReportImage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const reportId = parseInt(req.params.orderId, 10);

            if (isNaN(reportId)) {
                res.status(400).json({ success: false, message: 'reportId must be a number' });
                return;
            }

            let imageBuffer: Buffer | null = null;

            // Try fileType=2 (top-down aerial image)
            try {
                imageBuffer = await eagleViewMeasurementService.getReportFile(reportId, 2, 1);
            } catch {
                logger.info('[EagleView] fileType=2 not available, trying fileType=3');
            }

            // Fallback: fileType=3 (ortho image)
            if (!imageBuffer || imageBuffer.length < 100) {
                try {
                    imageBuffer = await eagleViewMeasurementService.getReportFile(reportId, 3, 1);
                } catch {
                    logger.info('[EagleView] fileType=3 not available either');
                }
            }

            if (!imageBuffer || imageBuffer.length < 100) {
                res.status(404).json({ success: false, message: 'No aerial image available for this report' });
                return;
            }

            res.set({
                'Content-Type': 'image/jpeg',
                'Content-Length': imageBuffer.length.toString(),
                'Cache-Control': 'public, max-age=86400',
            });
            res.send(imageBuffer);
        } catch (error) {
            next(error);
        }
    }

    // ── Imagery ──────────────────────────────────────────────────────────

    /**
     * GET /eagleview/imagery?lat=...&lng=...
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
                environment: config.integrations.eagleview.baseUrl.includes('sandbox')
                    ? 'sandbox'
                    : 'production',
            },
        });
    }

    // ── Webhooks ─────────────────────────────────────────────────────────
    // EagleView sends webhooks as GET /OrderStatusUpdate?StatusId=&SubStatusId=&RefId=&ReportId=

    /**
     * Handles both:
     *   GET  /webhooks/eagleview/OrderStatusUpdate — order status changes
     *   POST /webhooks/eagleview/FileDelivery      — file delivery
     */
    async handleWebhook(req: Request, res: Response): Promise<void> {
        const { StatusId, SubStatusId, RefId, ReportId } = req.query as Record<string, string>;

        logger.info('[EagleView] Webhook received', {
            statusId: StatusId,
            subStatusId: SubStatusId,
            refId: RefId,
            reportId: ReportId,
            method: req.method,
            path: req.path,
        });

        try {
            // If this is a status update and we have a RefId, attach report to lead
            if (ReportId && RefId) {
                const reportId = parseInt(ReportId, 10);

                if (!isNaN(reportId)) {
                    try {
                        const report = await eagleViewMeasurementService.getReport(reportId);
                        await this.attachReportToLead(RefId, report);
                    } catch (err: any) {
                        logger.warn('[EagleView] Could not fetch report for webhook', { reportId, err: err.message });
                    }
                }
            }

            res.status(200).json({ received: true });
        } catch (error: any) {
            logger.error('[EagleView] Webhook processing failed', { error: error.message });
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
                `Report ID: ${report.reportId}`,
                `Status: ${report.status}`,
                `Area: ${report.area || 'N/A'} sq ft`,
                `Pitch: ${report.pitch || 'N/A'}`,
                `Facets: ${report.totalRoofFacets || 'N/A'}`,
                `Completed: ${report.dateCompleted || 'pending'}`,
                report.reportDownloadLink ? `Download: ${report.reportDownloadLink}` : '',
                '--- End EagleView Report ---',
            ].join('\n');

            await prisma.lead.update({
                where: { id: leadId },
                data: { notes: existingNotes + reportNote },
            });

            logger.info('[EagleView] Report attached to lead', { leadId, reportId: report.reportId });
        } catch (err) {
            logger.error('[EagleView] Failed to attach report to lead', { leadId, err });
        }
    }
}

export const eagleViewController = new EagleViewController();
