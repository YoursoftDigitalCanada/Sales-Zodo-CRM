import { Router } from 'express';
import { z } from 'zod';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { uploadSingle } from '../../common/middleware/multer.config';
import { PERMISSIONS } from '../../common/constants/permissions';
import { documentsController } from './documents.controller';

const router = Router();
const idSchema = z.object({ params: z.object({ id: z.string().uuid() }) });

router.use(authenticate);
router.use(loadEmployee);

router.get('/categories', requirePermission(PERMISSIONS.FILES_VIEW), documentsController.categories.bind(documentsController));
router.post('/categories', requirePermission(PERMISSIONS.FILES_CREATE), documentsController.createCategory.bind(documentsController));
router.put('/categories/:id', requirePermission(PERMISSIONS.FILES_UPDATE), validate(idSchema), documentsController.updateCategory.bind(documentsController));
router.delete('/categories/:id', requirePermission(PERMISSIONS.FILES_DELETE), validate(idSchema), documentsController.deleteCategory.bind(documentsController));

router.get('/', requirePermission(PERMISSIONS.FILES_VIEW), documentsController.list.bind(documentsController));
router.post('/upload', requirePermission(PERMISSIONS.FILES_CREATE), uploadSingle, documentsController.upload.bind(documentsController));
router.get('/:id', requirePermission(PERMISSIONS.FILES_VIEW), validate(idSchema), documentsController.get.bind(documentsController));
router.put('/:id', requirePermission(PERMISSIONS.FILES_UPDATE), validate(idSchema), documentsController.update.bind(documentsController));
router.delete('/:id', requirePermission(PERMISSIONS.FILES_DELETE), validate(idSchema), documentsController.delete.bind(documentsController));
router.get('/:id/preview', requirePermission(PERMISSIONS.FILES_VIEW), validate(idSchema), documentsController.preview.bind(documentsController));
router.get('/:id/download', requirePermission(PERMISSIONS.FILES_DOWNLOAD), validate(idSchema), documentsController.download.bind(documentsController));
router.post('/:id/share', requirePermission(PERMISSIONS.FILES_UPDATE), validate(idSchema), documentsController.share.bind(documentsController));
router.delete('/:id/share', requirePermission(PERMISSIONS.FILES_UPDATE), validate(idSchema), documentsController.revokeShare.bind(documentsController));
router.post('/:id/link', requirePermission(PERMISSIONS.FILES_UPDATE), validate(idSchema), documentsController.link.bind(documentsController));
router.delete('/:id/link', requirePermission(PERMISSIONS.FILES_UPDATE), validate(idSchema), documentsController.unlink.bind(documentsController));

export default router;
