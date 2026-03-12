/**
 * EagleView Routes
 *
 * Protected endpoints (auth + tenant):
 *   POST   /eagleview/orders              - Place measurement order
 *   GET    /eagleview/orders              - List reports
 *   GET    /eagleview/orders/:orderId     - Get report status + measurements
 *   GET    /eagleview/orders/:orderId/report - Download report PDF
 *   GET    /eagleview/imagery             - Property imagery
 *   GET    /eagleview/health              - Health check
 *
 * Public webhook endpoints (EagleView calls these):
 *   GET    /webhooks/eagleview/OrderStatusUpdate  - Status updates
 *   POST   /webhooks/eagleview/FileDelivery       - File delivery
 */

import { Router } from 'express';
import { eagleViewController } from './eagleview.controller';

const router = Router();

// ── Measurement Orders ───────────────────────────────────────────────────

router.post('/orders', eagleViewController.createOrder.bind(eagleViewController));
router.get('/orders', eagleViewController.listOrders.bind(eagleViewController));
router.get('/orders/:orderId', eagleViewController.getOrder.bind(eagleViewController));
router.get('/orders/:orderId/report', eagleViewController.downloadReport.bind(eagleViewController));

// ── Imagery ──────────────────────────────────────────────────────────────

router.get('/imagery', eagleViewController.getPropertyImagery.bind(eagleViewController));

// ── Health ────────────────────────────────────────────────────────────────

router.get('/health', eagleViewController.healthCheck.bind(eagleViewController));

export default router;

// ── Webhook routes (public — no auth) ────────────────────────────────────
// EagleView sends GET /OrderStatusUpdate and POST /FileDelivery

export const eagleViewWebhookRouter = Router();

eagleViewWebhookRouter.get('/OrderStatusUpdate', eagleViewController.handleWebhook.bind(eagleViewController));
eagleViewWebhookRouter.post('/FileDelivery', eagleViewController.handleWebhook.bind(eagleViewController));
