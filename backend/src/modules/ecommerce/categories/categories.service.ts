import { categoriesRepository } from './categories.repository';
import { CreateCategoryDto, UpdateCategoryDto, CategoryQueryDto, toCategoryResponseDto } from './categories.dto';
import { NotFoundError } from '../../../common/errors/HttpErrors';
import { ErrorCodes } from '../../../common/errors/errorCodes';
import { activityLogger } from '../../../common/services/activity-logger.service';

export class CategoriesService {
    async create(tenantId: string, data: CreateCategoryDto) {
        const category = await categoriesRepository.create(tenantId, data);
        const dto = toCategoryResponseDto(category);

        activityLogger.log({
            tenantId, entityType: 'ProductCategory', entityId: dto.id,
            action: 'CREATE', module: 'ecommerce',
            description: `Created category "${(category as any).name || dto.id}"`,
            metadata: { categoryName: (category as any).name },
        });

        return dto;
    }

    async getById(id: string, tenantId: string) {
        const category = await categoriesRepository.findById(id, tenantId);
        if (!category) throw new NotFoundError('Category not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toCategoryResponseDto(category);
    }

    async getMany(tenantId: string, query: CategoryQueryDto) {
        const { data, total } = await categoriesRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);
        return {
            data: data.map(toCategoryResponseDto),
            meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        };
    }

    async getTree(tenantId: string) {
        const categories = await categoriesRepository.findTree(tenantId);
        return categories.map(toCategoryResponseDto);
    }

    async update(id: string, tenantId: string, data: UpdateCategoryDto) {
        const existing = await categoriesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Category not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const category = await categoriesRepository.update(id, tenantId, data);
        const dto = toCategoryResponseDto(category);

        activityLogger.log({
            tenantId, entityType: 'ProductCategory', entityId: dto.id,
            action: 'UPDATE', module: 'ecommerce',
            description: `Updated category "${(category as any).name || dto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await categoriesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Category not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'ProductCategory', entityId: id,
            action: 'DELETE', module: 'ecommerce',
            description: `Deleted category "${(existing as any).name || id}"`,
        });

        await categoriesRepository.delete(id, tenantId);
    }
}

export const categoriesService = new CategoriesService();
