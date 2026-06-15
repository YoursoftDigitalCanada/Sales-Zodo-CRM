import { emailsRepository } from './emails.repository';
import { EmailFolder } from '@prisma/client';
import {
    SendEmailDto,
    SaveDraftDto,
    EmailQueryDto,
    MailboxConfigStatusDto,
    MailboxSettingsResponseDto,
    UpdateMailboxSettingsDto,
    CreateEmailLabelDto,
    toEmailResponseDto,
} from './emails.dto';
import { BadRequestError, NotFoundError, ServiceUnavailableError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { mailerService } from '../../common/services/mailer.service';
import { imapPoller } from '../../common/services/imap-poller.service';
import { mailboxRepository } from './mailbox.repository';
import { config } from '../../config';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export class EmailsService {
    private escapeHtml(value: string) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    private async buildMailboxSignature(smtp: {
        signature?: string;
        signatureLogoUrl?: string;
        signatureImageUrl?: string;
    }) {
        const signatureText = String(smtp.signature || '').trim();
        const assetDefinitions = [
            { storedPath: String(smtp.signatureLogoUrl || ''), alt: 'Company logo', maxWidth: 180, maxHeight: 60 },
            { storedPath: String(smtp.signatureImageUrl || ''), alt: 'Email signature', maxWidth: 220, maxHeight: 78 },
        ].filter((asset) => asset.storedPath);

        const imageHtml: string[] = [];
        const publicApiOrigin = String(process.env.PUBLIC_API_URL || process.env.API_BASE_URL || (
            config.app.isProduction ? 'https://salesapi.zodo.ca' : `http://localhost:${config.app.port}`
        )).replace(/\/+$/, '');

        for (const asset of assetDefinitions) {
            if (!asset.storedPath.startsWith('/uploads/')) continue;
            let mailSafePath = asset.storedPath;
            if (path.extname(asset.storedPath).toLowerCase() !== '.png') {
                try {
                    const absoluteSourcePath = this.resolveAttachmentPath(asset.storedPath);
                    const parsedSourcePath = path.parse(absoluteSourcePath);
                    const absolutePngPath = path.join(parsedSourcePath.dir, `${parsedSourcePath.name}-email.png`);
                    await fs.access(absolutePngPath).catch(async () => {
                        await sharp(absoluteSourcePath, { density: 192 })
                            .rotate()
                            .resize({
                                width: asset.maxWidth * 2,
                                height: asset.maxHeight * 2,
                                fit: 'inside',
                                withoutEnlargement: true,
                            })
                            .png({ compressionLevel: 9 })
                            .toFile(absolutePngPath);
                    });
                    mailSafePath = `${asset.storedPath.slice(0, asset.storedPath.lastIndexOf('/') + 1)}${path.basename(absolutePngPath)}`;
                } catch {
                    continue;
                }
            }

            const publicUrl = `${publicApiOrigin}${mailSafePath}`;
            imageHtml.push(
                `<tr><td style="padding:8px 0 0 0;text-align:left"><img src="${publicUrl}" alt="${asset.alt}" width="${asset.maxWidth}" style="display:block;border:0;outline:none;text-decoration:none;width:auto;max-width:${asset.maxWidth}px;height:auto;max-height:${asset.maxHeight}px;margin:0" /></td></tr>`,
            );
        }

        if (!signatureText && imageHtml.length === 0) {
            return { html: '', text: '' };
        }

        const textHtml = signatureText
            ? `<tr><td style="padding:0;text-align:left;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#334155;white-space:pre-line">${this.escapeHtml(signatureText)}</td></tr>`
            : '';
        const plainText = signatureText ? `\n\n${signatureText}` : '';

        return {
            html: `<table data-zodo-mailbox-signature="true" role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:420px;margin-top:24px;border-collapse:collapse;border-top:1px solid #e2e8f0"><tbody><tr><td style="height:16px;line-height:16px;font-size:0">&nbsp;</td></tr>${textHtml}${imageHtml.join('')}</tbody></table>`,
            text: plainText,
        };
    }

    async getEmailById(id: string, tenantId: string, mailboxOwnerUserId: string) {
        const email = await emailsRepository.findById(id, tenantId, mailboxOwnerUserId);
        if (!email) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toEmailResponseDto(email);
    }

    async getEmails(tenantId: string, mailboxOwnerUserId: string, query: EmailQueryDto) {
        const { data, total } = await emailsRepository.findMany(tenantId, mailboxOwnerUserId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toEmailResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    private async buildUploadedAttachments(tenantId: string, files: Express.Multer.File[] = []) {
        return Promise.all(files.map(async (file) => ({
            filename: file.originalname,
            mimeType: file.mimetype || 'application/octet-stream',
            size: file.size,
            path: path.posix.join('/uploads', tenantId, 'emails', file.filename),
            content: await fs.readFile(file.path),
        })));
    }

    private async cleanupUploadedFiles(files: Express.Multer.File[] = []) {
        await Promise.all(files.map(async (file) => {
            try {
                await fs.unlink(file.path);
            } catch {
                // Ignore cleanup failures for temporary upload files.
            }
        }));
    }

    private resolveAttachmentPath(storedPath: string) {
        const relativePath = storedPath.startsWith('/uploads/')
            ? storedPath.replace(/^\/uploads\/?/, '')
            : storedPath.replace(/^\/+/, '');
        return path.resolve(config.upload.uploadPath, relativePath);
    }

    async getMailboxSettings(userId: string): Promise<MailboxSettingsResponseDto> {
        return mailboxRepository.getMailboxSettings(userId);
    }

    async updateMailboxSettings(userId: string, data: UpdateMailboxSettingsDto): Promise<MailboxSettingsResponseDto & { connectionTest?: { ok: boolean; error?: string }; syncResult?: { fetched: number; error: string | null } }> {
        const settings = await mailboxRepository.updateMailboxSettings(userId, data);
        const runtime = await mailboxRepository.getRuntimeConfig(userId);
        let connectionTest: { ok: boolean; error?: string } | undefined;
        let syncResult: { fetched: number; error: string | null } | undefined;
        if (data.smtp && runtime?.smtp.host && runtime.smtp.user && runtime.smtp.pass) {
            connectionTest = await mailerService.testSmtpConnection({
                host: runtime.smtp.host,
                port: runtime.smtp.port,
                user: runtime.smtp.user,
                pass: runtime.smtp.pass,
                encryption: runtime.smtp.encryption,
            });
        }
        if (data.imap && runtime?.imap.host && runtime.imap.user && runtime.imap.pass) {
            syncResult = await imapPoller.fetchForUser(userId);
        }
        return { ...settings, connectionTest, syncResult };
    }

    async getMailboxConfigStatus(userId: string): Promise<MailboxConfigStatusDto> {
        return mailboxRepository.getConfigStatus(userId);
    }

    async getLabels(tenantId: string) {
        const labels = await emailsRepository.listLabels(tenantId);
        return labels.map((label) => ({
            id: label.id,
            name: label.name,
            color: label.color ?? null,
        }));
    }

    async createLabel(tenantId: string, data: CreateEmailLabelDto) {
        const name = data.name.trim();
        if (!name) {
            throw new BadRequestError('Label name is required', ErrorCodes.INVALID_INPUT);
        }

        const label = await emailsRepository.createLabel(tenantId, name, data.color ?? null);
        return {
            id: label.id,
            name: label.name,
            color: label.color ?? null,
        };
    }

    private async getRequiredMailboxConfig(userId: string) {
        const mailboxConfig = await mailboxRepository.getRuntimeConfig(userId);

        if (!mailboxConfig) {
            throw new BadRequestError('Mailbox owner not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        return mailboxConfig;
    }

    async sendEmail(
        tenantId: string,
        mailboxOwnerUserId: string,
        data: SendEmailDto,
        actor?: { employeeId?: string; userId?: string },
        files: Express.Multer.File[] = [],
    ) {
        const mailboxConfig = await this.getRequiredMailboxConfig(mailboxOwnerUserId);
        if (mailboxConfig.tenantId !== tenantId) {
            await this.cleanupUploadedFiles(files);
            throw new BadRequestError('Mailbox does not belong to this workspace', ErrorCodes.INVALID_INPUT);
        }
        const smtpConfigured = Boolean(mailboxConfig.smtp.host && mailboxConfig.smtp.user && mailboxConfig.smtp.pass);

        if (!smtpConfigured) {
            await this.cleanupUploadedFiles(files);
            throw new BadRequestError(
                'Zodo Mail outgoing mail requires your personal SMTP settings. Open Settings > Email or Zodo Mail > My Mailbox to send from your own email.',
            );
        }

        const senderEmail = mailboxConfig.smtp.user;
        const replyTo = mailboxConfig.smtp.senderEmail && mailboxConfig.smtp.senderEmail !== mailboxConfig.smtp.user
            ? mailboxConfig.smtp.senderEmail
            : undefined;
        const senderName = mailboxConfig.smtp.senderName || 'ZODO CRM';

        const toAddresses = Array.isArray(data.toAddresses)
            ? data.toAddresses.map((a: any) => typeof a === 'string' ? a : a.email).filter(Boolean)
            : [];
        const ccAddresses = Array.isArray(data.ccAddresses)
            ? data.ccAddresses.map((a: any) => typeof a === 'string' ? a : a.email).filter(Boolean)
            : [];
        const bccAddresses = Array.isArray(data.bccAddresses)
            ? data.bccAddresses.map((a: any) => typeof a === 'string' ? a : a.email).filter(Boolean)
            : [];

        if (toAddresses.length === 0) {
            await this.cleanupUploadedFiles(files);
            throw new BadRequestError('At least one recipient email address is required');
        }

        const uploadedAttachments = await this.buildUploadedAttachments(tenantId, files);
        const mailboxSignature = await this.buildMailboxSignature(mailboxConfig.smtp);
        const bodyHtml = `${data.bodyHtml || data.bodyText || ''}${mailboxSignature.html}`;
        const bodyText = `${data.bodyText || ''}${mailboxSignature.text}`;

        const delivery = await mailerService.sendMailWithConfigDetailed(
            {
                host: mailboxConfig.smtp.host,
                port: mailboxConfig.smtp.port,
                user: mailboxConfig.smtp.user,
                pass: mailboxConfig.smtp.pass,
                encryption: mailboxConfig.smtp.encryption,
                senderName,
                senderEmail,
            },
            {
                to: toAddresses,
                cc: ccAddresses,
                bcc: bccAddresses,
                subject: data.subject,
                html: bodyHtml,
                text: bodyText || undefined,
                replyTo,
                attachments: uploadedAttachments.map((attachment) => ({
                    filename: attachment.filename,
                    content: attachment.content,
                    contentType: attachment.mimeType,
                })),
            },
        );

        if (!delivery.sent) {
            await this.cleanupUploadedFiles(files);
            const errorMessage = delivery.error || 'Check the configured SMTP username, password, host, and port.';
            const normalizedError = errorMessage.toLowerCase();

            if (
                normalizedError.includes('invalid login')
                || normalizedError.includes('authentication failed')
                || normalizedError.includes('535')
                || normalizedError.includes('username')
                || normalizedError.includes('password')
            ) {
                throw new BadRequestError(
                    `Your personal SMTP delivery failed because the configured mailbox credentials were rejected. Zodo Mail and quick-send both use the same mailbox configuration from Settings > Email / Zodo Mail > My Mailbox. ${errorMessage}`,
                );
            }

            throw new ServiceUnavailableError(
                `Your personal SMTP delivery failed. Zodo Mail and quick-send both use the same mailbox configuration from Settings > Email / Zodo Mail > My Mailbox. ${errorMessage}`,
            );
        }

        const email = await emailsRepository.send(tenantId, {
            ...data,
            bodyHtml,
            bodyText,
            messageId: delivery.messageId,
            fromName: senderName,
            fromAddress: senderEmail,
            attachments: uploadedAttachments.map(({ filename, mimeType, size, path: attachmentPath }) => ({
                filename,
                mimeType,
                size,
                path: attachmentPath,
            })),
        }, {
            sentByEmployeeId: actor?.employeeId,
            mailboxOwnerUserId,
        });
        const dto = toEmailResponseDto(email);

        activityLogger.log({
            tenantId, entityType: 'Email', entityId: dto.id,
            action: 'CREATE', module: 'emails',
            description: `Sent email "${data.subject || ''}"`,
            userId: actor?.userId,
            metadata: { toAddresses: data.toAddresses, subject: data.subject },
        });

        return dto;
    }

    async saveDraft(
        tenantId: string,
        mailboxOwnerUserId: string,
        data: SaveDraftDto,
        actor?: { employeeId?: string; userId?: string },
        files: Express.Multer.File[] = [],
    ) {
        const uploadedAttachments = await this.buildUploadedAttachments(tenantId, files);
        const draft = await emailsRepository.saveDraft(tenantId, {
            ...data,
            attachments: uploadedAttachments.map(({ filename, mimeType, size, path: attachmentPath }) => ({
                filename,
                mimeType,
                size,
                path: attachmentPath,
            })),
        }, {
            sentByEmployeeId: actor?.employeeId,
            mailboxOwnerUserId,
        });

        return toEmailResponseDto(draft);
    }

    async markAsRead(id: string, tenantId: string, mailboxOwnerUserId: string, isRead: boolean = true) {
        const existing = await emailsRepository.findById(id, tenantId, mailboxOwnerUserId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const email = await emailsRepository.updateReadStatus(id, tenantId, mailboxOwnerUserId, isRead);
        return toEmailResponseDto(email);
    }

    async toggleStar(id: string, tenantId: string, mailboxOwnerUserId: string, isStarred: boolean) {
        const existing = await emailsRepository.findById(id, tenantId, mailboxOwnerUserId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const email = await emailsRepository.toggleStar(id, tenantId, mailboxOwnerUserId, isStarred);
        return toEmailResponseDto(email);
    }

    async toggleImportant(id: string, tenantId: string, mailboxOwnerUserId: string, isImportant: boolean) {
        const existing = await emailsRepository.findById(id, tenantId, mailboxOwnerUserId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const email = await emailsRepository.toggleImportant(id, tenantId, mailboxOwnerUserId, Boolean(isImportant));
        return toEmailResponseDto(email);
    }

    async setLabels(id: string, tenantId: string, mailboxOwnerUserId: string, labelIds: string[]) {
        const existing = await emailsRepository.findById(id, tenantId, mailboxOwnerUserId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const email = await emailsRepository.setLabels(id, tenantId, mailboxOwnerUserId, labelIds);
        return toEmailResponseDto(email);
    }

    async snooze(id: string, tenantId: string, mailboxOwnerUserId: string, snoozedUntil?: string | null) {
        const existing = await emailsRepository.findById(id, tenantId, mailboxOwnerUserId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);

        let snoozeAt: Date | null = null;
        if (typeof snoozedUntil === 'string' && snoozedUntil.trim()) {
            const parsed = new Date(snoozedUntil);
            if (Number.isNaN(parsed.getTime())) {
                throw new BadRequestError('Invalid snooze date', ErrorCodes.INVALID_INPUT);
            }
            snoozeAt = parsed;
        }

        const email = await emailsRepository.snooze(id, tenantId, mailboxOwnerUserId, snoozeAt);
        return toEmailResponseDto(email);
    }

    async moveToFolder(id: string, tenantId: string, mailboxOwnerUserId: string, folder: EmailFolder) {
        const existing = await emailsRepository.findById(id, tenantId, mailboxOwnerUserId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const email = await emailsRepository.moveToFolder(id, tenantId, mailboxOwnerUserId, folder);
        return toEmailResponseDto(email);
    }

    async deleteEmail(id: string, tenantId: string, mailboxOwnerUserId: string, actorUserId?: string) {
        const existing = await emailsRepository.findById(id, tenantId, mailboxOwnerUserId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'Email', entityId: id,
            action: 'DELETE', module: 'emails',
            description: `Deleted email "${(existing as any).subject || id}"`,
            userId: actorUserId,
        });

        await emailsRepository.delete(id, tenantId, mailboxOwnerUserId);
    }

    async permanentlyDeleteEmail(id: string, tenantId: string, mailboxOwnerUserId: string, actorUserId?: string) {
        const existing = await emailsRepository.findById(id, tenantId, mailboxOwnerUserId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        if (existing.folder !== 'TRASH') {
            throw new BadRequestError('Move the email to Trash before deleting it permanently', ErrorCodes.INVALID_INPUT);
        }

        await Promise.allSettled((existing.attachments || []).map(async (attachment) => {
            try {
                await fs.unlink(this.resolveAttachmentPath(attachment.path));
            } catch {
                // Best-effort cleanup: attachment may already be gone.
            }
        }));

        activityLogger.log({
            tenantId, entityType: 'Email', entityId: id,
            action: 'DELETE', module: 'emails',
            description: `Permanently deleted email "${(existing as any).subject || id}"`,
            userId: actorUserId,
            metadata: { permanent: true },
        });

        await emailsRepository.permanentlyDelete(id, tenantId, mailboxOwnerUserId);
    }

    async sendDueScheduledDrafts() {
        const drafts = await emailsRepository.findScheduledDraftsDue();

        for (const draft of drafts) {
            try {
                const mailboxOwnerUserId = draft.mailboxOwnerUserId;
                if (!mailboxOwnerUserId) {
                    continue;
                }

                const mailboxConfig = await this.getRequiredMailboxConfig(mailboxOwnerUserId);
                const smtpConfigured = Boolean(mailboxConfig.smtp.host && mailboxConfig.smtp.user && mailboxConfig.smtp.pass);
                if (!smtpConfigured) {
                    continue;
                }

                const toAddresses = Array.isArray(draft.toAddresses)
                    ? draft.toAddresses.map((address: any) => typeof address === 'string' ? address : address.email).filter(Boolean)
                    : [];
                const ccAddresses = Array.isArray(draft.ccAddresses)
                    ? draft.ccAddresses.map((address: any) => typeof address === 'string' ? address : address.email).filter(Boolean)
                    : [];
                const bccAddresses = Array.isArray(draft.bccAddresses)
                    ? draft.bccAddresses.map((address: any) => typeof address === 'string' ? address : address.email).filter(Boolean)
                    : [];

                if (toAddresses.length === 0) {
                    continue;
                }

                const attachments = await Promise.all((draft.attachments || []).map(async (attachment) => ({
                    filename: attachment.filename,
                    contentType: attachment.mimeType,
                    content: await fs.readFile(this.resolveAttachmentPath(attachment.path)),
                })));

                const senderEmail = mailboxConfig.smtp.user;
                const replyTo = mailboxConfig.smtp.senderEmail && mailboxConfig.smtp.senderEmail !== mailboxConfig.smtp.user
                    ? mailboxConfig.smtp.senderEmail
                    : undefined;
                const senderName = mailboxConfig.smtp.senderName || 'ZODO CRM';
                const mailboxSignature = await this.buildMailboxSignature(mailboxConfig.smtp);
                const bodyHtml = `${draft.bodyHtml || draft.bodyText || ''}${mailboxSignature.html}`;
                const bodyText = `${draft.bodyText || ''}${mailboxSignature.text}`;

                const delivery = await mailerService.sendMailWithConfigDetailed(
                    {
                        host: mailboxConfig.smtp.host,
                        port: mailboxConfig.smtp.port,
                        user: mailboxConfig.smtp.user,
                        pass: mailboxConfig.smtp.pass,
                        encryption: mailboxConfig.smtp.encryption,
                        senderName,
                        senderEmail,
                    },
                    {
                        to: toAddresses,
                        cc: ccAddresses,
                        bcc: bccAddresses,
                        subject: draft.subject,
                        html: bodyHtml,
                        text: bodyText || undefined,
                        replyTo,
                        attachments,
                    },
                );

                if (!delivery.sent) {
                    continue;
                }

                await emailsRepository.markDraftSent(draft.id, {
                    fromName: senderName,
                    fromAddress: senderEmail,
                    sentAt: new Date(),
                    messageId: delivery.messageId,
                });
            } catch (error) {
                console.error('[EmailScheduler] Failed to send scheduled draft', draft.id, error);
            }
        }
    }
}

export const emailsService = new EmailsService();
