import { Router } from 'express';
import { tenantsController } from './tenants.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createTenantSchema, updateTenantSchema, tenantQuerySchema, tenantIdSchema } from './tenants.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.TENANTS_VIEW), validate(tenantQuerySchema), tenantsController.getMany.bind(tenantsController));
router.post('/', requirePermission(PERMISSIONS.TENANTS_VIEW), validate(createTenantSchema), tenantsController.create.bind(tenantsController));
router.get('/:id', requirePermission(PERMISSIONS.TENANTS_VIEW), validate(tenantIdSchema), tenantsController.getById.bind(tenantsController));
router.put('/:id', requirePermission(PERMISSIONS.TENANTS_UPDATE), validate(tenantIdSchema), validate(updateTenantSchema), tenantsController.update.bind(tenantsController));
router.delete('/:id', requirePermission(PERMISSIONS.TENANTS_UPDATE), validate(tenantIdSchema), tenantsController.delete.bind(tenantsController));

export default router;
