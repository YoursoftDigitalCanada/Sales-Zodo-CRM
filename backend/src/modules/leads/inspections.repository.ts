import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { CreateLeadInspectionDto, UpdateLeadInspectionDto } from './inspections.dto';
import type { DataAccessContext } from '../../common/access/data-access';
import {
    buildClientAccessWhere,
    buildLeadAccessWhere,
    mergeWhereWithAccess,
} from '../../common/access/data-access';

const inspectionInclude = {
    lead: {
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            propertyAddress: true,
            city: true,
            state: true,
            zipCode: true,
            companyName: true,
            isInsuranceClaim: true,
            insuranceCompanyName: true,
            claimNumber: true,
        },
    },
    client: {
        select: {
            id: true,
            clientName: true,
            companyName: true,
            primaryEmail: true,
            primaryPhone: true,
            streetAddress: true,
            city: true,
            province: true,
            postalCode: true,
            insuranceCompanyName: true,
        },
    },
} satisfies Prisma.LeadInspectionInclude;

interface InspectionListFilters {
    leadId?: string;
    clientId?: string;
}

export class InspectionsRepository {
    async create(tenantId: string, data: CreateLeadInspectionDto, createdById?: string) {
        const { leadId, clientId, manualClient: _manualClient, ...inspectionData } = data;

        return prisma.leadInspection.create({
            data: {
                tenantId,
                createdById: createdById || null,
                leadId: leadId || null,
                clientId: clientId || null,
                ...this.transformDates(inspectionData),
            },
            include: inspectionInclude,
        });
    }

    async findAll(tenantId: string, dataAccess?: DataAccessContext, filters: InspectionListFilters = {}) {
        const baseWhere: Prisma.LeadInspectionWhereInput = {
            tenantId,
            ...(filters.leadId ? { leadId: filters.leadId } : {}),
            ...(filters.clientId ? { clientId: filters.clientId } : {}),
        };

        const where = mergeWhereWithAccess(baseWhere, this.buildAccessWhere(dataAccess));

        return prisma.leadInspection.findMany({
            where,
            include: inspectionInclude,
            orderBy: { createdAt: 'desc' },
        });
    }

    async findByLeadId(leadId: string, tenantId: string, dataAccess?: DataAccessContext) {
        const where = mergeWhereWithAccess(
            { leadId, tenantId } satisfies Prisma.LeadInspectionWhereInput,
            this.buildAccessWhere(dataAccess),
        );

        return prisma.leadInspection.findMany({
            where,
            include: inspectionInclude,
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(inspectionId: string, tenantId: string, dataAccess?: DataAccessContext) {
        const where = mergeWhereWithAccess(
            { id: inspectionId, tenantId } satisfies Prisma.LeadInspectionWhereInput,
            this.buildAccessWhere(dataAccess),
        );

        return prisma.leadInspection.findFirst({
            where,
            include: inspectionInclude,
        });
    }

    async update(inspectionId: string, tenantId: string, data: UpdateLeadInspectionDto, dataAccess?: DataAccessContext) {
        const existing = await this.findById(inspectionId, tenantId, dataAccess);
        if (!existing) throw new Error('Inspection not found or access denied');

        return prisma.leadInspection.update({
            where: { id_tenantId: { id: inspectionId, tenantId } },
            data: this.transformDates(data),
            include: inspectionInclude,
        });
    }

    async delete(inspectionId: string, tenantId: string, dataAccess?: DataAccessContext) {
        const existing = await this.findById(inspectionId, tenantId, dataAccess);
        if (!existing) throw new Error('Inspection not found or access denied');

        return prisma.leadInspection.delete({
            where: { id_tenantId: { id: inspectionId, tenantId } },
        });
    }

    private buildAccessWhere(dataAccess?: DataAccessContext): Prisma.LeadInspectionWhereInput | undefined {
        if (!dataAccess) {
            return undefined;
        }

        const leadAccessWhere = buildLeadAccessWhere(dataAccess);
        const clientAccessWhere = buildClientAccessWhere(dataAccess);
        const orConditions: Prisma.LeadInspectionWhereInput[] = [];

        if (Object.keys(leadAccessWhere).length > 0) {
            orConditions.push({ lead: leadAccessWhere });
        }

        if (Object.keys(clientAccessWhere).length > 0) {
            orConditions.push({ client: clientAccessWhere });
        }

        if (dataAccess.hasFullAccess) {
            return undefined;
        }

        if (orConditions.length === 0) {
            return { id: '__no_access__' };
        }

        return { OR: orConditions };
    }

    private transformDates(data: Record<string, unknown>): Record<string, unknown> {
        const result = { ...data };
        const dateFields = [
            'inspectionDate',
            'tentativeStartDate',
            'materialsDeliveryDate',
            'dumpsterDeliveryDate',
        ];

        for (const field of dateFields) {
            if (result[field] && typeof result[field] === 'string') {
                result[field] = new Date(result[field] as string);
            }
        }

        if (Array.isArray(result.photoFileIds)) {
            result.photoFileIds = result.photoFileIds.filter(
                (value: unknown): value is string => typeof value === 'string' && value.length > 0,
            );
            result.photosTakenCount = (result.photoFileIds as string[]).length;
        }

        return result;
    }
}

export const inspectionsRepository = new InspectionsRepository();
