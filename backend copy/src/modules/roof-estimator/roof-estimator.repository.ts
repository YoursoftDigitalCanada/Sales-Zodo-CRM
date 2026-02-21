import { PrismaClient, Prisma } from '@prisma/client';
import { CreateEstimateDto, UpdateEstimateDto, EstimateQueryDto, UpdateSettingsDto } from './roof-estimator.dto';

const prisma = new PrismaClient();

const estimateInclude = {
    client: { select: { id: true, clientName: true, companyName: true } },
};

export class RoofEstimatorRepository {
    async create(tenantId: string, data: CreateEstimateDto, createdBy: string) {
        return prisma.roofEstimate.create({
            data: {
                tenantId,
                address: data.address,
                latitude: data.latitude,
                longitude: data.longitude,
                satelliteImageUrl: data.satelliteImageUrl || null,
                roofAreaSqft: data.roofAreaSqft,
                confidence: data.confidence,
                processingTimeSec: data.processingTimeSec || 0,
                aiModel: data.aiModel || 'yolov8n-seg-cpu',
                pricePerSqft: data.pricePerSqft,
                manualAdjustment: data.manualAdjustment || 0,
                totalEstimate: data.totalEstimate,
                snowMode: data.snowMode || false,
                notes: data.notes || null,
                clientId: data.clientId || null,
                createdBy,
            },
            include: estimateInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.roofEstimate.findFirst({
            where: { id, tenantId },
            include: estimateInclude,
        });
    }

    async findMany(tenantId: string, query: EstimateQueryDto) {
        const {
            page = 1,
            limit = 20,
            search,
            clientId,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = query;

        const where: Prisma.RoofEstimateWhereInput = {
            tenantId,
            ...(clientId && { clientId }),
            ...(search && {
                address: { contains: search, mode: 'insensitive' as const },
            }),
        };

        const [data, total] = await Promise.all([
            prisma.roofEstimate.findMany({
                where,
                include: estimateInclude,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.roofEstimate.count({ where }),
        ]);

        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateEstimateDto) {
        return prisma.roofEstimate.update({
            where: { id },
            data: {
                ...(data.pricePerSqft !== undefined && { pricePerSqft: data.pricePerSqft }),
                ...(data.manualAdjustment !== undefined && { manualAdjustment: data.manualAdjustment }),
                ...(data.totalEstimate !== undefined && { totalEstimate: data.totalEstimate }),
                ...(data.snowMode !== undefined && { snowMode: data.snowMode }),
                ...(data.notes !== undefined && { notes: data.notes }),
                ...(data.clientId !== undefined && { clientId: data.clientId }),
            },
            include: estimateInclude,
        });
    }

    async delete(id: string, tenantId: string) {
        return prisma.roofEstimate.delete({ where: { id } });
    }

    async getSettings(tenantId: string) {
        return prisma.roofEstimateSettings.findUnique({
            where: { tenantId },
        });
    }

    async upsertSettings(tenantId: string, data: UpdateSettingsDto) {
        return prisma.roofEstimateSettings.upsert({
            where: { tenantId },
            create: {
                tenantId,
                defaultPricePerSqft: data.defaultPricePerSqft ?? 5.50,
                currency: data.currency ?? 'CAD',
                snowModeDefault: data.snowModeDefault ?? true,
                companyName: data.companyName,
                companyLogo: data.companyLogo,
                companyPhone: data.companyPhone,
                companyEmail: data.companyEmail,
                companyAddress: data.companyAddress,
                pdfFooterText: data.pdfFooterText,
            },
            update: {
                ...(data.defaultPricePerSqft !== undefined && { defaultPricePerSqft: data.defaultPricePerSqft }),
                ...(data.currency !== undefined && { currency: data.currency }),
                ...(data.snowModeDefault !== undefined && { snowModeDefault: data.snowModeDefault }),
                ...(data.companyName !== undefined && { companyName: data.companyName }),
                ...(data.companyLogo !== undefined && { companyLogo: data.companyLogo }),
                ...(data.companyPhone !== undefined && { companyPhone: data.companyPhone }),
                ...(data.companyEmail !== undefined && { companyEmail: data.companyEmail }),
                ...(data.companyAddress !== undefined && { companyAddress: data.companyAddress }),
                ...(data.pdfFooterText !== undefined && { pdfFooterText: data.pdfFooterText }),
            },
        });
    }

    async getStatistics(tenantId: string) {
        const [total, totalRevenue, avgArea, avgConfidence] = await Promise.all([
            prisma.roofEstimate.count({ where: { tenantId } }),
            prisma.roofEstimate.aggregate({
                where: { tenantId },
                _sum: { totalEstimate: true },
            }),
            prisma.roofEstimate.aggregate({
                where: { tenantId },
                _avg: { roofAreaSqft: true },
            }),
            prisma.roofEstimate.aggregate({
                where: { tenantId },
                _avg: { confidence: true },
            }),
        ]);

        return {
            totalEstimates: total,
            totalRevenue: totalRevenue._sum.totalEstimate || 0,
            avgRoofArea: Math.round(avgArea._avg.roofAreaSqft || 0),
            avgConfidence: Math.round((avgConfidence._avg.confidence || 0) * 10) / 10,
        };
    }
}

export const roofEstimatorRepository = new RoofEstimatorRepository();
