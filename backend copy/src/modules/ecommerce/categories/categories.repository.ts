import { PrismaClient, Prisma } from '@prisma/client';
import { CreateCategoryDto, UpdateCategoryDto, CategoryQueryDto } from './categories.dto';

const prisma = new PrismaClient();

export class CategoriesRepository {
    async create(tenantId: string, data: CreateCategoryDto) {
        return prisma.productCategory.create({
            data: {
                tenantId,
                name: data.name,
                description: data.description,
                slug: data.slug,
                parentId: data.parentId,
                image: data.image,
                sortOrder: data.sortOrder || 0,
                isActive: data.isActive ?? true,
            },
            include: { children: true },
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.productCategory.findFirst({
            where: { id, tenantId },
            include: { children: true },
        });
    }

    async findMany(tenantId: string, query: CategoryQueryDto) {
        const { page = 1, limit = 20, isActive, parentId, search, sortBy = 'sortOrder', sortOrder = 'asc' } = query;
        const where: Prisma.ProductCategoryWhereInput = {
            tenantId,
            ...(isActive !== undefined && { isActive }),
            ...(parentId !== undefined && { parentId: parentId || null }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
                    { description: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.productCategory.findMany({ where, include: { children: true }, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.productCategory.count({ where }),
        ]);
        return { data, total };
    }

    async findTree(tenantId: string) {
        return prisma.productCategory.findMany({
            where: { tenantId, parentId: null },
            include: {
                children: {
                    include: {
                        children: true,
                    },
                    orderBy: { sortOrder: 'asc' },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async update(id: string, data: UpdateCategoryDto) {
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.slug !== undefined) updateData.slug = data.slug;
        if (data.parentId !== undefined) updateData.parentId = data.parentId;
        if (data.image !== undefined) updateData.image = data.image;
        if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        return prisma.productCategory.update({ where: { id }, data: updateData, include: { children: true } });
    }

    async delete(id: string) {
        return prisma.productCategory.delete({ where: { id } });
    }
}

export const categoriesRepository = new CategoriesRepository();
