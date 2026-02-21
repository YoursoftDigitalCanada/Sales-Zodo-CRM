import { Router } from 'express';
import { categoriesController } from './categories.controller';
import { authenticate, loadEmployee } from '../../../common/middleware/auth.middleware';
import { requirePermission } from '../../../common/middleware/permission.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../../common/constants/permissions';
import { createCategorySchema, updateCategorySchema, categoryQuerySchema, categoryIdSchema } from './categories.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.CATEGORIES_VIEW), validate(categoryQuerySchema), categoriesController.getMany.bind(categoriesController));
router.get('/tree', requirePermission(PERMISSIONS.CATEGORIES_VIEW), categoriesController.getTree.bind(categoriesController));
router.post('/', requirePermission(PERMISSIONS.CATEGORIES_CREATE), validate(createCategorySchema), categoriesController.create.bind(categoriesController));
router.get('/:id', requirePermission(PERMISSIONS.CATEGORIES_VIEW), validate(categoryIdSchema), categoriesController.getById.bind(categoriesController));
router.put('/:id', requirePermission(PERMISSIONS.CATEGORIES_UPDATE), validate(categoryIdSchema), validate(updateCategorySchema), categoriesController.update.bind(categoriesController));
router.delete('/:id', requirePermission(PERMISSIONS.CATEGORIES_DELETE), validate(categoryIdSchema), categoriesController.delete.bind(categoriesController));

export default router;
