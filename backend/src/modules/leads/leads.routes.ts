import { Router } from 'express';
import { leadsController } from './leads.controller';
import {
  authenticate,
  loadEmployee,
} from '../../common/middleware/auth.middleware';
import {
  requirePermission,
  requireAnyPermission,
} from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import {
  createLeadSchema,
  updateLeadSchema,
  leadQuerySchema,
  leadIdSchema,
  convertLeadSchema,
  bulkAssignSchema,
  bulkStatusSchema,
  pipelineQuerySchema,
  setEstimationMethodSchema,
} from './leads.validators';
import { inspectionsController } from './inspections.controller';
import {
  createInspectionSchema,
  updateInspectionSchema,
  inspectionIdSchema,
  inspectionListSchema,
} from './inspections.validators';
import { insuranceClaimsController } from './insurance-claims.controller';
import {
  createInsuranceClaimSchema,
  updateInsuranceClaimSchema,
  insuranceClaimIdSchema,
  insuranceClaimListSchema,
} from './insurance-claims.validators';

const router = Router();

// All routes require authentication and employee context
router.use(authenticate);
router.use(loadEmployee);

/**
 * @swagger
 * /leads:
 *   get:
 *     summary: Get leads with filters and pagination
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST]
 *       - name: temperature
 *         in: query
 *         schema:
 *           type: string
 *           enum: [COLD, WARM, HOT]
 *       - name: assignedToId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of leads
 */
router.get(
  '/',
  requirePermission(PERMISSIONS.LEADS_VIEW),
  validate(leadQuerySchema),
  leadsController.getMany.bind(leadsController)
);

/**
 * @swagger
 * /leads/pipeline:
 *   get:
 *     summary: Get leads grouped by status (pipeline view)
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/pipeline',
  requirePermission(PERMISSIONS.LEADS_VIEW),
  validate(pipelineQuerySchema),
  leadsController.getPipeline.bind(leadsController)
);

/**
 * @swagger
 * /leads/statistics:
 *   get:
 *     summary: Get lead statistics
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/statistics',
  requirePermission(PERMISSIONS.LEADS_VIEW),
  leadsController.getStatistics.bind(leadsController)
);

/**
 * @swagger
 * /leads:
 *   post:
 *     summary: Create a new lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               companyName:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST]
 *               temperature:
 *                 type: string
 *                 enum: [COLD, WARM, HOT]
 *     responses:
 *       201:
 *         description: Lead created
 */
router.post(
  '/',
  requirePermission(PERMISSIONS.LEADS_CREATE),
  validate(createLeadSchema),
  leadsController.create.bind(leadsController)
);

/**
 * @swagger
 * /leads/bulk/assign:
 *   post:
 *     summary: Bulk assign leads
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/bulk/assign',
  requirePermission(PERMISSIONS.LEADS_ASSIGN),
  validate(bulkAssignSchema),
  leadsController.bulkAssign.bind(leadsController)
);

/**
 * @swagger
 * /leads/bulk/status:
 *   post:
 *     summary: Bulk update lead status
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/bulk/status',
  requirePermission(PERMISSIONS.LEADS_UPDATE),
  validate(bulkStatusSchema),
  leadsController.bulkUpdateStatus.bind(leadsController)
);

/**
 * @swagger
 * /leads/import:
 *   post:
 *     summary: Import leads
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/import',
  requirePermission(PERMISSIONS.LEADS_IMPORT),
  leadsController.import.bind(leadsController)
);

/**
 * @swagger
 * /leads/export:
 *   post:
 *     summary: Export leads
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/export',
  requirePermission(PERMISSIONS.LEADS_EXPORT),
  leadsController.export.bind(leadsController)
);

/**
 * @swagger
 * /leads/{id}:
 *   get:
 *     summary: Get lead by ID
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 */
router.get(
  '/:id',
  requirePermission(PERMISSIONS.LEADS_VIEW),
  validate(leadIdSchema),
  leadsController.getById.bind(leadsController)
);

/**
 * @swagger
 * /leads/{id}/activities:
 *   get:
 *     summary: Get lead activities
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:id/activities',
  requirePermission(PERMISSIONS.LEADS_VIEW),
  validate(leadIdSchema),
  leadsController.getActivities.bind(leadsController)
);

/**
 * @swagger
 * /leads/{id}:
 *   put:
 *     summary: Update lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  requirePermission(PERMISSIONS.LEADS_UPDATE),
  validate(leadIdSchema),
  validate(updateLeadSchema),
  leadsController.update.bind(leadsController)
);

/**
 * @swagger
 * /leads/{id}/status:
 *   patch:
 *     summary: Update lead status
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.LEADS_UPDATE),
  validate(leadIdSchema),
  leadsController.updateStatus.bind(leadsController)
);

/**
 * @swagger
 * /leads/{id}/assign:
 *   patch:
 *     summary: Assign lead to employee
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:id/assign',
  requirePermission(PERMISSIONS.LEADS_ASSIGN),
  validate(leadIdSchema),
  leadsController.assign.bind(leadsController)
);

/**
 * @swagger
 * /leads/{id}/estimation-method:
 *   patch:
 *     summary: Set estimation method for a qualified lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estimationMethod
 *             properties:
 *               estimationMethod:
 *                 type: string
 *                 enum: [PHYSICAL_INSPECTION, AI_ESTIMATION, BOTH]
 */
router.patch(
  '/:id/estimation-method',
  requirePermission(PERMISSIONS.LEADS_UPDATE),
  validate(setEstimationMethodSchema),
  leadsController.setEstimationMethod.bind(leadsController)
);

/**
 * @swagger
 * /leads/{id}/convert:
 *   post:
 *     summary: Convert lead to client
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/convert',
  requirePermission(PERMISSIONS.LEADS_CONVERT),
  validate(convertLeadSchema),
  leadsController.convert.bind(leadsController)
);

/**
 * @swagger
 * /leads/{id}:
 *   delete:
 *     summary: Delete lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.LEADS_DELETE),
  validate(leadIdSchema),
  leadsController.delete.bind(leadsController)
);

// ============================================
// INSPECTION SUB-RESOURCE ROUTES
// ============================================

/**
 * GET /leads/inspections/all
 * Get all inspections across all leads (must be before /:leadId routes)
 */
router.get(
  '/inspections/all',
  requirePermission(PERMISSIONS.LEADS_VIEW),
  inspectionsController.getAll.bind(inspectionsController)
);

/**
 * GET /leads/:leadId/inspections
 * Get all inspections for a lead
 */
router.get(
  '/:leadId/inspections',
  requirePermission(PERMISSIONS.LEADS_VIEW),
  validate(inspectionListSchema),
  inspectionsController.getByLeadId.bind(inspectionsController)
);

/**
 * POST /leads/:leadId/inspections
 * Create a new inspection
 */
router.post(
  '/:leadId/inspections',
  requirePermission(PERMISSIONS.LEADS_UPDATE),
  validate(createInspectionSchema),
  inspectionsController.create.bind(inspectionsController)
);

/**
 * GET /leads/:leadId/inspections/:inspectionId
 * Get a specific inspection
 */
router.get(
  '/:leadId/inspections/:inspectionId',
  requirePermission(PERMISSIONS.LEADS_VIEW),
  validate(inspectionIdSchema),
  inspectionsController.getById.bind(inspectionsController)
);

/**
 * PUT /leads/:leadId/inspections/:inspectionId
 * Update an inspection
 */
router.put(
  '/:leadId/inspections/:inspectionId',
  requirePermission(PERMISSIONS.LEADS_UPDATE),
  validate(updateInspectionSchema),
  inspectionsController.update.bind(inspectionsController)
);

/**
 * DELETE /leads/:leadId/inspections/:inspectionId
 * Delete an inspection
 */
router.delete(
  '/:leadId/inspections/:inspectionId',
  requirePermission(PERMISSIONS.LEADS_DELETE),
  validate(inspectionIdSchema),
  inspectionsController.delete.bind(inspectionsController)
);

// ============================================
// INSURANCE CLAIM SUB-RESOURCE ROUTES
// ============================================

router.get(
  '/:leadId/insurance-claims',
  requirePermission(PERMISSIONS.LEADS_VIEW),
  validate(insuranceClaimListSchema),
  insuranceClaimsController.getByLeadId.bind(insuranceClaimsController)
);

router.post(
  '/:leadId/insurance-claims',
  requirePermission(PERMISSIONS.LEADS_UPDATE),
  validate(createInsuranceClaimSchema),
  insuranceClaimsController.create.bind(insuranceClaimsController)
);

router.get(
  '/:leadId/insurance-claims/:claimId',
  requirePermission(PERMISSIONS.LEADS_VIEW),
  validate(insuranceClaimIdSchema),
  insuranceClaimsController.getById.bind(insuranceClaimsController)
);

router.put(
  '/:leadId/insurance-claims/:claimId',
  requirePermission(PERMISSIONS.LEADS_UPDATE),
  validate(updateInsuranceClaimSchema),
  insuranceClaimsController.update.bind(insuranceClaimsController)
);

router.delete(
  '/:leadId/insurance-claims/:claimId',
  requirePermission(PERMISSIONS.LEADS_DELETE),
  validate(insuranceClaimIdSchema),
  insuranceClaimsController.delete.bind(insuranceClaimsController)
);

export default router;