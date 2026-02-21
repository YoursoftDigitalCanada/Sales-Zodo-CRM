import { Request, Response, NextFunction } from 'express';
import { emailsService } from './emails.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';

export class EmailsController {
    async getEmails(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await emailsService.getEmails(req.user!.tenantId!, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getEmailById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const email = await emailsService.getEmailById(req.params.id, req.user!.tenantId!);
            sendSuccess(res, email);
        } catch (e) { next(e); }
    }

    async sendEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await emailsService.sendEmail(req.user!.tenantId!, req.body);
            sendCreated(res, result, 'Email sent');
        } catch (e) { next(e); }
    }

    async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const email = await emailsService.markAsRead(req.params.id, req.user!.tenantId!);
            sendSuccess(res, email, 'Email marked as read');
        } catch (e) { next(e); }
    }

    async deleteEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await emailsService.deleteEmail(req.params.id, req.user!.tenantId!);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const emailsController = new EmailsController();
