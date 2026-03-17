import { emailsRepository } from './emails.repository';
import { SendEmailDto, EmailQueryDto, toEmailResponseDto } from './emails.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { mailerService } from '../../common/services/mailer.service';
import { settingsRepository } from '../settings/settings.repository';

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

    async sendEmail(tenantId: string, data: SendEmailDto, sentById?: string) {
        // 1. Get tenant SMTP config
        const smtpConfig = await settingsRepository.getSmtpConfig(tenantId);

        // 2. Determine sender address
        const senderEmail = smtpConfig?.senderEmail || smtpConfig?.user || '';
        const senderName = smtpConfig?.senderName || 'ZODO CRM';

        // 3. Save the email record in DB
        const email = await emailsRepository.send(tenantId, {
            ...data,
            fromAddress: senderEmail,
        }, sentById);
        const dto = toEmailResponseDto(email);

        // 4. Actually deliver the email via SMTP
        const toAddresses = Array.isArray(data.toAddresses)
            ? data.toAddresses.map((a: any) => typeof a === 'string' ? a : a.email).filter(Boolean)
            : [];

        if (toAddresses.length > 0) {
            let sent = false;

            // Try tenant-specific SMTP first
            if (smtpConfig && smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
                sent = await mailerService.sendMailWithConfig(
                    { host: smtpConfig.host, port: smtpConfig.port, user: smtpConfig.user, pass: smtpConfig.pass, senderName, senderEmail },
                    { to: toAddresses, subject: data.subject, html: data.bodyHtml || data.bodyText || '', text: data.bodyText }
                );
            }

            // Fallback to global SMTP (env vars)
            if (!sent) {
                sent = await mailerService.sendMail({
                    to: toAddresses,
                    subject: data.subject,
                    html: data.bodyHtml || data.bodyText || '',
                    text: data.bodyText,
                });
            }

            // Update status based on delivery result
            if (!sent) {
                console.warn(`⚠️ Email ${dto.id} saved but SMTP delivery failed — no SMTP configured or connection error`);
            }
        }

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
