import { PrismaClient, Prisma } from '@prisma/client';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './products.dto';

const prisma = new PrismaClient();
const productInclude = {
    category: { select: { id: true, name: true, slug: true } },
};

export class ProductsRepository {
    async create(tenantId: string, data: CreateProductDto) {
        return prisma.product.create({
            data: {
                tenantId,
                name: data.name,
                description: data.description,
                sku: data.sku,
                slug: data.slug,
                price: data.price,
                compareAtPrice: data.compareAtPrice,
                costPrice: data.costPrice,
                currency: data.currency || 'USD',
                trackInventory: data.trackInventory ?? true,
                quantity: data.quantity || 0,
                lowStockThreshold: data.lowStockThreshold,
                status: data.status || 'ACTIVE',
                categoryId: data.categoryId,
                images: data.images || [],
                metaTitle: data.metaTitle,
                metaDescription: data.metaDescription,
                weight: data.weight,
                weightUnit: data.weightUnit,
            },
            include: productInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.product.findFirst({ where: { id, tenantId }, include: productInclude });
    }

    async findMany(tenantId: string, query: ProductQueryDto) {
        const { page = 1, limit = 20, status, categoryId, search, minPrice, maxPrice, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where: Prisma.ProductWhereInput = {
            tenantId,
            ...(status && { status }),
            ...(categoryId && { categoryId }),
            ...(minPrice !== undefined && { price: { gte: minPrice } }),
            ...(maxPrice !== undefined && { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), lte: maxPrice } }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
                    { sku: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
                    { description: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.product.findMany({ where, include: productInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.product.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, data: UpdateProductDto) {
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.sku !== undefined) updateData.sku = data.sku;
        if (data.slug !== undefined) updateData.slug = data.slug;
        if (data.price !== undefined) updateData.price = data.price;
        if (data.compareAtPrice !== undefined) updateData.compareAtPrice = data.compareAtPrice;
        if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
        if (data.currency !== undefined) updateData.currency = data.currency;
        if (data.trackInventory !== undefined) updateData.trackInventory = data.trackInventory;
        if (data.quantity !== undefined) updateData.quantity = data.quantity;
        if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
        if (data.images !== undefined) updateData.images = data.images;
        if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle;
        if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
        if (data.weight !== undefined) updateData.weight = data.weight;
        if (data.weightUnit !== undefined) updateData.weightUnit = data.weightUnit;

        return prisma.product.update({ where: { id }, data: updateData, include: productInclude });
    }

    async delete(id: string) {
        return prisma.product.delete({ where: { id } });
    }
}

export const productsRepository = new ProductsRepository();
