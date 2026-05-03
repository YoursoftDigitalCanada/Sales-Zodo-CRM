import { Prisma, ContactType } from '@prisma/client';
import { CreateContactDto, UpdateContactDto, ContactQueryDto } from './contacts.dto';
import { prisma } from '../../config/database';
const contactInclude = {
    company: { select: { id: true, clientName: true } },
    assignedTo: {
        select: {
            id: true,
            user: { select: { firstName: true, lastName: true, email: true } },
        },
    },
    deals: {
        include: { deal: { select: { id: true, name: true } } },
    },
};

export class ContactsRepository {
    async create(tenantId: string, data: CreateContactDto) {
        const { dealId, ...contactData } = data;
        return prisma.contact.create({
            data: {
                tenantId,
                contactName: contactData.contactName,
                companyId: contactData.companyId,
                type: contactData.type || 'CLIENT',
                jobTitle: contactData.jobTitle,
                department: contactData.department,
                email: contactData.email,
                officePhone: contactData.officePhone,
                mobilePhone: contactData.mobilePhone,
                linkedInUrl: contactData.linkedInUrl,
                isPrimaryContact: contactData.isPrimaryContact || false,
                firstName: contactData.firstName,
                lastName: contactData.lastName,
                relationshipStatus: contactData.relationshipStatus || 'Active',
                roleInBuyingProcess: contactData.roleInBuyingProcess,
                seniorityLevel: contactData.seniorityLevel,
                buyingAuthorityScore: contactData.buyingAuthorityScore,
                secondaryEmail: contactData.secondaryEmail,
                alternatePhone: contactData.alternatePhone,
                preferredContactMethod: contactData.preferredContactMethod,
                timeZone: contactData.timeZone,
                notes: contactData.notes,
                tags: contactData.tags || [],
                assignedToId: contactData.assignedToId,
                lastContactedAt: contactData.lastContactedAt ? new Date(contactData.lastContactedAt) : undefined,
                totalInteractions: contactData.totalInteractions || 0,
                lastActivityType: contactData.lastActivityType,
                ...(dealId
                    ? {
                        deals: {
                            create: {
                                tenantId,
                                dealId,
                                role: contactData.roleInBuyingProcess || undefined,
                                isPrimary: contactData.roleInBuyingProcess === 'Decision Maker',
                            },
                        },
                    }
                    : {}),
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
            where: { id_tenantId: { id, tenantId } },
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
                ...(data.firstName !== undefined && { firstName: data.firstName }),
                ...(data.lastName !== undefined && { lastName: data.lastName }),
                ...(data.relationshipStatus !== undefined && { relationshipStatus: data.relationshipStatus }),
                ...(data.roleInBuyingProcess !== undefined && { roleInBuyingProcess: data.roleInBuyingProcess }),
                ...(data.seniorityLevel !== undefined && { seniorityLevel: data.seniorityLevel }),
                ...(data.buyingAuthorityScore !== undefined && { buyingAuthorityScore: data.buyingAuthorityScore }),
                ...(data.secondaryEmail !== undefined && { secondaryEmail: data.secondaryEmail }),
                ...(data.alternatePhone !== undefined && { alternatePhone: data.alternatePhone }),
                ...(data.preferredContactMethod !== undefined && { preferredContactMethod: data.preferredContactMethod }),
                ...(data.timeZone !== undefined && { timeZone: data.timeZone }),
                ...(data.notes !== undefined && { notes: data.notes }),
                ...(data.tags !== undefined && { tags: data.tags }),
                ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
                ...(data.lastContactedAt !== undefined && { lastContactedAt: data.lastContactedAt ? new Date(data.lastContactedAt) : null }),
                ...(data.totalInteractions !== undefined && { totalInteractions: data.totalInteractions }),
                ...(data.lastActivityType !== undefined && { lastActivityType: data.lastActivityType }),
            },
            include: contactInclude,
        });
    }

    async linkDeal(tenantId: string, contactId: string, dealId: string, role?: string | null) {
        await prisma.contactDeal.upsert({
            where: { contactId_dealId: { contactId, dealId } },
            create: {
                tenantId,
                contactId,
                dealId,
                role: role || null,
                isPrimary: role === 'Decision Maker',
            },
            update: {
                role: role || undefined,
                isPrimary: role === 'Decision Maker' ? true : undefined,
            },
        });
    }

    async delete(id: string, tenantId: string) {
        // Tenant-scoped delete
        const existing = await prisma.contact.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Contact not found or access denied');
        return prisma.contact.delete({ where: { id_tenantId: { id, tenantId } } });
    }
}

export const contactsRepository = new ContactsRepository();
