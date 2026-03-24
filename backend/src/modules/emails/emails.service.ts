import { emailsRepository } from './emails.repository';
import { EmailFolder } from '@prisma/client';
import { SendEmailDto, EmailQueryDto, toEmailResponseDto } from './emails.dto';
import { BadRequestError, NotFoundError, ServiceUnavailableError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { mailerService } from '../../common/services/mailer.service';
import { settingsRepository } from '../settings/settings.repository';
import fs from 'fs/promises';
import path from 'path';

export class EmailsService {
    async getEmailById(id: string, tenantId: string) {
        const email = await emailsRepository.findById(id, tenantId);
        if (!email) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toEmailResponseDto(email);
    }

    async getEmails(tenantId: string, query: EmailQueryDto) {
        const { data, total } = await emailsRepository.findMany(tenantId, query);
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

    async sendEmail(tenantId: string, data: SendEmailDto, sentById?: string, files: Express.Multer.File[] = []) {
        const smtpConfig = await settingsRepository.getSmtpConfig(tenantId);
        const smtpConfigured = Boolean(smtpConfig?.host && smtpConfig?.user && smtpConfig?.pass);

        if (!smtpConfigured) {
            await this.cleanupUploadedFiles(files);
            throw new BadRequestError(
                'Letter Box outgoing mail requires workspace SMTP settings. Configure Settings > Email > SMTP to send from your own mailbox.',
            );
        }

        const senderEmail = smtpConfig.senderEmail || smtpConfig.user;
        const senderName = smtpConfig.senderName || 'ZODO CRM';

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
                host: smtpConfig.host,
                port: smtpConfig.port,
                user: smtpConfig.user,
                pass: smtpConfig.pass,
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
                    `Workspace SMTP delivery failed because the configured mailbox credentials were rejected. Letter Box did not fall back to the OTP mailbox. ${errorMessage}`,
                );
            }

            throw new ServiceUnavailableError(
                `Workspace SMTP delivery failed. Letter Box did not fall back to the OTP mailbox. ${errorMessage}`,
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
        }, sentById);
        const dto = toEmailResponseDto(email);

        activityLogger.log({
            tenantId, entityType: 'Email', entityId: dto.id,
            action: 'CREATE', module: 'emails',
            description: `Sent email "${data.subject || ''}"`,
            userId: sentById,
            metadata: { toAddresses: data.toAddresses, subject: data.subject },
        });

        return dto;
    }

    async markAsRead(id: string, tenantId: string) {
        const existing = await emailsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const email = await emailsRepository.markAsRead(id, tenantId);
        return toEmailResponseDto(email);
    }

    async toggleStar(id: string, tenantId: string, isStarred: boolean) {
        const existing = await emailsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const email = await emailsRepository.toggleStar(id, tenantId, isStarred);
        return toEmailResponseDto(email);
    }

    async moveToFolder(id: string, tenantId: string, folder: EmailFolder) {
        const existing = await emailsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const email = await emailsRepository.moveToFolder(id, tenantId, folder);
        return toEmailResponseDto(email);
    }

    async deleteEmail(id: string, tenantId: string) {
        const existing = await emailsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'Email', entityId: id,
            action: 'DELETE', module: 'emails',
            description: `Deleted email "${(existing as any).subject || id}"`,
        });

        await emailsRepository.delete(id, tenantId);
    }
}

export const emailsService = new EmailsService();
