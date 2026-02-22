import { emailsRepository } from './emails.repository';
import { SendEmailDto, EmailQueryDto, toEmailResponseDto } from './emails.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';

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
        const email = await emailsRepository.send(tenantId, data, sentById);
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
