import { Request, Response, NextFunction } from 'express';
import { emailsService } from './emails.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import { imapPoller } from '../../common/services/imap-poller.service';
import { settingsRepository } from '../settings/settings.repository';

export class EmailsController {
    async getEmails(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await emailsService.getEmails(req.context.tenantId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getEmailById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const email = await emailsService.getEmailById(req.params.id, req.context.tenantId);
            sendSuccess(res, email);
        } catch (e) { next(e); }
    }

    async sendEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const files = ((req as any).files as Express.Multer.File[] | undefined) || [];
            const result = await emailsService.sendEmail(
                req.context.tenantId,
                sanitizeBody(req.body),
                req.user?.userId,
                files,
            );
            sendCreated(res, result, 'Email sent');
        } catch (e) { next(e); }
    }

    async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const email = await emailsService.markAsRead(req.params.id, req.context.tenantId);
            sendSuccess(res, email, 'Email marked as read');
        } catch (e) { next(e); }
    }

    async deleteEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await emailsService.deleteEmail(req.params.id, req.context.tenantId);
            sendNoContent(res);
        } catch (e) { next(e); }
    }

    async toggleStar(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { isStarred } = req.body;
            const email = await emailsService.toggleStar(req.params.id, req.context.tenantId, isStarred);
            sendSuccess(res, email, isStarred ? 'Email starred' : 'Email unstarred');
        } catch (e) { next(e); }
    }

    async moveToFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { folder } = req.body;
            const email = await emailsService.moveToFolder(req.params.id, req.context.tenantId, folder);
            sendSuccess(res, email, `Email moved to ${folder}`);
        } catch (e) { next(e); }
    }

    async fetchNow(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await imapPoller.fetchForTenant(req.context.tenantId);
            sendSuccess(res, result, result.error ? 'IMAP fetch completed with errors' : `Fetched ${result.fetched} new emails`);
        } catch (e) { next(e); }
    }

    async getConfigStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const status = await settingsRepository.getEmailConfigStatus(req.context.tenantId);
            sendSuccess(res, status);
        } catch (e) { next(e); }
    }
}

export const emailsController = new EmailsController();
