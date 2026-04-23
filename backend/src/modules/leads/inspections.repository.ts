import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { CreateLeadInspectionDto, UpdateLeadInspectionDto } from './inspections.dto';
import type { DataAccessContext } from '../../common/access/data-access';
import {
    buildClientAccessWhere,
    buildLeadAccessWhere,
    mergeWhereWithAccess,
} from '../../common/access/data-access';

const leadSelect = {
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
} satisfies Prisma.LeadSelect;

const clientSelect = {
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
} satisfies Prisma.ClientSelect;

const baseInspectionSelect = {
    id: true,
    leadId: true,
    tenantId: true,
    inspectionDate: true,
    inspectorName: true,
    inspectionType: true,
    weatherConditions: true,
    accessMethod: true,
    overallCondition: true,
    roofStyle: true,
    roofPitch: true,
    totalSquares: true,
    ridgeLength: true,
    valleyLength: true,
    eaveLength: true,
    rakeLength: true,
    numberOfLayers: true,
    deckingType: true,
    deckingCondition: true,
    underlaymentType: true,
    ventilationType: true,
    ventilationCount: true,
    flashingCondition: true,
    gutterCondition: true,
    skylightCount: true,
    skylightCondition: true,
    chimneyPresent: true,
    chimneyCondition: true,
    soffitFasciaCondition: true,
    dripEdgePresent: true,
    dripEdgeCondition: true,
    iceWaterShieldPresent: true,
    stormDamageFound: true,
    windDamageDetails: true,
    hailDamageDetails: true,
    hailSizeFound: true,
    testSquareResults: true,
    interiorDamageFound: true,
    interiorDamageDetails: true,
    photosTakenCount: true,
    photoFileIds: true,
    overallDamageRating: true,
    proposedMaterial: true,
    shingleBrand: true,
    shingleLine: true,
    shingleColor: true,
    underlaymentChoice: true,
    ridgeCapType: true,
    ventilationPlan: true,
    dripEdgeColor: true,
    warrantyType: true,
    warrantyYears: true,
    materialCost: true,
    laborCost: true,
    tearOffCost: true,
    permitCost: true,
    dumpsterCost: true,
    miscCost: true,
    subtotal: true,
    overheadPercent: true,
    profitPercent: true,
    totalEstimate: true,
    customerPrice: true,
    depositRequired: true,
    depositCollected: true,
    paymentMethod: true,
    estimateStatus: true,
    tentativeStartDate: true,
    estimatedDuration: true,
    crewSize: true,
    crewLeadName: true,
    materialsOrdered: true,
    materialsDeliveryDate: true,
    permitPulled: true,
    permitNumber: true,
    dumpsterOrdered: true,
    dumpsterDeliveryDate: true,
    inspectorNotes: true,
    customerFeedback: true,
    internalNotes: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
    lead: {
        select: leadSelect,
    },
} satisfies Prisma.LeadInspectionSelect;

interface InspectionListFilters {
    leadId?: string;
    clientId?: string;
}

export class InspectionsRepository {
    private supportsClientLinkPromise: Promise<boolean> | null = null;

    async create(tenantId: string, data: CreateLeadInspectionDto, createdById?: string) {
        const supportsClientLink = await this.supportsClientLink();
        const { leadId, clientId, manualClient: _manualClient, ...inspectionData } = data;

        return prisma.leadInspection.create({
            data: {
                tenantId,
                createdById: createdById || null,
                leadId: leadId || null,
                ...(supportsClientLink ? { clientId: clientId || null } : {}),
                ...this.transformDates(inspectionData),
            },
            select: this.buildInspectionSelect(supportsClientLink),
        });
    }

    async findAll(tenantId: string, dataAccess?: DataAccessContext, filters: InspectionListFilters = {}) {
        const supportsClientLink = await this.supportsClientLink();
        const baseWhere: Prisma.LeadInspectionWhereInput = {
            tenantId,
            ...(filters.leadId ? { leadId: filters.leadId } : {}),
            ...(supportsClientLink && filters.clientId ? { clientId: filters.clientId } : {}),
        };

        const where = mergeWhereWithAccess(baseWhere, await this.buildAccessWhere(dataAccess, supportsClientLink));

        return prisma.leadInspection.findMany({
            where,
            select: this.buildInspectionSelect(supportsClientLink),
            orderBy: { createdAt: 'desc' },
        });
    }

    async findByLeadId(leadId: string, tenantId: string, dataAccess?: DataAccessContext) {
        const supportsClientLink = await this.supportsClientLink();
        const where = mergeWhereWithAccess(
            { leadId, tenantId } satisfies Prisma.LeadInspectionWhereInput,
            await this.buildAccessWhere(dataAccess, supportsClientLink),
        );

        return prisma.leadInspection.findMany({
            where,
            select: this.buildInspectionSelect(supportsClientLink),
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(inspectionId: string, tenantId: string, dataAccess?: DataAccessContext) {
        const supportsClientLink = await this.supportsClientLink();
        const where = mergeWhereWithAccess(
            { id: inspectionId, tenantId } satisfies Prisma.LeadInspectionWhereInput,
            await this.buildAccessWhere(dataAccess, supportsClientLink),
        );

        return prisma.leadInspection.findFirst({
            where,
            select: this.buildInspectionSelect(supportsClientLink),
        });
    }

    async update(inspectionId: string, tenantId: string, data: UpdateLeadInspectionDto, dataAccess?: DataAccessContext) {
        const supportsClientLink = await this.supportsClientLink();
        const existing = await this.findById(inspectionId, tenantId, dataAccess);
        if (!existing) throw new Error('Inspection not found or access denied');

        return prisma.leadInspection.update({
            where: { id_tenantId: { id: inspectionId, tenantId } },
            data: this.transformDates(data),
            select: this.buildInspectionSelect(supportsClientLink),
        });
    }

    async delete(inspectionId: string, tenantId: string, dataAccess?: DataAccessContext) {
        const existing = await this.findById(inspectionId, tenantId, dataAccess);
        if (!existing) throw new Error('Inspection not found or access denied');

        return prisma.leadInspection.delete({
            where: { id_tenantId: { id: inspectionId, tenantId } },
        });
    }

    private async buildAccessWhere(
        dataAccess?: DataAccessContext,
        supportsClientLink?: boolean,
    ): Promise<Prisma.LeadInspectionWhereInput | undefined> {
        if (!dataAccess) {
            return undefined;
        }

        const resolvedSupportsClientLink = supportsClientLink ?? await this.supportsClientLink();

        const leadAccessWhere = buildLeadAccessWhere(dataAccess);
        const clientAccessWhere = buildClientAccessWhere(dataAccess);
        const orConditions: Prisma.LeadInspectionWhereInput[] = [];

        if (Object.keys(leadAccessWhere).length > 0) {
            orConditions.push({ lead: leadAccessWhere });
        }

        if (resolvedSupportsClientLink && Object.keys(clientAccessWhere).length > 0) {
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

    async supportsClientLink() {
        if (!this.supportsClientLinkPromise) {
            this.supportsClientLinkPromise = prisma.$queryRaw<Array<{ exists: boolean }>>`
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'LeadInspection'
                      AND column_name = 'clientId'
                ) AS "exists"
            `
                .then((rows) => rows[0]?.exists === true)
                .catch(() => false);
        }

        return this.supportsClientLinkPromise;
    }

    private buildInspectionSelect(supportsClientLink: boolean): Prisma.LeadInspectionSelect {
        return supportsClientLink
            ? {
                ...baseInspectionSelect,
                clientId: true,
                client: {
                    select: clientSelect,
                },
            }
            : baseInspectionSelect;
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
