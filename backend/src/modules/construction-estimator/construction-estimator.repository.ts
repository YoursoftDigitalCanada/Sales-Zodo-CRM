import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

const includeAll = {
    measurements: true,
    materials: { orderBy: { sortOrder: 'asc' as const } },
    labour: { orderBy: { sortOrder: 'asc' as const } },
    equipment: { orderBy: { sortOrder: 'asc' as const } },
    transport: { orderBy: { sortOrder: 'asc' as const } },
};

class ConstructionEstimatorRepository {
    // ── Create ──
    async create(data: Prisma.ConstructionEstimateCreateInput) {
        return prisma.constructionEstimate.create({ data, include: includeAll });
    }

    // ── Find by ID (with tenant isolation) ──
    async findById(id: string, tenantId: string) {
        return prisma.constructionEstimate.findFirst({
            where: { id, tenantId },
            include: includeAll,
        });
    }

    // ── List (paginated) ──
    async findMany(tenantId: string, opts: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
    }) {
        const page = opts.page || 1;
        const limit = opts.limit || 20;
        const skip = (page - 1) * limit;

        const where: Prisma.ConstructionEstimateWhereInput = { tenantId };

        if (opts.status) {
            where.status = opts.status as any;
        }
        if (opts.search) {
            where.OR = [
                { projectName: { contains: opts.search, mode: 'insensitive' } },
                { address: { contains: opts.search, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await prisma.$transaction([
            prisma.constructionEstimate.findMany({
                where,
                include: includeAll,
                orderBy: { updatedAt: 'desc' },
                take: limit,
                skip,
            }),
            prisma.constructionEstimate.count({ where }),
        ]);

        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    // ── Update master record ──
    async update(id: string, tenantId: string, data: Prisma.ConstructionEstimateUpdateInput) {
        return prisma.constructionEstimate.update({
            where: { id },
            data,
            include: includeAll,
        });
    }

    // ── Delete ──
    async delete(id: string, tenantId: string) {
        return prisma.constructionEstimate.delete({ where: { id } });
    }

    // ── Upsert measurements ──
    async upsertMeasurements(estimateId: string, data: any) {
        return prisma.estimateMeasurement.upsert({
            where: { estimateId },
            create: { estimateId, ...data },
            update: data,
        });
    }

    // ── Replace line items (delete all + create many) ──
    async replaceMaterials(estimateId: string, items: any[]) {
        await prisma.estimateMaterial.deleteMany({ where: { estimateId } });
        if (items.length > 0) {
            await prisma.estimateMaterial.createMany({
                data: items.map((m, i) => ({ ...m, estimateId, sortOrder: i })),
            });
        }
    }

    async replaceLabour(estimateId: string, items: any[]) {
        await prisma.estimateLabour.deleteMany({ where: { estimateId } });
        if (items.length > 0) {
            await prisma.estimateLabour.createMany({
                data: items.map((l, i) => ({ ...l, estimateId, sortOrder: i })),
            });
        }
    }

    async replaceEquipment(estimateId: string, items: any[]) {
        await prisma.estimateEquipment.deleteMany({ where: { estimateId } });
        if (items.length > 0) {
            await prisma.estimateEquipment.createMany({
                data: items.map((e, i) => ({ ...e, estimateId, sortOrder: i })),
            });
        }
    }

    async replaceTransport(estimateId: string, items: any[]) {
        await prisma.estimateTransport.deleteMany({ where: { estimateId } });
        if (items.length > 0) {
            await prisma.estimateTransport.createMany({
                data: items.map((t, i) => ({ ...t, estimateId, sortOrder: i })),
            });
        }
    }
}

export const constructionEstimatorRepository = new ConstructionEstimatorRepository();
