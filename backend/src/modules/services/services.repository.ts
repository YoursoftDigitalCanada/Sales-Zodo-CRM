import { Prisma } from '@prisma/client';
import { CreateServiceDto, UpdateServiceDto, ServiceQueryDto } from './services.dto';
import { prisma } from '../../config/database';

export class ServicesRepository {
    async create(tenantId: string, data: CreateServiceDto) {
        return prisma.service.create({
            data: {
                tenantId,
                name: data.name,
                description: data.description,
                category: data.category,
                basePrice: data.basePrice != null ? new Prisma.Decimal(data.basePrice) : null,
                durationMinutes: data.durationMinutes,
                isActive: data.isActive ?? true,
            },
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.service.findFirst({ where: { id, tenantId } });
    }

    async findMany(tenantId: string, query: ServiceQueryDto) {
        const { page = 1, limit = 20, category, isActive, search, sortBy = 'name', sortOrder = 'asc' } = query;
        const where: Prisma.ServiceWhereInput = {
            tenantId,
            ...(category && { category }),
            ...(isActive !== undefined && { isActive }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
                    { description: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.service.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.service.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateServiceDto) {
        // Verify tenant ownership
        const existing = await prisma.service.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Service not found or access denied');

        return prisma.service.update({
            where: { id_tenantId: { id, tenantId } },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.category !== undefined && { category: data.category }),
                ...(data.basePrice !== undefined && { basePrice: data.basePrice != null ? new Prisma.Decimal(data.basePrice) : null }),
                ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });
    }

    async deactivate(id: string, tenantId: string) {
        // Verify tenant ownership
        const existing = await prisma.service.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Service not found or access denied');
        return prisma.service.update({
            where: { id_tenantId: { id, tenantId } },
            data: { isActive: false },
        });
    }

    async delete(id: string, tenantId: string) {
        // Verify tenant ownership
        const existing = await prisma.service.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Service not found or access denied');
        return prisma.service.delete({ where: { id_tenantId: { id, tenantId } } });
    }
}

export const servicesRepository = new ServicesRepository();
