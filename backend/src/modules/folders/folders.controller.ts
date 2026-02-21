import { Request, Response, NextFunction } from 'express';
import { foldersService } from './folders.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class FoldersController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const folder = await foldersService.create(req.context.tenantId, sanitizeBody(req.body));
            sendCreated(res, folder, 'Folder created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await foldersService.getMany(req.context.tenantId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const folder = await foldersService.getById(req.params.id, req.context.tenantId);
            sendSuccess(res, folder);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const folder = await foldersService.update(req.params.id, req.context.tenantId, sanitizeBody(req.body));
            sendSuccess(res, folder, 'Folder updated');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await foldersService.delete(req.params.id, req.context.tenantId);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const foldersController = new FoldersController();
