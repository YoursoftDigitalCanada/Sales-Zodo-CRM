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
        return prisma.leadInspection.update({
            where: { id: inspectionId },
            data: this.transformDates(data),
        });
    }

    /**
     * Delete an inspection
     */
    async delete(inspectionId: string, tenantId: string) {
        return prisma.leadInspection.delete({
            where: { id: inspectionId },
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
        return result;
    }
}

export const inspectionsRepository = new InspectionsRepository();
