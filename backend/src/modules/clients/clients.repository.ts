import { Prisma, ClientType, ClientStatus } from '@prisma/client';
import { CreateClientDto, UpdateClientDto, ClientQueryDto } from './clients.dto';
import { DataAccessContext, buildClientAccessWhere, mergeWhereWithAccess } from '../../common/access/data-access';
import { prisma } from '../../config/database';
const clientInclude = {
    assignedOwner: { include: { user: { select: { firstName: true, lastName: true } } } },
    contacts: { where: { isPrimaryContact: true }, take: 1, select: { contactName: true, email: true, mobilePhone: true } },
    invoices: { select: { status: true, total: true } },
    _count: { select: { contacts: true, projects: true, invoices: true, quotes: true, files: true } },
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
                lifecycleStage: data.lifecycleStage || 'PROSPECT',
                assignedOwnerId: data.assignedOwner,
                website: data.website,
                noOfEmployees: data.noOfEmployees || '1-10',
                annualRevenue: data.annualRevenue,
                exchangeRate: data.exchangeRate ?? 1,
                industry: data.industry,
                territory: data.territory,
                organizationAddress: data.organizationAddress,

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

                // Sales account preferences
                preferredContactMethod: data.preferredContactMethod,
                bestTimeToContact: data.bestTimeToContact,

                // Secondary Contact
                secondaryPhone: data.secondaryPhone,

                // Extended
                budgetRange: data.budgetRange,
                urgencyLevel: data.urgencyLevel,
                language: data.language,
            },
            include: clientInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.client.findFirst({ where: { id, tenantId }, include: clientInclude });
    }

    async findMany(tenantId: string, query: ClientQueryDto, dataAccess?: DataAccessContext) {
        const { page = 1, limit = 20, search, clientType, status, assignedOwner, clientCategory, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const baseWhere: Prisma.ClientWhereInput = {
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
                    { website: { contains: search, mode: 'insensitive' as const } },
                    { industry: { contains: search, mode: 'insensitive' as const } },
                    { territory: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };
        const where = mergeWhereWithAccess(baseWhere, buildClientAccessWhere(dataAccess));
        const [data, total] = await Promise.all([
            prisma.client.findMany({ where, include: clientInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.client.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateClientDto) {
        // Verify tenant ownership
        const existing = await prisma.client.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Organization not found or access denied');

        return prisma.client.update({
            where: { id_tenantId: { id, tenantId } },
            data: {
                // Basic Information
                ...(data.clientLogo !== undefined && { clientLogo: data.clientLogo }),
                ...(data.clientName !== undefined && { clientName: data.clientName }),
                ...(data.companyName !== undefined && { companyName: data.companyName }),
                ...(data.clientType !== undefined && { clientType: data.clientType }),
                ...(data.primaryEmail !== undefined && { primaryEmail: data.primaryEmail }),
                ...(data.primaryPhone !== undefined && { primaryPhone: data.primaryPhone }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.lifecycleStage !== undefined && { lifecycleStage: data.lifecycleStage }),
                ...(data.assignedOwner !== undefined && { assignedOwnerId: data.assignedOwner }),
                ...(data.website !== undefined && { website: data.website }),
                ...(data.noOfEmployees !== undefined && { noOfEmployees: data.noOfEmployees }),
                ...(data.annualRevenue !== undefined && { annualRevenue: data.annualRevenue }),
                ...(data.exchangeRate !== undefined && { exchangeRate: data.exchangeRate }),
                ...(data.industry !== undefined && { industry: data.industry }),
                ...(data.territory !== undefined && { territory: data.territory }),
                ...(data.organizationAddress !== undefined && { organizationAddress: data.organizationAddress }),

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

                // Sales account preferences
                ...(data.preferredContactMethod !== undefined && { preferredContactMethod: data.preferredContactMethod }),
                ...(data.bestTimeToContact !== undefined && { bestTimeToContact: data.bestTimeToContact }),

                // Secondary Contact
                ...(data.secondaryPhone !== undefined && { secondaryPhone: data.secondaryPhone }),

                // Extended
                ...(data.budgetRange !== undefined && { budgetRange: data.budgetRange }),
                ...(data.urgencyLevel !== undefined && { urgencyLevel: data.urgencyLevel }),
                ...(data.doNotContact !== undefined && { doNotContact: data.doNotContact }),
                ...(data.nextFollowUp !== undefined && { nextFollowUp: data.nextFollowUp }),
                ...(data.language !== undefined && { language: data.language }),
            },
            include: clientInclude,
        });
    }

    async delete(id: string, tenantId: string) {
        // Tenant-scoped delete
        const existing = await prisma.client.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Organization not found or access denied');
        return prisma.client.delete({ where: { id_tenantId: { id, tenantId } } });
    }
}

export const clientsRepository = new ClientsRepository();
