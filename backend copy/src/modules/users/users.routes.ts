import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createUserSchema, updateUserSchema, userQuerySchema, userIdSchema } from './users.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.USERS_VIEW), validate(userQuerySchema), usersController.getMany.bind(usersController));
router.post('/', requirePermission(PERMISSIONS.USERS_CREATE), validate(createUserSchema), usersController.create.bind(usersController));
router.get('/:id', requirePermission(PERMISSIONS.USERS_VIEW), validate(userIdSchema), usersController.getById.bind(usersController));
router.put('/:id', requirePermission(PERMISSIONS.USERS_UPDATE), validate(userIdSchema), validate(updateUserSchema), usersController.update.bind(usersController));
router.patch('/:id/status', requirePermission(PERMISSIONS.USERS_MANAGE_STATUS), validate(userIdSchema), usersController.updateStatus.bind(usersController));
router.delete('/:id', requirePermission(PERMISSIONS.USERS_DELETE), validate(userIdSchema), usersController.delete.bind(usersController));

export default router;
