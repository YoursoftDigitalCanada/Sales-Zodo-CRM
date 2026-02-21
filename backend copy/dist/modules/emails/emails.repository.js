"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailsRepository = exports.EmailsRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class EmailsRepository {
    async createTemplate(tenantId, data) {
        return prisma.emailTemplate.create({
            data: {
                tenantId,
                name: data.name,
                subject: data.subject,
                body: data.body,
                type: data.type || 'CUSTOM',
                variables: data.variables || [],
                isActive: data.isActive ?? true,
            },
        });
    }
    async findTemplateById(id, tenantId) {
        return prisma.emailTemplate.findFirst({ where: { id, tenantId } });
    }
    async findTemplates(tenantId, query) {
        const { page = 1, limit = 20, search, type, isActive, sortBy = 'name', sortOrder = 'asc' } = query;
        const where = {
            tenantId,
            ...(type && { type }),
            ...(isActive !== undefined && { isActive }),
            ...(search && { name: { contains: search, mode: 'insensitive' } }),
        };
        const [data, total] = await Promise.all([
            prisma.emailTemplate.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.emailTemplate.count({ where }),
        ]);
        return { data, total };
    }
    async updateTemplate(id, data) {
        return prisma.emailTemplate.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.subject !== undefined && { subject: data.subject }),
                ...(data.body !== undefined && { body: data.body }),
                ...(data.type !== undefined && { type: data.type }),
                ...(data.variables !== undefined && { variables: data.variables }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });
    }
    async deleteTemplate(id) {
        return prisma.emailTemplate.delete({ where: { id } });
    }
}
exports.EmailsRepository = EmailsRepository;
exports.emailsRepository = new EmailsRepository();
//# sourceMappingURL=emails.repository.js.map