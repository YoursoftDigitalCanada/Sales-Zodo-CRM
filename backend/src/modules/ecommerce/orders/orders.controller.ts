import { Request, Response, NextFunction } from 'express';
import { ordersService } from './orders.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../../common/utils/responseFormatter';

export class OrdersController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const order = await ordersService.create(req.context.tenantId, req.body);
            sendCreated(res, order, 'Order created successfully');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await ordersService.getMany(req.context.tenantId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const order = await ordersService.getById(req.params.id, req.context.tenantId);
            sendSuccess(res, order);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const order = await ordersService.update(req.params.id, req.context.tenantId, req.body);
            sendSuccess(res, order, 'Order updated successfully');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await ordersService.delete(req.params.id, req.context.tenantId);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const ordersController = new OrdersController();
