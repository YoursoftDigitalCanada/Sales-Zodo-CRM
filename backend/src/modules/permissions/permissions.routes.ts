import { Router } from 'express';
import { permissionsController } from './permissions.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { permissionModuleSchema, roleIdSchema, assignPermissionsSchema } from './permissions.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

// Get all permissions
router.get('/', requirePermission(PERMISSIONS.ROLES_VIEW), permissionsController.getAll.bind(permissionsController));

// Get all module names
router.get('/modules', requirePermission(PERMISSIONS.ROLES_VIEW), permissionsController.getModules.bind(permissionsController));

// Get permissions by module
router.get('/modules/:module', requirePermission(PERMISSIONS.ROLES_VIEW), validate(permissionModuleSchema), permissionsController.getByModule.bind(permissionsController));

// Get role permissions
router.get('/roles/:roleId', requirePermission(PERMISSIONS.ROLES_VIEW), validate(roleIdSchema), permissionsController.getRolePermissions.bind(permissionsController));

// Assign permissions to role
router.post('/roles/:roleId/assign', requirePermission(PERMISSIONS.ROLES_ASSIGN_PERMISSIONS), validate(assignPermissionsSchema), permissionsController.assignPermissions.bind(permissionsController));

export default router;
