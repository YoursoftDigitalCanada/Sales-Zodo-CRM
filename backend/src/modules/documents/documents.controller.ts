import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { sendCreated, sendNoContent, sendSuccess } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import { documentsService } from './documents.service';
import { filesService } from '../files/files.service';

export class DocumentsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await documentsService.list(req.context.tenantId, req.query as any);
      sendSuccess(res, result.data, undefined, 200, result.meta);
    } catch (error) { next(error); }
  }

  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) throw new Error('File is required');
      const document = await documentsService.upload(req.context.tenantId, file, sanitizeBody(req.body));
      sendCreated(res, document, 'Document uploaded');
    } catch (error) { next(error); }
  }

  async createFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const folder = await documentsService.createFolder(req.context.tenantId, sanitizeBody(req.body));
      sendCreated(res, folder, 'Folder created');
    } catch (error) { next(error); }
  }

  async listFolders(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await documentsService.listFolders(req.context.tenantId, req.query as Record<string, unknown>));
    } catch (error) { next(error); }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await documentsService.get(req.params.id, req.context.tenantId)); } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await documentsService.update(req.params.id, req.context.tenantId, sanitizeBody(req.body)), 'Document updated'); } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try { await documentsService.delete(req.params.id, req.context.tenantId); sendNoContent(res); } catch (error) { next(error); }
  }

  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const { filePath, fileName, mimeType } = await filesService.download(req.params.id, req.context.tenantId);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Type', mimeType);
      res.sendFile(path.resolve(filePath));
    } catch (error) { next(error); }
  }

  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const { filePath, fileName, mimeType } = await filesService.download(req.params.id, req.context.tenantId);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Type', mimeType);
      res.sendFile(path.resolve(filePath));
    } catch (error) { next(error); }
  }

  async share(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await documentsService.share(req.params.id, req.context.tenantId, sanitizeBody(req.body)), 'Document shared'); } catch (error) { next(error); }
  }

  async revokeShare(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await documentsService.revokeShare(req.params.id, req.context.tenantId), 'Share revoked'); } catch (error) { next(error); }
  }

  async link(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await documentsService.link(req.params.id, req.context.tenantId, sanitizeBody(req.body)), 'Document linked'); } catch (error) { next(error); }
  }

  async unlink(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await documentsService.unlink(req.params.id, req.context.tenantId), 'Document unlinked'); } catch (error) { next(error); }
  }

  async categories(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await documentsService.categories(req.context.tenantId)); } catch (error) { next(error); }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try { sendCreated(res, await documentsService.createCategory(req.context.tenantId, sanitizeBody(req.body)), 'Category created'); } catch (error) { next(error); }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await documentsService.updateCategory(req.params.id, req.context.tenantId, sanitizeBody(req.body)), 'Category updated'); } catch (error) { next(error); }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try { await documentsService.deleteCategory(req.params.id, req.context.tenantId); sendNoContent(res); } catch (error) { next(error); }
  }
}

export const documentsController = new DocumentsController();
