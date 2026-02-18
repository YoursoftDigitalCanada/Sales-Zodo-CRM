import { PrismaClient, Prisma, ClientType, ClientStatus } from '@prisma/client';
import { CreateClientDto, UpdateClientDto, ClientQueryDto } from './clients.dto';

const prisma = new PrismaClient();
const clientInclude = {
    assignedOwner: { include: { user: { select: { firstName: true, lastName: true } } } },
    _count: { select: { contacts: true, projects: true } },
};

export class ClientsRepository {
    async create(tenantId: string, data: CreateClientDto) {
        return prisma.client.create({
            data: {
                tenantId,
                // Basic Information
                clientLogo: data.clientLogo,
                clientName: data.clientName,
                companyName: data.companyName,
                clientType: data.clientType || 'BUSINESS',
                primaryEmail: data.primaryEmail,
                primaryPhone: data.primaryPhone,
                status: data.status || 'ACTIVE',
                assignedOwnerId: data.assignedOwner,

                // Business & Tax Details
                gstHstNumber: data.gstHstNumber,
                pstQstNumber: data.pstQstNumber,
                businessStructure: data.businessStructure,
                corpRegistrationNumber: data.corpRegistrationNumber,

                // Billing Address
                streetAddress: data.streetAddress,
                suite: data.suite,
                city: data.city,
                province: data.province,
                postalCode: data.postalCode,
                country: data.country,

                // Internal Notes
                internalNotes: data.internalNotes,

                // Primary Contact
                contactName: data.contactName,
                position: data.position,
                directPhone: data.directPhone,

                // Financial Settings
                creditLimit: data.creditLimit,
                paymentTerms: data.paymentTerms,
                currency: data.currency || 'CAD',

                // Categorization
                leadSource: data.leadSource,
                clientCategory: data.clientCategory,
                tags: data.tags || [],
            },
            include: clientInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.client.findFirst({ where: { id, tenantId }, include: clientInclude });
    }

    async findMany(tenantId: string, query: ClientQueryDto) {
        const { page = 1, limit = 20, search, clientType, status, assignedOwner, clientCategory, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where: Prisma.ClientWhereInput = {
            tenantId,
            ...(clientType && { clientType }),
            ...(status && { status }),
            ...(assignedOwner && { assignedOwnerId: assignedOwner }),
            ...(clientCategory && { clientCategory }),
            ...(search && {
                OR: [
                    { clientName: { contains: search, mode: 'insensitive' as const } },
                    { companyName: { contains: search, mode: 'insensitive' as const } },
                    { primaryEmail: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.client.findMany({ where, include: clientInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.client.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, data: UpdateClientDto) {
        return prisma.client.update({
            where: { id },
            data: {
                // Basic Information
                ...(data.clientLogo !== undefined && { clientLogo: data.clientLogo }),
                ...(data.clientName !== undefined && { clientName: data.clientName }),
                ...(data.companyName !== undefined && { companyName: data.companyName }),
                ...(data.clientType !== undefined && { clientType: data.clientType }),
                ...(data.primaryEmail !== undefined && { primaryEmail: data.primaryEmail }),
                ...(data.primaryPhone !== undefined && { primaryPhone: data.primaryPhone }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.assignedOwner !== undefined && { assignedOwnerId: data.assignedOwner }),

                // Business & Tax Details
                ...(data.gstHstNumber !== undefined && { gstHstNumber: data.gstHstNumber }),
                ...(data.pstQstNumber !== undefined && { pstQstNumber: data.pstQstNumber }),
                ...(data.businessStructure !== undefined && { businessStructure: data.businessStructure }),
                ...(data.corpRegistrationNumber !== undefined && { corpRegistrationNumber: data.corpRegistrationNumber }),

                // Billing Address
                ...(data.streetAddress !== undefined && { streetAddress: data.streetAddress }),
                ...(data.suite !== undefined && { suite: data.suite }),
                ...(data.city !== undefined && { city: data.city }),
                ...(data.province !== undefined && { province: data.province }),
                ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
                ...(data.country !== undefined && { country: data.country }),

                // Internal Notes
                ...(data.internalNotes !== undefined && { internalNotes: data.internalNotes }),

                // Primary Contact
                ...(data.contactName !== undefined && { contactName: data.contactName }),
                ...(data.position !== undefined && { position: data.position }),
                ...(data.directPhone !== undefined && { directPhone: data.directPhone }),

                // Financial Settings
                ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }),
                ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
                ...(data.currency !== undefined && { currency: data.currency }),

                // Categorization
                ...(data.leadSource !== undefined && { leadSource: data.leadSource }),
                ...(data.clientCategory !== undefined && { clientCategory: data.clientCategory }),
                ...(data.tags !== undefined && { tags: data.tags }),
            },
            include: clientInclude,
        });
    }

    async delete(id: string) {
        return prisma.client.delete({ where: { id } });
    }
}

export const clientsRepository = new ClientsRepository();
