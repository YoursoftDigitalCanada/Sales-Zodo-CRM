"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lead_sources_controller_1 = require("./lead-sources.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const lead_sources_validators_1 = require("./lead-sources.validators");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
/**
 * @swagger
 * /lead-sources:
 *   get:
 *     summary: Get lead sources
 *     tags: [Lead Sources]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEAD_SOURCES_VIEW), (0, validate_middleware_1.validate)(lead_sources_validators_1.leadSourceQuerySchema), lead_sources_controller_1.leadSourcesController.getMany.bind(lead_sources_controller_1.leadSourcesController));
/**
 * @swagger
 * /lead-sources/active:
 *   get:
 *     summary: Get active lead sources (for dropdowns)
 *     tags: [Lead Sources]
 *     security:
 *       - bearerAuth: []
 */
router.get('/active', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEAD_SOURCES_VIEW), lead_sources_controller_1.leadSourcesController.getActive.bind(lead_sources_controller_1.leadSourcesController));
/**
 * @swagger
 * /lead-sources/statistics:
 *   get:
 *     summary: Get lead source statistics
 *     tags: [Lead Sources]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEAD_SOURCES_VIEW), lead_sources_controller_1.leadSourcesController.getStatistics.bind(lead_sources_controller_1.leadSourcesController));
/**
 * @swagger
 * /lead-sources:
 *   post:
 *     summary: Create lead source
 *     tags: [Lead Sources]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEAD_SOURCES_CREATE), (0, validate_middleware_1.validate)(lead_sources_validators_1.createLeadSourceSchema), lead_sources_controller_1.leadSourcesController.create.bind(lead_sources_controller_1.leadSourcesController));
/**
 * @swagger
 * /lead-sources/{id}:
 *   get:
 *     summary: Get lead source by ID
 *     tags: [Lead Sources]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEAD_SOURCES_VIEW), (0, validate_middleware_1.validate)(lead_sources_validators_1.leadSourceIdSchema), lead_sources_controller_1.leadSourcesController.getById.bind(lead_sources_controller_1.leadSourcesController));
/**
 * @swagger
 * /lead-sources/{id}:
 *   put:
 *     summary: Update lead source
 *     tags: [Lead Sources]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEAD_SOURCES_UPDATE), (0, validate_middleware_1.validate)(lead_sources_validators_1.leadSourceIdSchema), (0, validate_middleware_1.validate)(lead_sources_validators_1.updateLeadSourceSchema), lead_sources_controller_1.leadSourcesController.update.bind(lead_sources_controller_1.leadSourcesController));
/**
 * @swagger
 * /lead-sources/{id}:
 *   delete:
 *     summary: Delete lead source
 *     tags: [Lead Sources]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.LEAD_SOURCES_DELETE), (0, validate_middleware_1.validate)(lead_sources_validators_1.leadSourceIdSchema), lead_sources_controller_1.leadSourcesController.delete.bind(lead_sources_controller_1.leadSourcesController));
exports.default = router;
//# sourceMappingURL=lead-sources.routes.js.map