import { productsRepository } from './products.repository';
import { CreateProductDto, UpdateProductDto, ProductQueryDto, toProductResponseDto } from './products.dto';
import { NotFoundError } from '../../../common/errors/HttpErrors';
import { ErrorCodes } from '../../../common/errors/errorCodes';
import { activityLogger } from '../../../common/services/activity-logger.service';

export class ProductsService {
    async create(tenantId: string, data: CreateProductDto) {
        const product = await productsRepository.create(tenantId, data);
        const dto = toProductResponseDto(product);

        activityLogger.log({
            tenantId, entityType: 'Product', entityId: dto.id,
            action: 'CREATE', module: 'ecommerce',
            description: `Created product "${(product as any).name || dto.id}"`,
            metadata: { productName: (product as any).name, price: (product as any).price },
        });

        return dto;
    }

    async getById(id: string, tenantId: string) {
        const product = await productsRepository.findById(id, tenantId);
        if (!product) throw new NotFoundError('Product not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toProductResponseDto(product);
    }

    async getMany(tenantId: string, query: ProductQueryDto) {
        const { data, total } = await productsRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);
        return {
            data: data.map(toProductResponseDto),
            meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateProductDto) {
        const existing = await productsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Product not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const product = await productsRepository.update(id, tenantId, data);
        const dto = toProductResponseDto(product);

        activityLogger.log({
            tenantId, entityType: 'Product', entityId: dto.id,
            action: 'UPDATE', module: 'ecommerce',
            description: `Updated product "${(product as any).name || dto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await productsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Product not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'Product', entityId: id,
            action: 'DELETE', module: 'ecommerce',
            description: `Deleted product "${(existing as any).name || id}"`,
        });

        await productsRepository.delete(id, tenantId);
    }
}

export const productsService = new ProductsService();
