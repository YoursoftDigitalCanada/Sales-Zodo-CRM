/**
 * EagleView Routes — Property Data API v2
 *
 * New endpoints:
 *   POST   /eagleview/property              - Request property data
 *   POST   /eagleview/property/instant       - Request + wait for result
 *   GET    /eagleview/property/:requestId    - Get result
 *   GET    /eagleview/property/:requestId/image/:imageToken - Get image
 *
 * Legacy endpoints (backward compat):
 *   POST   /eagleview/orders                - Place order → maps to property request
 *   GET    /eagleview/orders                - List reports
 *   GET    /eagleview/orders/:orderId       - Get report → maps to property result
 *   GET    /eagleview/orders/:orderId/report - Download report
 *   GET    /eagleview/orders/:orderId/image  - Get image
 *   GET    /eagleview/imagery               - (disabled on sandbox)
 *   GET    /eagleview/health                - Health check
 */

import { Router } from 'express';
import { eagleViewController } from './eagleview.controller';

const router = Router();

// ── Property Data API v2 ─────────────────────────────────────────────────
router.post('/property/instant', eagleViewController.requestPropertyInstant.bind(eagleViewController));
router.post('/property', eagleViewController.requestProperty.bind(eagleViewController));
router.get('/property/:requestId/image/:imageToken', eagleViewController.getPropertyImage.bind(eagleViewController));
router.get('/property/:requestId', eagleViewController.getPropertyResult.bind(eagleViewController));

// ── Legacy Measurement Orders (backward compat) ──────────────────────────
router.post('/orders', eagleViewController.createOrder.bind(eagleViewController));
router.get('/orders', eagleViewController.listOrders.bind(eagleViewController));
router.get('/orders/:orderId', eagleViewController.getOrder.bind(eagleViewController));
router.get('/orders/:orderId/report', eagleViewController.downloadReport.bind(eagleViewController));
router.get('/orders/:orderId/image', eagleViewController.getReportImage.bind(eagleViewController));

// ── Imagery (disabled on sandbox) ────────────────────────────────────────
router.get('/imagery', eagleViewController.getPropertyImagery.bind(eagleViewController));

// ── Health ────────────────────────────────────────────────────────────────
router.get('/health', eagleViewController.healthCheck.bind(eagleViewController));

export default router;

// ── Webhook routes (public — no auth) ────────────────────────────────────
export const eagleViewWebhookRouter = Router();
eagleViewWebhookRouter.get('/OrderStatusUpdate', eagleViewController.handleWebhook.bind(eagleViewController));
eagleViewWebhookRouter.post('/FileDelivery', eagleViewController.handleWebhook.bind(eagleViewController));
