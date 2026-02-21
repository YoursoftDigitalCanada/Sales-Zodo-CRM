"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactsRepository = exports.ContactsRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const contactInclude = {
    company: { select: { id: true, clientName: true } },
};
class ContactsRepository {
    async create(tenantId, data) {
        return prisma.contact.create({
            data: {
                tenantId,
                contactName: data.contactName,
                companyId: data.companyId,
                type: data.type || 'CLIENT',
                jobTitle: data.jobTitle,
                department: data.department,
                email: data.email,
                officePhone: data.officePhone,
                mobilePhone: data.mobilePhone,
                linkedInUrl: data.linkedInUrl,
                isPrimaryContact: data.isPrimaryContact || false,
            },
            include: contactInclude,
        });
    }
    async findById(id, tenantId) {
        return prisma.contact.findFirst({ where: { id, tenantId }, include: contactInclude });
    }
    async findMany(tenantId, query) {
        const { page = 1, limit = 20, search, companyId, type, isPrimaryContact, sortBy = 'contactName', sortOrder = 'asc' } = query;
        const where = {
            tenantId,
            ...(companyId && { companyId }),
            ...(type && { type }),
            ...(isPrimaryContact !== undefined && { isPrimaryContact }),
            ...(search && {
                OR: [
                    { contactName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.contact.findMany({ where, include: contactInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.contact.count({ where }),
        ]);
        return { data, total };
    }
    async update(id, data) {
        return prisma.contact.update({
            where: { id },
            data: {
                ...(data.contactName !== undefined && { contactName: data.contactName }),
                ...(data.companyId !== undefined && { companyId: data.companyId }),
                ...(data.type !== undefined && { type: data.type }),
                ...(data.jobTitle !== undefined && { jobTitle: data.jobTitle }),
                ...(data.department !== undefined && { department: data.department }),
                ...(data.email !== undefined && { email: data.email }),
                ...(data.officePhone !== undefined && { officePhone: data.officePhone }),
                ...(data.mobilePhone !== undefined && { mobilePhone: data.mobilePhone }),
                ...(data.linkedInUrl !== undefined && { linkedInUrl: data.linkedInUrl }),
                ...(data.isPrimaryContact !== undefined && { isPrimaryContact: data.isPrimaryContact }),
            },
            include: contactInclude,
        });
    }
    async delete(id) {
        return prisma.contact.delete({ where: { id } });
    }
}
exports.ContactsRepository = ContactsRepository;
exports.contactsRepository = new ContactsRepository();
//# sourceMappingURL=contacts.repository.js.map