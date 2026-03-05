import { Router } from 'express';
import { leadSourceWebhooksController } from './lead-source-webhooks.controller';

const router = Router();

/**
 * POST /webhooks/leads/:sourceId
 * Public webhook endpoint for external lead ingestion.
 */
router.post('/:sourceId', leadSourceWebhooksController.receive.bind(leadSourceWebhooksController));

export default router;
