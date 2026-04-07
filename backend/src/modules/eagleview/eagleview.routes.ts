/**
 * EagleView Routes — Measurement Order API
 */

import { Router } from 'express';
import { eagleViewController } from './eagleview.controller';
import { loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';

const router = Router();
router.use(loadEmployee);

// Order endpoints
router.post(
  '/orders/instant',
  requirePermission(PERMISSIONS.ROOF_ESTIMATOR_CREATE),
  eagleViewController.createOrderInstant.bind(eagleViewController)
);
router.post(
  '/orders',
  requirePermission(PERMISSIONS.ROOF_ESTIMATOR_CREATE),
  eagleViewController.createOrder.bind(eagleViewController)
);
router.get(
  '/orders/:orderId',
  requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
  eagleViewController.getOrder.bind(eagleViewController)
);

// Health
router.get(
  '/health',
  requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
  eagleViewController.healthCheck.bind(eagleViewController)
);

export default router;

// Webhook routes (public — no auth)
export const eagleViewWebhookRouter = Router();
eagleViewWebhookRouter.get('/OrderStatusUpdate', eagleViewController.handleWebhook.bind(eagleViewController));
eagleViewWebhookRouter.post('/FileDelivery', eagleViewController.handleWebhook.bind(eagleViewController));
