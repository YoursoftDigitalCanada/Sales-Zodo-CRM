/**
 * EagleView Routes
 *
 * Protected endpoints (require auth + tenant context):
 *   POST   /eagleview/orders              - Create measurement order
 *   GET    /eagleview/orders              - List orders
 *   GET    /eagleview/orders/:orderId     - Get order status
 *   GET    /eagleview/orders/:orderId/report - Download report
 *   GET    /eagleview/imagery             - Get property imagery
 *   GET    /eagleview/health              - Health check
 *
 * The webhook endpoint is registered separately as a public route.
 */

import { Router } from 'express';
import { eagleViewController } from './eagleview.controller';

const router = Router();

// EagleView routes are protected by the parent protectedRouter
// (authenticate + tenantContext + moduleGuard)

// ── Measurement Orders ───────────────────────────────────────────────────

router.post(
    '/orders',
    eagleViewController.createOrder.bind(eagleViewController),
);

router.get(
    '/orders',
    eagleViewController.listOrders.bind(eagleViewController),
);

router.get(
    '/orders/:orderId',
    eagleViewController.getOrder.bind(eagleViewController),
);

router.get(
    '/orders/:orderId/report',
    eagleViewController.downloadReport.bind(eagleViewController),
);

// ── Imagery ──────────────────────────────────────────────────────────────

router.get(
    '/imagery',
    eagleViewController.getPropertyImagery.bind(eagleViewController),
);

// ── Health ────────────────────────────────────────────────────────────────

router.get(
    '/health',
    eagleViewController.healthCheck.bind(eagleViewController),
);

export default router;

// ── Webhook route (public — no auth, EagleView calls this) ───────────────

export const eagleViewWebhookRouter = Router();

eagleViewWebhookRouter.post(
    '/eagleview',
    eagleViewController.handleWebhook.bind(eagleViewController),
);
