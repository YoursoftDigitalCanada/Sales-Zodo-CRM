"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailsService = exports.EmailsService = void 0;
const emails_repository_1 = require("./emails.repository");
const emails_dto_1 = require("./emails.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class EmailsService {
    async createTemplate(tenantId, data) {
        const template = await emails_repository_1.emailsRepository.createTemplate(tenantId, data);
        return (0, emails_dto_1.toEmailTemplateResponseDto)(template);
    }
    async getTemplateById(id, tenantId) {
        const template = await emails_repository_1.emailsRepository.findTemplateById(id, tenantId);
        if (!template)
            throw new HttpErrors_1.NotFoundError('Email template not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        return (0, emails_dto_1.toEmailTemplateResponseDto)(template);
    }
    async getTemplates(tenantId, query) {
        const { data, total } = await emails_repository_1.emailsRepository.findTemplates(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(emails_dto_1.toEmailTemplateResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
    async updateTemplate(id, tenantId, data) {
        const existing = await emails_repository_1.emailsRepository.findTemplateById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Email template not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const template = await emails_repository_1.emailsRepository.updateTemplate(id, data);
        return (0, emails_dto_1.toEmailTemplateResponseDto)(template);
    }
    async deleteTemplate(id, tenantId) {
        const existing = await emails_repository_1.emailsRepository.findTemplateById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Email template not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await emails_repository_1.emailsRepository.deleteTemplate(id);
    }
    async sendEmail(tenantId, data) {
        // In production, integrate with email service (SendGrid, SES, etc.)
        // For now, just log and return success
        console.log(`[Email] Sending to ${data.to.join(', ')}: ${data.subject}`);
        return { success: true, message: 'Email queued for delivery', recipients: data.to };
    }
}
exports.EmailsService = EmailsService;
exports.emailsService = new EmailsService();
//# sourceMappingURL=emails.service.js.map