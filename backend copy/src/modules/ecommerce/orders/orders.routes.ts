import { Router } from 'express';
import { ordersController } from './orders.controller';
import { authenticate, loadEmployee } from '../../../common/middleware/auth.middleware';
import { requirePermission } from '../../../common/middleware/permission.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../../common/constants/permissions';
import { createOrderSchema, updateOrderSchema, orderQuerySchema, orderIdSchema } from './orders.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.ORDERS_VIEW), validate(orderQuerySchema), ordersController.getMany.bind(ordersController));
router.post('/', requirePermission(PERMISSIONS.ORDERS_CREATE), validate(createOrderSchema), ordersController.create.bind(ordersController));
router.get('/:id', requirePermission(PERMISSIONS.ORDERS_VIEW), validate(orderIdSchema), ordersController.getById.bind(ordersController));
router.put('/:id', requirePermission(PERMISSIONS.ORDERS_UPDATE), validate(orderIdSchema), validate(updateOrderSchema), ordersController.update.bind(ordersController));
router.delete('/:id', requirePermission(PERMISSIONS.ORDERS_DELETE), validate(orderIdSchema), ordersController.delete.bind(ordersController));

export default router;
