import { Router } from 'express';
import { productsController } from './products.controller';
import { authenticate, loadEmployee } from '../../../common/middleware/auth.middleware';
import { requirePermission } from '../../../common/middleware/permission.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../../common/constants/permissions';
import { createProductSchema, updateProductSchema, productQuerySchema, productIdSchema } from './products.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.PRODUCTS_VIEW), validate(productQuerySchema), productsController.getMany.bind(productsController));
router.post('/', requirePermission(PERMISSIONS.PRODUCTS_CREATE), validate(createProductSchema), productsController.create.bind(productsController));
router.get('/:id', requirePermission(PERMISSIONS.PRODUCTS_VIEW), validate(productIdSchema), productsController.getById.bind(productsController));
router.put('/:id', requirePermission(PERMISSIONS.PRODUCTS_UPDATE), validate(productIdSchema), validate(updateProductSchema), productsController.update.bind(productsController));
router.delete('/:id', requirePermission(PERMISSIONS.PRODUCTS_DELETE), validate(productIdSchema), productsController.delete.bind(productsController));

export default router;
