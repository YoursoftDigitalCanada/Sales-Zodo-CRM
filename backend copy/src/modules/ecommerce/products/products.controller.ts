import { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../../common/utils/responseFormatter';

export class ProductsController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const product = await productsService.create(req.user!.tenantId!, req.body);
            sendCreated(res, product, 'Product created successfully');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await productsService.getMany(req.user!.tenantId!, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const product = await productsService.getById(req.params.id, req.user!.tenantId!);
            sendSuccess(res, product);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const product = await productsService.update(req.params.id, req.user!.tenantId!, req.body);
            sendSuccess(res, product, 'Product updated successfully');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await productsService.delete(req.params.id, req.user!.tenantId!);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const productsController = new ProductsController();
