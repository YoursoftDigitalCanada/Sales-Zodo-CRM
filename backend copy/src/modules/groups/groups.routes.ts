import { Router } from 'express';
import { groupsController } from './groups.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createGroupSchema, updateGroupSchema, groupQuerySchema, groupIdSchema, addMembersSchema, removeMembersSchema } from './groups.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.GROUPS_VIEW), validate(groupQuerySchema), groupsController.getMany.bind(groupsController));
router.post('/', requirePermission(PERMISSIONS.GROUPS_CREATE), validate(createGroupSchema), groupsController.create.bind(groupsController));
router.get('/:id', requirePermission(PERMISSIONS.GROUPS_VIEW), validate(groupIdSchema), groupsController.getById.bind(groupsController));
router.put('/:id', requirePermission(PERMISSIONS.GROUPS_UPDATE), validate(groupIdSchema), validate(updateGroupSchema), groupsController.update.bind(groupsController));
router.delete('/:id', requirePermission(PERMISSIONS.GROUPS_DELETE), validate(groupIdSchema), groupsController.delete.bind(groupsController));
router.post('/:id/members', requirePermission(PERMISSIONS.GROUPS_UPDATE), validate(groupIdSchema), validate(addMembersSchema), groupsController.addMembers.bind(groupsController));
router.delete('/:id/members/:clientId', requirePermission(PERMISSIONS.GROUPS_UPDATE), validate(groupIdSchema), validate(removeMembersSchema), groupsController.removeMembers.bind(groupsController));

export default router;
