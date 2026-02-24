import { Request, Response, NextFunction } from 'express';
import { calendarService } from './calendar.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';

export class CalendarController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const event = await calendarService.create(req.context.tenantId, req.body, req.user!.employeeId);
            sendCreated(res, event, 'Event created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await calendarService.getMany(req.context.tenantId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const event = await calendarService.getById(req.params.id, req.context.tenantId);
            sendSuccess(res, event);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const event = await calendarService.update(req.params.id, req.context.tenantId, req.body);
            sendSuccess(res, event, 'Event updated');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await calendarService.delete(req.params.id, req.context.tenantId);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
    async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const event = await calendarService.updateStatus(req.params.id, req.context.tenantId, req.body.status);
            sendSuccess(res, event, 'Event status updated');
        } catch (e) { next(e); }
    }
}

export const calendarController = new CalendarController();
