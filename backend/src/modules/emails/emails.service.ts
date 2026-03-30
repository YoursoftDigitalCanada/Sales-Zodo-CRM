import { emailsRepository } from './emails.repository';
import { EmailFolder } from '@prisma/client';
import {
    SendEmailDto,
    EmailQueryDto,
    MailboxConfigStatusDto,
    MailboxSettingsResponseDto,
    UpdateMailboxSettingsDto,
    toEmailResponseDto,
} from './emails.dto';
import { BadRequestError, NotFoundError, ServiceUnavailableError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { mailerService } from '../../common/services/mailer.service';
import { mailboxRepository } from './mailbox.repository';
import fs from 'fs/promises';
import path from 'path';

export class EmailsService {
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

    async getMailboxSettings(userId: string): Promise<MailboxSettingsResponseDto> {
        return mailboxRepository.getMailboxSettings(userId);
    }

    async updateMailboxSettings(userId: string, data: UpdateMailboxSettingsDto): Promise<MailboxSettingsResponseDto> {
        return mailboxRepository.updateMailboxSettings(userId, data);
    }

    async getMailboxConfigStatus(userId: string): Promise<MailboxConfigStatusDto> {
        return mailboxRepository.getConfigStatus(userId);
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
                'Letter Box outgoing mail requires your personal SMTP settings. Open Settings > Email or Letter Box > My Mailbox to send from your own email.',
            );
        }

        const senderEmail = mailboxConfig.smtp.senderEmail || mailboxConfig.smtp.user;
        const senderName = mailboxConfig.smtp.senderName || 'ZODO CRM';

        const toAddresses = Array.isArray(data.toAddresses)
            ? data.toAddresses.map((a: any) => typeof a === 'string' ? a : a.email).filter(Boolean)
            : [];

        if (toAddresses.length === 0) {
            await this.cleanupUploadedFiles(files);
            throw new BadRequestError('At least one recipient email address is required');
        }

        const uploadedAttachments = await this.buildUploadedAttachments(tenantId, files);

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
                subject: data.subject,
                html: data.bodyHtml || data.bodyText || '',
                text: data.bodyText,
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
                    `Your personal SMTP delivery failed because the configured mailbox credentials were rejected. Letter Box and quick-send both use the same mailbox configuration from Settings > Email / Letter Box > My Mailbox. ${errorMessage}`,
                );
            }

            throw new ServiceUnavailableError(
                `Your personal SMTP delivery failed. Letter Box and quick-send both use the same mailbox configuration from Settings > Email / Letter Box > My Mailbox. ${errorMessage}`,
            );
        }

        const email = await emailsRepository.send(tenantId, {
            ...data,
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

    async markAsRead(id: string, tenantId: string, mailboxOwnerUserId: string) {
        const existing = await emailsRepository.findById(id, tenantId, mailboxOwnerUserId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const email = await emailsRepository.markAsRead(id, tenantId, mailboxOwnerUserId);
        return toEmailResponseDto(email);
    }

    async toggleStar(id: string, tenantId: string, mailboxOwnerUserId: string, isStarred: boolean) {
        const existing = await emailsRepository.findById(id, tenantId, mailboxOwnerUserId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const email = await emailsRepository.toggleStar(id, tenantId, mailboxOwnerUserId, isStarred);
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
}

export const emailsService = new EmailsService();
