import { prisma } from '../../config/database';
import { CreateLeadInspectionDto, UpdateLeadInspectionDto } from './inspections.dto';
import type { DataAccessContext } from '../../common/access/data-access';
import { buildLeadAccessWhere } from '../../common/access/data-access';

export class InspectionsRepository {
    /**
     * Create a new inspection for a lead
     */
    async create(leadId: string, tenantId: string, data: CreateLeadInspectionDto, createdById?: string) {
        return prisma.leadInspection.create({
            data: {
                leadId,
                tenantId,
                createdById: createdById || null,
                ...this.transformDates(data),
            },
        });
    }

    /**
     * Get all inspections across all leads for a tenant
     */
    async findAll(tenantId: string, dataAccess?: DataAccessContext) {
        const leadAccessWhere = buildLeadAccessWhere(dataAccess);

        return prisma.leadInspection.findMany({
            where: {
                tenantId,
                ...(Object.keys(leadAccessWhere).length > 0
                    ? {
                        lead: leadAccessWhere,
                    }
                    : {}),
            },
            include: {
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
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get all inspections for a lead
     */
    async findByLeadId(leadId: string, tenantId: string) {
        return prisma.leadInspection.findMany({
            where: { leadId, tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get a specific inspection by ID
     */
    async findById(inspectionId: string, tenantId: string) {
        return prisma.leadInspection.findFirst({
            where: { id: inspectionId, tenantId },
        });
    }

    /**
     * Update an inspection
     */
    async update(inspectionId: string, tenantId: string, data: UpdateLeadInspectionDto) {
        const existing = await prisma.leadInspection.findFirst({
            where: { id: inspectionId, tenantId },
            select: { id: true },
        });
        if (!existing) throw new Error('Inspection not found or access denied');

        return prisma.leadInspection.update({
            where: { id_tenantId: { id: inspectionId, tenantId } },
            data: this.transformDates(data),
        });
    }

    /**
     * Delete an inspection
     */
    async delete(inspectionId: string, tenantId: string) {
        const existing = await prisma.leadInspection.findFirst({
            where: { id: inspectionId, tenantId },
            select: { id: true },
        });
        if (!existing) throw new Error('Inspection not found or access denied');

        return prisma.leadInspection.delete({
            where: { id_tenantId: { id: inspectionId, tenantId } },
        });
    }

    /**
     * Transform date strings to Date objects for Prisma
     */
    private transformDates(data: any): Record<string, any> {
        const result = { ...data };
        const dateFields = [
            'inspectionDate', 'tentativeStartDate', 'materialsDeliveryDate', 'dumpsterDeliveryDate',
        ];
        for (const field of dateFields) {
            if (result[field] && typeof result[field] === 'string') {
                result[field] = new Date(result[field]);
            }
        }
        if (Array.isArray(result.photoFileIds)) {
            result.photoFileIds = result.photoFileIds.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0);
            result.photosTakenCount = result.photoFileIds.length;
        }
        return result;
    }
}

export const inspectionsRepository = new InspectionsRepository();
