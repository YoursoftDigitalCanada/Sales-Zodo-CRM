/**
 * EagleView Routes — Measurement Order API
 */

import { Router } from 'express';
import { eagleViewController } from './eagleview.controller';

const router = Router();

// Order endpoints
router.post('/orders/instant', eagleViewController.createOrderInstant.bind(eagleViewController));
router.post('/orders', eagleViewController.createOrder.bind(eagleViewController));
router.get('/orders/:orderId', eagleViewController.getOrder.bind(eagleViewController));

// Health
router.get('/health', eagleViewController.healthCheck.bind(eagleViewController));

export default router;

// Webhook routes (public — no auth)
export const eagleViewWebhookRouter = Router();
eagleViewWebhookRouter.get('/OrderStatusUpdate', eagleViewController.handleWebhook.bind(eagleViewController));
eagleViewWebhookRouter.post('/FileDelivery', eagleViewController.handleWebhook.bind(eagleViewController));
