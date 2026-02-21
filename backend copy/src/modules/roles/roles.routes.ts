import { Router } from 'express';
import { rolesController } from './roles.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createRoleSchema, updateRoleSchema, roleQuerySchema, roleIdSchema } from './roles.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.ROLES_VIEW), validate(roleQuerySchema), rolesController.getMany.bind(rolesController));
router.post('/', requirePermission(PERMISSIONS.ROLES_CREATE), validate(createRoleSchema), rolesController.create.bind(rolesController));
router.get('/:id', requirePermission(PERMISSIONS.ROLES_VIEW), validate(roleIdSchema), rolesController.getById.bind(rolesController));
router.put('/:id', requirePermission(PERMISSIONS.ROLES_UPDATE), validate(roleIdSchema), validate(updateRoleSchema), rolesController.update.bind(rolesController));
router.delete('/:id', requirePermission(PERMISSIONS.ROLES_DELETE), validate(roleIdSchema), rolesController.delete.bind(rolesController));

export default router;
