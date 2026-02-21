import { Router } from 'express';
import { clientsController } from './clients.controller';
import {
    authenticate,
    loadEmployee,
} from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import {
    createClientSchema,
    updateClientSchema,
    clientQuerySchema,
    clientIdSchema,
} from './clients.validators';

const router = Router();

// All routes require authentication and employee context
router.use(authenticate);
router.use(loadEmployee);

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Get clients with filters and pagination
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/',
    requirePermission(PERMISSIONS.CLIENTS_VIEW),
    validate(clientQuerySchema),
    clientsController.getMany.bind(clientsController)
);

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Create a new client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 */
router.post(
    '/',
    requirePermission(PERMISSIONS.CLIENTS_CREATE),
    validate(createClientSchema),
    clientsController.create.bind(clientsController)
);

/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     summary: Get client by ID
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/:id',
    requirePermission(PERMISSIONS.CLIENTS_VIEW),
    validate(clientIdSchema),
    clientsController.getById.bind(clientsController)
);

/**
 * @swagger
 * /clients/{id}:
 *   put:
 *     summary: Update client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 */
router.put(
    '/:id',
    requirePermission(PERMISSIONS.CLIENTS_UPDATE),
    validate(clientIdSchema),
    validate(updateClientSchema),
    clientsController.update.bind(clientsController)
);

/**
 * @swagger
 * /clients/{id}:
 *   delete:
 *     summary: Delete client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
    '/:id',
    requirePermission(PERMISSIONS.CLIENTS_DELETE),
    validate(clientIdSchema),
    clientsController.delete.bind(clientsController)
);

export default router;
