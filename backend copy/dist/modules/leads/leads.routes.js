"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leads_controller_1 = require("./leads.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const leads_validators_1 = require("./leads.validators");
const router = (0, express_1.Router)();
// All routes require authentication and employee context
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
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
router.get('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_VIEW), (0, validate_middleware_1.validate)(leads_validators_1.leadQuerySchema), leads_controller_1.leadsController.getMany.bind(leads_controller_1.leadsController));
/**
 * @swagger
 * /leads/pipeline:
 *   get:
 *     summary: Get leads grouped by status (pipeline view)
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.get('/pipeline', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_VIEW), (0, validate_middleware_1.validate)(leads_validators_1.pipelineQuerySchema), leads_controller_1.leadsController.getPipeline.bind(leads_controller_1.leadsController));
/**
 * @swagger
 * /leads/statistics:
 *   get:
 *     summary: Get lead statistics
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_VIEW), leads_controller_1.leadsController.getStatistics.bind(leads_controller_1.leadsController));
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
router.post('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_CREATE), (0, validate_middleware_1.validate)(leads_validators_1.createLeadSchema), leads_controller_1.leadsController.create.bind(leads_controller_1.leadsController));
/**
 * @swagger
 * /leads/bulk/assign:
 *   post:
 *     summary: Bulk assign leads
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.post('/bulk/assign', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_ASSIGN), (0, validate_middleware_1.validate)(leads_validators_1.bulkAssignSchema), leads_controller_1.leadsController.bulkAssign.bind(leads_controller_1.leadsController));
/**
 * @swagger
 * /leads/bulk/status:
 *   post:
 *     summary: Bulk update lead status
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.post('/bulk/status', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_UPDATE), (0, validate_middleware_1.validate)(leads_validators_1.bulkStatusSchema), leads_controller_1.leadsController.bulkUpdateStatus.bind(leads_controller_1.leadsController));
/**
 * @swagger
 * /leads/import:
 *   post:
 *     summary: Import leads
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.post('/import', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_IMPORT), leads_controller_1.leadsController.import.bind(leads_controller_1.leadsController));
/**
 * @swagger
 * /leads/export:
 *   post:
 *     summary: Export leads
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.post('/export', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_EXPORT), leads_controller_1.leadsController.export.bind(leads_controller_1.leadsController));
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
router.get('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_VIEW), (0, validate_middleware_1.validate)(leads_validators_1.leadIdSchema), leads_controller_1.leadsController.getById.bind(leads_controller_1.leadsController));
/**
 * @swagger
 * /leads/{id}/activities:
 *   get:
 *     summary: Get lead activities
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/activities', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_VIEW), (0, validate_middleware_1.validate)(leads_validators_1.leadIdSchema), leads_controller_1.leadsController.getActivities.bind(leads_controller_1.leadsController));
/**
 * @swagger
 * /leads/{id}:
 *   put:
 *     summary: Update lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_UPDATE), (0, validate_middleware_1.validate)(leads_validators_1.leadIdSchema), (0, validate_middleware_1.validate)(leads_validators_1.updateLeadSchema), leads_controller_1.leadsController.update.bind(leads_controller_1.leadsController));
/**
 * @swagger
 * /leads/{id}/status:
 *   patch:
 *     summary: Update lead status
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_UPDATE), (0, validate_middleware_1.validate)(leads_validators_1.leadIdSchema), leads_controller_1.leadsController.updateStatus.bind(leads_controller_1.leadsController));
/**
 * @swagger
 * /leads/{id}/assign:
 *   patch:
 *     summary: Assign lead to employee
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/assign', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_ASSIGN), (0, validate_middleware_1.validate)(leads_validators_1.leadIdSchema), leads_controller_1.leadsController.assign.bind(leads_controller_1.leadsController));
/**
 * @swagger
 * /leads/{id}/convert:
 *   post:
 *     summary: Convert lead to client
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/convert', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_CONVERT), (0, validate_middleware_1.validate)(leads_validators_1.convertLeadSchema), leads_controller_1.leadsController.convert.bind(leads_controller_1.leadsController));
/**
 * @swagger
 * /leads/{id}:
 *   delete:
 *     summary: Delete lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEADS_DELETE), (0, validate_middleware_1.validate)(leads_validators_1.leadIdSchema), leads_controller_1.leadsController.delete.bind(leads_controller_1.leadsController));
exports.default = router;
//# sourceMappingURL=leads.routes.js.map