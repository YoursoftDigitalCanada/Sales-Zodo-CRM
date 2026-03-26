import { PrismaClient, Prisma } from '@prisma/client';
import {
    CreateEstimateDto, UpdateEstimateDto, EstimateQueryDto, UpdateSettingsDto,
    CreateMaterialDto, UpdateMaterialDto,
    CreateLaborRateDto, UpdateLaborRateDto,
} from './roof-estimator.dto';
import { planAreaToTrueArea, pitchToDegrees, estimateRidgeLength, estimateHipLength, estimateValleyLength, estimateEaveLength, estimateRakeLength } from './roof-calculator.utils';

const prisma = new PrismaClient();

const estimateInclude = {
    client: { select: { id: true, clientName: true, companyName: true } },
};

export class RoofEstimatorRepository {
    // ── Estimate CRUD ─────────────────────────────────────────────────────

    async create(tenantId: string, data: CreateEstimateDto, createdBy: string) {
        const trueSurface = planAreaToTrueArea(data.roofAreaSqft, data.pitch);
        const pitchDeg = pitchToDegrees(data.pitch);

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
                // New fields
                pitch: data.pitch || null,
                pitchDegrees: pitchDeg || null,
                stories: data.stories ?? 1,
                roofType: data.roofType || null,
                layers: data.layers ?? 1,
                ridgeLengthFt: data.ridgeLengthFt ?? estimateRidgeLength(trueSurface, data.roofType),
                hipLengthFt: data.hipLengthFt ?? estimateHipLength(trueSurface, data.roofType),
                valleyLengthFt: data.valleyLengthFt ?? estimateValleyLength(trueSurface, data.roofType),
                eaveLengthFt: data.eaveLengthFt ?? estimateEaveLength(trueSurface, data.roofType),
                rakeLengthFt: data.rakeLengthFt ?? estimateRakeLength(trueSurface, data.roofType),
                trueSurfaceAreaSqft: trueSurface,
                measurementSource: data.measurementSource || null,
                tearOffRequired: data.tearOffRequired || false,
                photoUrls: data.photoUrls && data.photoUrls.length > 0
                    ? data.photoUrls as Prisma.InputJsonValue
                    : Prisma.JsonNull,
                // Pricing
                pricePerSqft: data.pricePerSqft,
                manualAdjustment: data.manualAdjustment || 0,
                totalEstimate: data.totalEstimate,
                snowMode: data.snowMode || false,
                notes: data.notes || null,
                clientId: data.clientId || null,
                createdBy,
                // Wizard workflow
                status: data.status || 'draft',
                currentStep: data.currentStep ?? 1,
                wastePercent: data.wastePercent ?? 10,
                shingleType: data.shingleType || null,
                shinglePricePerSq: data.shinglePricePerSq ?? null,
                underlaymentCost: data.underlaymentCost ?? null,
                iceWaterShieldCost: data.iceWaterShieldCost ?? null,
                ridgeCapCost: data.ridgeCapCost ?? null,
                starterStripCost: data.starterStripCost ?? null,
                flashingCostWizard: data.flashingCostWizard ?? null,
                ventCostWizard: data.ventCostWizard ?? null,
                nailsAccessoriesCost: data.nailsAccessoriesCost ?? null,
                totalMaterialCost: data.totalMaterialCost ?? null,
                laborCostPerSquare: data.laborCostPerSquare ?? null,
                numberOfLaborers: data.numberOfLaborers ?? null,
                daysRequired: data.daysRequired ?? null,
                laborRatePerWorker: data.laborRatePerWorker ?? null,
                totalLaborCost: data.totalLaborCost ?? null,
                dumpsterCost: data.dumpsterCost ?? null,
                permitCost: data.permitCost ?? null,
                deliveryFee: data.deliveryFee ?? null,
                equipmentRentalCost: data.equipmentRentalCost ?? null,
                disposalFee: data.disposalFee ?? null,
                totalEquipmentCost: data.totalEquipmentCost ?? null,
                overheadPercent: data.overheadPercent ?? null,
                profitMarginPercent: data.profitMarginPercent ?? null,
                taxPercent: data.taxPercent ?? null,
                overheadAmount: data.overheadAmount ?? null,
                profitAmount: data.profitAmount ?? null,
                taxAmount: data.taxAmount ?? null,
                finalEstimatePrice: data.finalEstimatePrice ?? null,
            },
            include: estimateInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.roofEstimate.findFirst({
            where: { id, tenantId },
            include: {
                ...estimateInclude,
                takeoffs: {
                    include: { items: { orderBy: { sortOrder: 'asc' } } },
                    orderBy: { createdAt: 'desc' },
                },
            },
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
        const existing = await prisma.roofEstimate.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Estimate not found or access denied');

        // Recalculate true area if pitch or area changes
        const newPitch = data.pitch !== undefined ? data.pitch : existing.pitch;
        const pitchDeg = newPitch ? pitchToDegrees(newPitch) : existing.pitchDegrees;
        const newArea = data.roofAreaSqft !== undefined ? data.roofAreaSqft : existing.roofAreaSqft;
        const trueSurface = newPitch ? planAreaToTrueArea(newArea, newPitch) : existing.trueSurfaceAreaSqft;

        return prisma.roofEstimate.update({
            where: { id },
            data: {
                ...(data.address !== undefined && { address: data.address }),
                ...(data.latitude !== undefined && { latitude: data.latitude }),
                ...(data.longitude !== undefined && { longitude: data.longitude }),
                ...(data.satelliteImageUrl !== undefined && { satelliteImageUrl: data.satelliteImageUrl }),
                ...(data.roofAreaSqft !== undefined && { roofAreaSqft: data.roofAreaSqft }),
                ...(data.confidence !== undefined && { confidence: data.confidence }),
                ...(data.processingTimeSec !== undefined && { processingTimeSec: data.processingTimeSec }),
                ...(data.aiModel !== undefined && { aiModel: data.aiModel }),
                ...(data.measurementSource !== undefined && { measurementSource: data.measurementSource }),
                ...(data.photoUrls !== undefined && {
                    photoUrls: data.photoUrls.length > 0
                        ? data.photoUrls as Prisma.InputJsonValue
                        : Prisma.JsonNull,
                }),
                ...(data.pricePerSqft !== undefined && { pricePerSqft: data.pricePerSqft }),
                ...(data.manualAdjustment !== undefined && { manualAdjustment: data.manualAdjustment }),
                ...(data.totalEstimate !== undefined && { totalEstimate: data.totalEstimate }),
                ...(data.snowMode !== undefined && { snowMode: data.snowMode }),
                ...(data.notes !== undefined && { notes: data.notes }),
                ...(data.clientId !== undefined && { clientId: data.clientId }),
                // New fields
                ...(data.pitch !== undefined && { pitch: data.pitch, pitchDegrees: pitchDeg, trueSurfaceAreaSqft: trueSurface }),
                ...(data.roofType !== undefined && { roofType: data.roofType }),
                ...(data.stories !== undefined && { stories: data.stories }),
                ...(data.layers !== undefined && { layers: data.layers }),
                ...(data.ridgeLengthFt !== undefined && { ridgeLengthFt: data.ridgeLengthFt }),
                ...(data.hipLengthFt !== undefined && { hipLengthFt: data.hipLengthFt }),
                ...(data.valleyLengthFt !== undefined && { valleyLengthFt: data.valleyLengthFt }),
                ...(data.eaveLengthFt !== undefined && { eaveLengthFt: data.eaveLengthFt }),
                ...(data.rakeLengthFt !== undefined && { rakeLengthFt: data.rakeLengthFt }),
                ...(data.tearOffRequired !== undefined && { tearOffRequired: data.tearOffRequired }),
                // Wizard workflow fields
                ...(data.status !== undefined && { status: data.status }),
                ...(data.currentStep !== undefined && { currentStep: data.currentStep }),
                ...(data.wastePercent !== undefined && { wastePercent: data.wastePercent }),
                ...(data.shingleType !== undefined && { shingleType: data.shingleType }),
                ...(data.shinglePricePerSq !== undefined && { shinglePricePerSq: data.shinglePricePerSq }),
                ...(data.underlaymentCost !== undefined && { underlaymentCost: data.underlaymentCost }),
                ...(data.iceWaterShieldCost !== undefined && { iceWaterShieldCost: data.iceWaterShieldCost }),
                ...(data.ridgeCapCost !== undefined && { ridgeCapCost: data.ridgeCapCost }),
                ...(data.starterStripCost !== undefined && { starterStripCost: data.starterStripCost }),
                ...(data.flashingCostWizard !== undefined && { flashingCostWizard: data.flashingCostWizard }),
                ...(data.ventCostWizard !== undefined && { ventCostWizard: data.ventCostWizard }),
                ...(data.nailsAccessoriesCost !== undefined && { nailsAccessoriesCost: data.nailsAccessoriesCost }),
                ...(data.totalMaterialCost !== undefined && { totalMaterialCost: data.totalMaterialCost }),
                ...(data.laborCostPerSquare !== undefined && { laborCostPerSquare: data.laborCostPerSquare }),
                ...(data.numberOfLaborers !== undefined && { numberOfLaborers: data.numberOfLaborers }),
                ...(data.daysRequired !== undefined && { daysRequired: data.daysRequired }),
                ...(data.laborRatePerWorker !== undefined && { laborRatePerWorker: data.laborRatePerWorker }),
                ...(data.totalLaborCost !== undefined && { totalLaborCost: data.totalLaborCost }),
                ...(data.dumpsterCost !== undefined && { dumpsterCost: data.dumpsterCost }),
                ...(data.permitCost !== undefined && { permitCost: data.permitCost }),
                ...(data.deliveryFee !== undefined && { deliveryFee: data.deliveryFee }),
                ...(data.equipmentRentalCost !== undefined && { equipmentRentalCost: data.equipmentRentalCost }),
                ...(data.disposalFee !== undefined && { disposalFee: data.disposalFee }),
                ...(data.totalEquipmentCost !== undefined && { totalEquipmentCost: data.totalEquipmentCost }),
                ...(data.overheadPercent !== undefined && { overheadPercent: data.overheadPercent }),
                ...(data.profitMarginPercent !== undefined && { profitMarginPercent: data.profitMarginPercent }),
                ...(data.taxPercent !== undefined && { taxPercent: data.taxPercent }),
                ...(data.overheadAmount !== undefined && { overheadAmount: data.overheadAmount }),
                ...(data.profitAmount !== undefined && { profitAmount: data.profitAmount }),
                ...(data.taxAmount !== undefined && { taxAmount: data.taxAmount }),
                ...(data.finalEstimatePrice !== undefined && { finalEstimatePrice: data.finalEstimatePrice }),
            },
            include: estimateInclude,
        });
    }

    async delete(id: string, tenantId: string) {
        const existing = await prisma.roofEstimate.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Estimate not found or access denied');
        return prisma.roofEstimate.delete({ where: { id } });
    }

    // ── Settings ──────────────────────────────────────────────────────────

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

    // ── Statistics ─────────────────────────────────────────────────────────

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

    // ── Material CRUD ─────────────────────────────────────────────────────

    async createMaterial(tenantId: string, data: CreateMaterialDto) {
        return prisma.roofMaterial.create({
            data: {
                tenantId,
                name: data.name,
                category: data.category,
                unit: data.unit,
                coveragePerUnit: data.coveragePerUnit,
                defaultPrice: data.defaultPrice,
                supplier: data.supplier || null,
                sku: data.sku || null,
            },
        });
    }

    async findMaterials(tenantId: string, category?: string) {
        return prisma.roofMaterial.findMany({
            where: {
                tenantId,
                ...(category && { category }),
                isActive: true,
            },
            orderBy: { category: 'asc' },
        });
    }

    async updateMaterial(id: string, tenantId: string, data: UpdateMaterialDto) {
        const existing = await prisma.roofMaterial.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Material not found');

        return prisma.roofMaterial.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.category !== undefined && { category: data.category }),
                ...(data.unit !== undefined && { unit: data.unit }),
                ...(data.coveragePerUnit !== undefined && { coveragePerUnit: data.coveragePerUnit }),
                ...(data.defaultPrice !== undefined && { defaultPrice: data.defaultPrice }),
                ...(data.supplier !== undefined && { supplier: data.supplier }),
                ...(data.sku !== undefined && { sku: data.sku }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });
    }

    async deleteMaterial(id: string, tenantId: string) {
        const existing = await prisma.roofMaterial.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Material not found');
        return prisma.roofMaterial.delete({ where: { id } });
    }

    // ── Labor Rate CRUD ───────────────────────────────────────────────────

    async createLaborRate(tenantId: string, data: CreateLaborRateDto) {
        return prisma.roofLaborRate.create({
            data: {
                tenantId,
                description: data.description,
                rateType: data.rateType,
                rate: data.rate,
                condition: data.condition || null,
            },
        });
    }

    async findLaborRates(tenantId: string) {
        return prisma.roofLaborRate.findMany({
            where: { tenantId, isActive: true },
            orderBy: { createdAt: 'asc' },
        });
    }

    async updateLaborRate(id: string, tenantId: string, data: UpdateLaborRateDto) {
        const existing = await prisma.roofLaborRate.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Labor rate not found');

        return prisma.roofLaborRate.update({
            where: { id },
            data: {
                ...(data.description !== undefined && { description: data.description }),
                ...(data.rateType !== undefined && { rateType: data.rateType }),
                ...(data.rate !== undefined && { rate: data.rate }),
                ...(data.condition !== undefined && { condition: data.condition }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });
    }

    async deleteLaborRate(id: string, tenantId: string) {
        const existing = await prisma.roofLaborRate.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Labor rate not found');
        return prisma.roofLaborRate.delete({ where: { id } });
    }
}

export const roofEstimatorRepository = new RoofEstimatorRepository();
