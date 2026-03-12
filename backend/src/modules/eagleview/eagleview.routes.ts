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
import { loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';

const router = Router();

// All EagleView routes require authentication (enforced by protectedRouter)
// and the roof-estimator view permission
const permission = requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW);

// ── Measurement Orders ───────────────────────────────────────────────────

router.post(
    '/orders',
    permission,
    eagleViewController.createOrder.bind(eagleViewController),
);

router.get(
    '/orders',
    permission,
    eagleViewController.listOrders.bind(eagleViewController),
);

router.get(
    '/orders/:orderId',
    permission,
    eagleViewController.getOrder.bind(eagleViewController),
);

router.get(
    '/orders/:orderId/report',
    permission,
    eagleViewController.downloadReport.bind(eagleViewController),
);

// ── Imagery ──────────────────────────────────────────────────────────────

router.get(
    '/imagery',
    permission,
    eagleViewController.getPropertyImagery.bind(eagleViewController),
);

// ── Health ────────────────────────────────────────────────────────────────

router.get(
    '/health',
    permission,
    eagleViewController.healthCheck.bind(eagleViewController),
);

export default router;

// ── Webhook route (public — no auth, EagleView calls this) ───────────────

export const eagleViewWebhookRouter = Router();

eagleViewWebhookRouter.post(
    '/eagleview',
    eagleViewController.handleWebhook.bind(eagleViewController),
);
