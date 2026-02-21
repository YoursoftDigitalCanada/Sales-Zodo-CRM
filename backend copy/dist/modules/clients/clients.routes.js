"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clients_controller_1 = require("./clients.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const clients_validators_1 = require("./clients.validators");
const router = (0, express_1.Router)();
// All routes require authentication and employee context
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Get clients with filters and pagination
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CLIENTS_VIEW), (0, validate_middleware_1.validate)(clients_validators_1.clientQuerySchema), clients_controller_1.clientsController.getMany.bind(clients_controller_1.clientsController));
/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Create a new client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CLIENTS_CREATE), (0, validate_middleware_1.validate)(clients_validators_1.createClientSchema), clients_controller_1.clientsController.create.bind(clients_controller_1.clientsController));
/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     summary: Get client by ID
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CLIENTS_VIEW), (0, validate_middleware_1.validate)(clients_validators_1.clientIdSchema), clients_controller_1.clientsController.getById.bind(clients_controller_1.clientsController));
/**
 * @swagger
 * /clients/{id}:
 *   put:
 *     summary: Update client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CLIENTS_UPDATE), (0, validate_middleware_1.validate)(clients_validators_1.clientIdSchema), (0, validate_middleware_1.validate)(clients_validators_1.updateClientSchema), clients_controller_1.clientsController.update.bind(clients_controller_1.clientsController));
/**
 * @swagger
 * /clients/{id}:
 *   delete:
 *     summary: Delete client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CLIENTS_DELETE), (0, validate_middleware_1.validate)(clients_validators_1.clientIdSchema), clients_controller_1.clientsController.delete.bind(clients_controller_1.clientsController));
exports.default = router;
//# sourceMappingURL=clients.routes.js.map