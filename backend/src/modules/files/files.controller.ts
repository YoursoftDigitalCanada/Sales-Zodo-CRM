import { Request, Response, NextFunction } from 'express';
import { filesService } from './files.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import path from 'path';

export class FilesController {
    // ── UPLOAD (with multer) ──
    async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const multerFile = (req as any).file as Express.Multer.File | undefined;
            if (multerFile) {
                // Real file upload via multer
                const file = await filesService.upload(req.context.tenantId, multerFile, {
                    folderId: req.body.folderId || null,
                    projectId: req.body.projectId || null,
                    clientId: req.body.clientId || null,
                    leadId: req.body.leadId || null,
                    quoteId: req.body.quoteId || null,
                });
                sendCreated(res, file, 'File uploaded');
            } else {
                // Metadata-only create (backwards compat)
                const file = await filesService.create(req.context.tenantId, sanitizeBody(req.body));
                sendCreated(res, file, 'File created');
            }
        } catch (e) { next(e); }
    }

    // ── LIST ──
    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await filesService.getMany(req.context.tenantId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    // ── GET BY ID ──
    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const file = await filesService.getById(req.params.id, req.context.tenantId);
            sendSuccess(res, file);
        } catch (e) { next(e); }
    }

    // ── UPDATE ──
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const file = await filesService.update(req.params.id, req.context.tenantId, sanitizeBody(req.body));
            sendSuccess(res, file, 'File updated');
        } catch (e) { next(e); }
    }

    // ── DELETE (soft) ──
    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await filesService.delete(req.params.id, req.context.tenantId);
            sendNoContent(res);
        } catch (e) { next(e); }
    }

    // ── DOWNLOAD ──
    async download(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { filePath, fileName, mimeType } = await filesService.download(req.params.id, req.context.tenantId);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.setHeader('Content-Type', mimeType);
            res.sendFile(path.resolve(filePath));
        } catch (e) { next(e); }
    }

    // ── PREVIEW (inline) ──
    async preview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { filePath, fileName, mimeType } = await filesService.download(req.params.id, req.context.tenantId);
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'private, max-age=3600');
            res.sendFile(path.resolve(filePath));
        } catch (e) { next(e); }
    }

    // ── DOWNLOAD BY SHARE LINK (public) ──
    async downloadByShareLink(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { filePath, fileName, mimeType } = await filesService.downloadByShareLink(req.params.shareLink);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.setHeader('Content-Type', mimeType);
            res.sendFile(path.resolve(filePath));
        } catch (e) { next(e); }
    }

    // ── TOGGLE STAR ──
    async toggleStar(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const file = await filesService.toggleStar(req.params.id, req.context.tenantId);
            sendSuccess(res, file, file.isStarred ? 'File starred' : 'File unstarred');
        } catch (e) { next(e); }
    }

    // ── MOVE ──
    async move(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const file = await filesService.move(req.params.id, req.context.tenantId, req.body.folderId);
            sendSuccess(res, file, 'File moved');
        } catch (e) { next(e); }
    }

    // ── COPY ──
    async copy(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const file = await filesService.copy(req.params.id, req.context.tenantId, req.body);
            sendCreated(res, file, 'File copied');
        } catch (e) { next(e); }
    }

    // ── SHARE ──
    async createShareLink(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const file = await filesService.createShareLink(req.params.id, req.context.tenantId, req.body?.expiresInHours);
            sendSuccess(res, file, 'Share link created');
        } catch (e) { next(e); }
    }

    async revokeShareLink(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const file = await filesService.revokeShareLink(req.params.id, req.context.tenantId);
            sendSuccess(res, file, 'Share link revoked');
        } catch (e) { next(e); }
    }

    // ── RECENT / STARRED / TRASH ──
    async getRecent(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const files = await filesService.getRecent(req.context.tenantId);
            sendSuccess(res, files);
        } catch (e) { next(e); }
    }

    async getStarred(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const files = await filesService.getStarred(req.context.tenantId);
            sendSuccess(res, files);
        } catch (e) { next(e); }
    }

    async getTrash(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const files = await filesService.getTrash(req.context.tenantId);
            sendSuccess(res, files);
        } catch (e) { next(e); }
    }

    // ── RESTORE ──
    async restore(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const file = await filesService.restore(req.params.id, req.context.tenantId);
            sendSuccess(res, file, 'File restored');
        } catch (e) { next(e); }
    }

    // ── PERMANENT DELETE ──
    async permanentDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await filesService.permanentDelete(req.params.id, req.context.tenantId);
            sendNoContent(res);
        } catch (e) { next(e); }
    }

    // ── BULK ACTIONS ──
    async bulkDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await filesService.bulkDelete(req.context.tenantId, req.body.fileIds);
            sendSuccess(res, result, `${result.count} files moved to trash`);
        } catch (e) { next(e); }
    }

    async bulkMove(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await filesService.bulkMove(req.context.tenantId, req.body.fileIds, req.body.folderId);
            sendSuccess(res, result, `${result.count} files moved`);
        } catch (e) { next(e); }
    }

    // ── STORAGE ANALYTICS ──
    async getStorageAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const analytics = await filesService.getStorageAnalytics(req.context.tenantId);
            sendSuccess(res, analytics);
        } catch (e) { next(e); }
    }
}

export const filesController = new FilesController();
