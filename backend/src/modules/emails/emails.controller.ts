import { Request, Response, NextFunction } from 'express';
import { emailsService } from './emails.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import { imapPoller } from '../../common/services/imap-poller.service';

export class EmailsController {
    async getEmails(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await emailsService.getEmails(req.context.tenantId, req.context.userId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getEmailById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const email = await emailsService.getEmailById(req.params.id, req.context.tenantId, req.context.userId);
            sendSuccess(res, email);
        } catch (e) { next(e); }
    }

    async sendEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const files = ((req as any).files as Express.Multer.File[] | undefined) || [];
            const result = await emailsService.sendEmail(
                req.context.tenantId,
                req.context.userId,
                sanitizeBody(req.body),
                {
                    employeeId: req.context.employeeId,
                    userId: req.context.userId,
                },
                files,
            );
            sendCreated(res, result, 'Email sent');
        } catch (e) { next(e); }
    }

    async saveDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const files = ((req as any).files as Express.Multer.File[] | undefined) || [];
            const result = await emailsService.saveDraft(
                req.context.tenantId,
                req.context.userId,
                sanitizeBody(req.body),
                {
                    employeeId: req.context.employeeId,
                    userId: req.context.userId,
                },
                files,
            );
            sendCreated(res, result, result.scheduledFor ? 'Email scheduled' : 'Draft saved');
        } catch (e) { next(e); }
    }

    async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const email = await emailsService.markAsRead(
                req.params.id,
                req.context.tenantId,
                req.context.userId,
                req.body?.isRead,
            );
            sendSuccess(res, email, req.body?.isRead === false ? 'Email marked as unread' : 'Email marked as read');
        } catch (e) { next(e); }
    }

    async deleteEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await emailsService.deleteEmail(req.params.id, req.context.tenantId, req.context.userId, req.context.userId);
            sendNoContent(res);
        } catch (e) { next(e); }
    }

    async toggleStar(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { isStarred } = req.body;
            const email = await emailsService.toggleStar(req.params.id, req.context.tenantId, req.context.userId, isStarred);
            sendSuccess(res, email, isStarred ? 'Email starred' : 'Email unstarred');
        } catch (e) { next(e); }
    }

    async moveToFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { folder } = req.body;
            const email = await emailsService.moveToFolder(req.params.id, req.context.tenantId, req.context.userId, folder);
            sendSuccess(res, email, `Email moved to ${folder}`);
        } catch (e) { next(e); }
    }

    async fetchNow(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await imapPoller.fetchForUser(req.context.userId);
            sendSuccess(res, result, result.error ? 'IMAP fetch completed with errors' : `Fetched ${result.fetched} new emails`);
        } catch (e) { next(e); }
    }

    async getConfigStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const status = await emailsService.getMailboxConfigStatus(req.context.userId);
            sendSuccess(res, status);
        } catch (e) { next(e); }
    }

    async getMailboxSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const settings = await emailsService.getMailboxSettings(req.context.userId);
            sendSuccess(res, settings);
        } catch (e) { next(e); }
    }

    async updateMailboxSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const settings = await emailsService.updateMailboxSettings(req.context.userId, sanitizeBody(req.body));
            sendSuccess(res, settings, 'Mailbox settings updated');
        } catch (e) { next(e); }
    }

    async getLabels(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const labels = await emailsService.getLabels(req.context.tenantId);
            sendSuccess(res, labels);
        } catch (e) { next(e); }
    }

    async createLabel(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const label = await emailsService.createLabel(req.context.tenantId, sanitizeBody(req.body));
            sendCreated(res, label, 'Email label created');
        } catch (e) { next(e); }
    }

    async setLabels(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const email = await emailsService.setLabels(
                req.params.id,
                req.context.tenantId,
                req.context.userId,
                req.body?.labelIds || [],
            );
            sendSuccess(res, email, 'Email labels updated');
        } catch (e) { next(e); }
    }

    async toggleImportant(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const email = await emailsService.toggleImportant(
                req.params.id,
                req.context.tenantId,
                req.context.userId,
                req.body?.isImportant,
            );
            sendSuccess(res, email, req.body?.isImportant ? 'Email marked as important' : 'Email importance removed');
        } catch (e) { next(e); }
    }

    async snooze(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const email = await emailsService.snooze(
                req.params.id,
                req.context.tenantId,
                req.context.userId,
                req.body?.snoozedUntil,
            );
            sendSuccess(res, email, req.body?.snoozedUntil ? 'Email snoozed' : 'Email snooze cleared');
        } catch (e) { next(e); }
    }
}

export const emailsController = new EmailsController();
