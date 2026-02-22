import { PrismaClient, Prisma, ContactType } from '@prisma/client';
import { CreateContactDto, UpdateContactDto, ContactQueryDto } from './contacts.dto';

const prisma = new PrismaClient();
const contactInclude = {
    company: { select: { id: true, clientName: true } },
};

export class ContactsRepository {
    async create(tenantId: string, data: CreateContactDto) {
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

    async findById(id: string, tenantId: string) {
        return prisma.contact.findFirst({ where: { id, tenantId }, include: contactInclude });
    }

    async findMany(tenantId: string, query: ContactQueryDto) {
        const { page = 1, limit = 20, search, companyId, type, isPrimaryContact, sortBy = 'contactName', sortOrder = 'asc' } = query;
        const where: Prisma.ContactWhereInput = {
            tenantId,
            ...(companyId && { companyId }),
            ...(type && { type }),
            ...(isPrimaryContact !== undefined && { isPrimaryContact }),
            ...(search && {
                OR: [
                    { contactName: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.contact.findMany({ where, include: contactInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.contact.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateContactDto) {
        // Verify tenant ownership
        const existing = await prisma.contact.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Contact not found or access denied');

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

    async delete(id: string, tenantId: string) {
        // Tenant-scoped delete
        const existing = await prisma.contact.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Contact not found or access denied');
        return prisma.contact.delete({ where: { id } });
    }
}

export const contactsRepository = new ContactsRepository();
