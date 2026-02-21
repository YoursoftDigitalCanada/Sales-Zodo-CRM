import { emailsRepository } from './emails.repository';
import { SendEmailDto, EmailQueryDto, toEmailResponseDto } from './emails.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

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
        return toEmailResponseDto(email);
    }

    async markAsRead(id: string, tenantId: string) {
        const existing = await emailsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const email = await emailsRepository.markAsRead(id);
        return toEmailResponseDto(email);
    }

    async deleteEmail(id: string, tenantId: string) {
        const existing = await emailsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Email not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await emailsRepository.delete(id);
    }
}

export const emailsService = new EmailsService();
