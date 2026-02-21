import { Request, Response, NextFunction } from 'express';
import { groupsService } from './groups.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class GroupsController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const group = await groupsService.create(req.context.tenantId, sanitizeBody(req.body));
            sendCreated(res, group, 'Group created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await groupsService.getMany(req.context.tenantId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const group = await groupsService.getById(req.params.id, req.context.tenantId);
            sendSuccess(res, group);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const group = await groupsService.update(req.params.id, req.context.tenantId, sanitizeBody(req.body));
            sendSuccess(res, group, 'Group updated');
        } catch (e) { next(e); }
    }

    async addMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await groupsService.addMembers(req.params.id, req.context.tenantId, req.body.clientIds);
            sendSuccess(res, null, 'Members added');
        } catch (e) { next(e); }
    }

    async removeMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await groupsService.removeMembers(req.params.id, req.context.tenantId, req.body.clientIds);
            sendSuccess(res, null, 'Members removed');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await groupsService.delete(req.params.id, req.context.tenantId);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const groupsController = new GroupsController();
