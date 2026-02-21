import { Request, Response, NextFunction } from 'express';
import { categoriesService } from './categories.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../../common/utils/responseFormatter';

export class CategoriesController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const category = await categoriesService.create(req.context.tenantId, req.body);
            sendCreated(res, category, 'Category created successfully');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await categoriesService.getMany(req.context.tenantId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getTree(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tree = await categoriesService.getTree(req.context.tenantId);
            sendSuccess(res, tree);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const category = await categoriesService.getById(req.params.id, req.context.tenantId);
            sendSuccess(res, category);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const category = await categoriesService.update(req.params.id, req.context.tenantId, req.body);
            sendSuccess(res, category, 'Category updated successfully');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await categoriesService.delete(req.params.id, req.context.tenantId);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const categoriesController = new CategoriesController();
