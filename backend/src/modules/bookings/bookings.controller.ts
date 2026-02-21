import { Request, Response, NextFunction } from 'express';
import { bookingsService } from './bookings.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class BookingsController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const booking = await bookingsService.create(req.user!.tenantId!, sanitizeBody(req.body));
            sendCreated(res, booking, 'Booking created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await bookingsService.getMany(req.user!.tenantId!, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const booking = await bookingsService.getById(req.params.id, req.user!.tenantId!);
            sendSuccess(res, booking);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const booking = await bookingsService.update(req.params.id, req.user!.tenantId!, sanitizeBody(req.body));
            sendSuccess(res, booking, 'Booking updated');
        } catch (e) { next(e); }
    }

    async confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const booking = await bookingsService.confirm(req.params.id, req.user!.tenantId!);
            sendSuccess(res, booking, 'Booking confirmed');
        } catch (e) { next(e); }
    }

    async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const booking = await bookingsService.cancel(req.params.id, req.user!.tenantId!);
            sendSuccess(res, booking, 'Booking cancelled');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await bookingsService.delete(req.params.id, req.user!.tenantId!);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const bookingsController = new BookingsController();
