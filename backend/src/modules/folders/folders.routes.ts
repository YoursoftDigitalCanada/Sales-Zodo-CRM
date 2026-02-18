import { Router } from 'express';
import { foldersController } from './folders.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createFolderSchema, updateFolderSchema, folderQuerySchema, folderIdSchema } from './folders.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.FOLDERS_VIEW), validate(folderQuerySchema), foldersController.getMany.bind(foldersController));
router.post('/', requirePermission(PERMISSIONS.FOLDERS_CREATE), validate(createFolderSchema), foldersController.create.bind(foldersController));
router.get('/:id', requirePermission(PERMISSIONS.FOLDERS_VIEW), validate(folderIdSchema), foldersController.getById.bind(foldersController));
router.put('/:id', requirePermission(PERMISSIONS.FOLDERS_UPDATE), validate(folderIdSchema), validate(updateFolderSchema), foldersController.update.bind(foldersController));
router.delete('/:id', requirePermission(PERMISSIONS.FOLDERS_DELETE), validate(folderIdSchema), foldersController.delete.bind(foldersController));

export default router;
