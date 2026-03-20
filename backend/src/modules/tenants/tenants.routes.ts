import { Router } from 'express';
import { tenantsController } from './tenants.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission, requireAdmin } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createTenantSchema, updateTenantSchema, tenantOnboardingSchema, tenantQuerySchema, tenantIdSchema } from './tenants.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

// Business type update — restricted to Owner/Admin roles (affects AI strategy)
router.patch('/business-type', requireAdmin(), tenantsController.updateBusinessType.bind(tenantsController));
router.get('/onboarding', requireAdmin(), tenantsController.getOnboarding.bind(tenantsController));
router.put('/onboarding', requireAdmin(), validate(tenantOnboardingSchema), tenantsController.completeOnboarding.bind(tenantsController));

router.get('/', requirePermission(PERMISSIONS.TENANTS_VIEW), validate(tenantQuerySchema), tenantsController.getMany.bind(tenantsController));
router.post('/', requirePermission(PERMISSIONS.TENANTS_VIEW), validate(createTenantSchema), tenantsController.create.bind(tenantsController));
router.get('/:id', requirePermission(PERMISSIONS.TENANTS_VIEW), validate(tenantIdSchema), tenantsController.getById.bind(tenantsController));
router.put('/:id', requirePermission(PERMISSIONS.TENANTS_UPDATE), validate(tenantIdSchema), validate(updateTenantSchema), tenantsController.update.bind(tenantsController));
router.delete('/:id', requirePermission(PERMISSIONS.TENANTS_UPDATE), validate(tenantIdSchema), tenantsController.delete.bind(tenantsController));

export default router;
