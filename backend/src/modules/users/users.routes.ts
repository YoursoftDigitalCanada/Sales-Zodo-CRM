import { Router } from 'express';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { usersController } from './users.controller';
import {
  createUserSchema,
  inviteUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  updateUserSchema,
  userIdSchema,
  userQuerySchema,
} from './users.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.USERS_VIEW), validate(userQuerySchema), usersController.getMany.bind(usersController));
router.post('/', requirePermission(PERMISSIONS.USERS_CREATE), validate(createUserSchema), usersController.create.bind(usersController));
router.post('/invite', requirePermission(PERMISSIONS.USERS_CREATE), validate(inviteUserSchema), usersController.invite.bind(usersController));
router.get('/:id', requirePermission(PERMISSIONS.USERS_VIEW), validate(userIdSchema), usersController.getById.bind(usersController));
router.put('/:id', requirePermission(PERMISSIONS.USERS_UPDATE), validate(userIdSchema), validate(updateUserSchema), usersController.update.bind(usersController));
router.put('/:id/role', requirePermission(PERMISSIONS.USERS_UPDATE), validate(userIdSchema), validate(updateUserRoleSchema), usersController.updateRole.bind(usersController));
router.patch('/:id/status', requirePermission(PERMISSIONS.USERS_MANAGE_STATUS), validate(userIdSchema), validate(updateUserStatusSchema), usersController.updateStatus.bind(usersController));
router.delete('/:id', requirePermission(PERMISSIONS.USERS_DELETE), validate(userIdSchema), usersController.delete.bind(usersController));

export default router;
