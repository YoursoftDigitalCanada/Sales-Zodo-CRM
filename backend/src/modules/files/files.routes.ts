import { Router } from 'express';
import { filesController } from './files.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { uploadSingle } from '../../common/middleware/multer.config';
import {
    uploadFileSchema, updateFileSchema, fileQuerySchema, fileIdSchema,
    moveFileSchema, copyFileSchema, shareFileSchema, bulkActionSchema, bulkMoveSchema,
} from './files.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

// ── Collection routes (must come before :id param routes) ──
router.get('/storage',   requirePermission(PERMISSIONS.FILES_VIEW), filesController.getStorageAnalytics.bind(filesController));
router.get('/recent',    requirePermission(PERMISSIONS.FILES_VIEW), filesController.getRecent.bind(filesController));
router.get('/starred',   requirePermission(PERMISSIONS.FILES_VIEW), filesController.getStarred.bind(filesController));
router.get('/trash',     requirePermission(PERMISSIONS.FILES_VIEW), filesController.getTrash.bind(filesController));

// Bulk actions
router.post('/bulk-delete', requirePermission(PERMISSIONS.FILES_DELETE), validate(bulkActionSchema), filesController.bulkDelete.bind(filesController));
router.post('/bulk-move',   requirePermission(PERMISSIONS.FILES_UPDATE), validate(bulkMoveSchema),   filesController.bulkMove.bind(filesController));

// ── CRUD ──
router.get('/',  requirePermission(PERMISSIONS.FILES_VIEW), validate(fileQuerySchema), filesController.getMany.bind(filesController));
router.post('/', requirePermission(PERMISSIONS.FILES_CREATE), uploadSingle, filesController.upload.bind(filesController));

// ── Single file routes ──
router.get('/:id',          requirePermission(PERMISSIONS.FILES_VIEW),   validate(fileIdSchema), filesController.getById.bind(filesController));
router.put('/:id',          requirePermission(PERMISSIONS.FILES_UPDATE), validate(fileIdSchema), validate(updateFileSchema), filesController.update.bind(filesController));
router.delete('/:id',       requirePermission(PERMISSIONS.FILES_DELETE), validate(fileIdSchema), filesController.delete.bind(filesController));

// File actions
router.get('/:id/download',      requirePermission(PERMISSIONS.FILES_VIEW),   validate(fileIdSchema), filesController.download.bind(filesController));
router.get('/:id/preview',       requirePermission(PERMISSIONS.FILES_VIEW),   validate(fileIdSchema), filesController.preview.bind(filesController));
router.put('/:id/star',           requirePermission(PERMISSIONS.FILES_UPDATE), validate(fileIdSchema), filesController.toggleStar.bind(filesController));
router.put('/:id/move',           requirePermission(PERMISSIONS.FILES_UPDATE), validate(fileIdSchema), validate(moveFileSchema),  filesController.move.bind(filesController));
router.post('/:id/copy',          requirePermission(PERMISSIONS.FILES_CREATE), validate(fileIdSchema), validate(copyFileSchema),  filesController.copy.bind(filesController));
router.post('/:id/share',         requirePermission(PERMISSIONS.FILES_UPDATE), validate(fileIdSchema), validate(shareFileSchema), filesController.createShareLink.bind(filesController));
router.delete('/:id/share',       requirePermission(PERMISSIONS.FILES_UPDATE), validate(fileIdSchema), filesController.revokeShareLink.bind(filesController));
router.put('/:id/restore',        requirePermission(PERMISSIONS.FILES_UPDATE), validate(fileIdSchema), filesController.restore.bind(filesController));
router.delete('/:id/permanent',   requirePermission(PERMISSIONS.FILES_DELETE), validate(fileIdSchema), filesController.permanentDelete.bind(filesController));

export default router;
