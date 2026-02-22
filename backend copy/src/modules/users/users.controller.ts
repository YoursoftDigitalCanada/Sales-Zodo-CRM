import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class UsersController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = await usersService.create(sanitizeBody(req.body));
            sendCreated(res, user, 'User created successfully');
        } catch (error) { next(error); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const result = await usersService.getMany(req.query as any, tenantId);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (error) { next(error); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = await usersService.getById(req.params.id);
            sendSuccess(res, user);
        } catch (error) { next(error); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = await usersService.update(req.params.id, sanitizeBody(req.body));
            sendSuccess(res, user, 'User updated successfully');
        } catch (error) { next(error); }
    }

    async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = await usersService.updateStatus(req.params.id, req.body.status);
            sendSuccess(res, user, 'User status updated');
        } catch (error) { next(error); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await usersService.delete(req.params.id);
            sendNoContent(res);
        } catch (error) { next(error); }
    }
}

export const usersController = new UsersController();
