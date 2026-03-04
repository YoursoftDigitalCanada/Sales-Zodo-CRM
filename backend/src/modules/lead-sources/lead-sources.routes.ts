import { Router } from 'express';
import { leadSourcesController } from './lead-sources.controller';
import { validate } from '../../common/middleware/validate.middleware';
import {
  createLeadSourceSchema,
  updateLeadSourceSchema,
  leadSourceQuerySchema,
  leadSourceIdSchema,
  leadSourceLogQuerySchema,
} from './lead-sources.validators';

const router = Router();

// ── Static lists (must be before /:id routes) ──────────────────────
/**
 * GET /lead-sources/types
 * Get available source types for the "Add Source" wizard
 */
router.get(
  '/types',
  leadSourcesController.getTypes.bind(leadSourcesController)
);

/**
 * GET /lead-sources/active
 * Get all active lead sources (for dropdowns)
 */
router.get(
  '/active',
  leadSourcesController.getActive.bind(leadSourcesController)
);

/**
 * GET /lead-sources/statistics
 * Get per-source statistics
 */
router.get(
  '/statistics',
  leadSourcesController.getStatistics.bind(leadSourcesController)
);

/**
 * GET /lead-sources/stats/summary
 * Get summary stats across all sources
 */
router.get(
  '/stats/summary',
  leadSourcesController.getStatsSummary.bind(leadSourcesController)
);

// ── CRUD ────────────────────────────────────────────────────────────
/**
 * GET /lead-sources
 * List sources with pagination, search, and filters
 */
router.get(
  '/',
  validate(leadSourceQuerySchema),
  leadSourcesController.getMany.bind(leadSourcesController)
);

/**
 * POST /lead-sources
 * Create a new lead source
 */
router.post(
  '/',
  validate(createLeadSourceSchema),
  leadSourcesController.create.bind(leadSourcesController)
);

/**
 * GET /lead-sources/:id
 * Get lead source details
 */
router.get(
  '/:id',
  validate(leadSourceIdSchema),
  leadSourcesController.getById.bind(leadSourcesController)
);

/**
 * PUT /lead-sources/:id
 * Update a lead source
 */
router.put(
  '/:id',
  validate(leadSourceIdSchema),
  validate(updateLeadSourceSchema),
  leadSourcesController.update.bind(leadSourcesController)
);

/**
 * DELETE /lead-sources/:id
 * Delete a lead source
 */
router.delete(
  '/:id',
  validate(leadSourceIdSchema),
  leadSourcesController.delete.bind(leadSourcesController)
);

// ── Actions ─────────────────────────────────────────────────────────
/**
 * POST /lead-sources/:id/pause
 * Pause a lead source
 */
router.post(
  '/:id/pause',
  validate(leadSourceIdSchema),
  leadSourcesController.pause.bind(leadSourcesController)
);

/**
 * POST /lead-sources/:id/resume
 * Resume a lead source
 */
router.post(
  '/:id/resume',
  validate(leadSourceIdSchema),
  leadSourcesController.resume.bind(leadSourcesController)
);

/**
 * POST /lead-sources/:id/test
 * Test connection
 */
router.post(
  '/:id/test',
  validate(leadSourceIdSchema),
  leadSourcesController.testConnection.bind(leadSourcesController)
);

// ── Webhook Management ──────────────────────────────────────────────
/**
 * POST /lead-sources/:id/webhook/regenerate
 * Regenerate webhook secret
 */
router.post(
  '/:id/webhook/regenerate',
  validate(leadSourceIdSchema),
  leadSourcesController.regenerateWebhookSecret.bind(leadSourcesController)
);

// ── Logs ────────────────────────────────────────────────────────────
/**
 * GET /lead-sources/:id/logs
 * Get webhook/event logs
 */
router.get(
  '/:id/logs',
  validate(leadSourceIdSchema),
  leadSourcesController.getLogs.bind(leadSourcesController)
);

export default router;