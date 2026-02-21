import { Router } from 'express';
import { filesController } from './files.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { uploadFileSchema, updateFileSchema, fileQuerySchema, fileIdSchema } from './files.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.FILES_VIEW), validate(fileQuerySchema), filesController.getMany.bind(filesController));
router.post('/', requirePermission(PERMISSIONS.FILES_CREATE), validate(uploadFileSchema), filesController.upload.bind(filesController));
router.get('/:id', requirePermission(PERMISSIONS.FILES_VIEW), validate(fileIdSchema), filesController.getById.bind(filesController));
router.put('/:id', requirePermission(PERMISSIONS.FILES_UPDATE), validate(fileIdSchema), validate(updateFileSchema), filesController.update.bind(filesController));
router.delete('/:id', requirePermission(PERMISSIONS.FILES_DELETE), validate(fileIdSchema), filesController.delete.bind(filesController));

export default router;
