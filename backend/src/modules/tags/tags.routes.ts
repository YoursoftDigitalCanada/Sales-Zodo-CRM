import { Router } from 'express';
import { tagsController } from './tags.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createTagSchema, updateTagSchema, tagQuerySchema, tagIdSchema } from './tags.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.TAGS_VIEW), validate(tagQuerySchema), tagsController.getMany.bind(tagsController));
router.get('/all', requirePermission(PERMISSIONS.TAGS_VIEW), tagsController.getAll.bind(tagsController));
router.post('/', requirePermission(PERMISSIONS.TAGS_CREATE), validate(createTagSchema), tagsController.create.bind(tagsController));
router.get('/:id', requirePermission(PERMISSIONS.TAGS_VIEW), validate(tagIdSchema), tagsController.getById.bind(tagsController));
router.put('/:id', requirePermission(PERMISSIONS.TAGS_UPDATE), validate(tagIdSchema), validate(updateTagSchema), tagsController.update.bind(tagsController));
router.delete('/:id', requirePermission(PERMISSIONS.TAGS_DELETE), validate(tagIdSchema), tagsController.delete.bind(tagsController));

export default router;