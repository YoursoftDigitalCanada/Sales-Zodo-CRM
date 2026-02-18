import { categoriesRepository } from './categories.repository';
import { CreateCategoryDto, UpdateCategoryDto, CategoryQueryDto, toCategoryResponseDto } from './categories.dto';
import { NotFoundError } from '../../../common/errors/HttpErrors';
import { ErrorCodes } from '../../../common/errors/errorCodes';

export class CategoriesService {
    async create(tenantId: string, data: CreateCategoryDto) {
        const category = await categoriesRepository.create(tenantId, data);
        return toCategoryResponseDto(category);
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
        const category = await categoriesRepository.update(id, data);
        return toCategoryResponseDto(category);
    }

    async delete(id: string, tenantId: string) {
        const existing = await categoriesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Category not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await categoriesRepository.delete(id);
    }
}

export const categoriesService = new CategoriesService();
