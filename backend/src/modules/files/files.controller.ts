import { Request, Response, NextFunction } from 'express';
import { filesService } from './files.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';

export class FilesController {
    async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // In practice, you'd handle file upload middleware here (multer, etc.)
            const file = await filesService.create(req.user!.tenantId!, req.body);
            sendCreated(res, file, 'File uploaded');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await filesService.getMany(req.user!.tenantId!, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const file = await filesService.getById(req.params.id, req.user!.tenantId!);
            sendSuccess(res, file);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const file = await filesService.update(req.params.id, req.user!.tenantId!, req.body);
            sendSuccess(res, file, 'File updated');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await filesService.delete(req.params.id, req.user!.tenantId!);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const filesController = new FilesController();
