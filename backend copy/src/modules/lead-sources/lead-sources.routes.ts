import { Router } from 'express';
import { leadSourcesController } from './lead-sources.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import {
  createLeadSourceSchema,
  updateLeadSourceSchema,
  leadSourceQuerySchema,
  leadSourceIdSchema,
} from './lead-sources.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(loadEmployee);

/**
 * @swagger
 * /lead-sources:
 *   get:
 *     summary: Get lead sources
 *     tags: [Lead Sources]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/',
  requirePermission(PERMISSIONS.LEAD_SOURCES_VIEW),
  validate(leadSourceQuerySchema),
  leadSourcesController.getMany.bind(leadSourcesController)
);

/**
 * @swagger
 * /lead-sources/active:
 *   get:
 *     summary: Get active lead sources (for dropdowns)
 *     tags: [Lead Sources]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/active',
  requirePermission(PERMISSIONS.LEAD_SOURCES_VIEW),
  leadSourcesController.getActive.bind(leadSourcesController)
);

/**
 * @swagger
 * /lead-sources/statistics:
 *   get:
 *     summary: Get lead source statistics
 *     tags: [Lead Sources]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/statistics',
  requirePermission(PERMISSIONS.LEAD_SOURCES_VIEW),
  leadSourcesController.getStatistics.bind(leadSourcesController)
);

/**
 * @swagger
 * /lead-sources:
 *   post:
 *     summary: Create lead source
 *     tags: [Lead Sources]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  requirePermission(PERMISSIONS.LEAD_SOURCES_CREATE),
  validate(createLeadSourceSchema),
  leadSourcesController.create.bind(leadSourcesController)
);

/**
 * @swagger
 * /lead-sources/{id}:
 *   get:
 *     summary: Get lead source by ID
 *     tags: [Lead Sources]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:id',
  requirePermission(PERMISSIONS.LEAD_SOURCES_VIEW),
  validate(leadSourceIdSchema),
  leadSourcesController.getById.bind(leadSourcesController)
);

/**
 * @swagger
 * /lead-sources/{id}:
 *   put:
 *     summary: Update lead source
 *     tags: [Lead Sources]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  requirePermission(PERMISSIONS.LEAD_SOURCES_UPDATE),
  validate(leadSourceIdSchema),
  validate(updateLeadSourceSchema),
  leadSourcesController.update.bind(leadSourcesController)
);

/**
 * @swagger
 * /lead-sources/{id}:
 *   delete:
 *     summary: Delete lead source
 *     tags: [Lead Sources]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.LEAD_SOURCES_DELETE),
  validate(leadSourceIdSchema),
  leadSourcesController.delete.bind(leadSourcesController)
);

export default router;