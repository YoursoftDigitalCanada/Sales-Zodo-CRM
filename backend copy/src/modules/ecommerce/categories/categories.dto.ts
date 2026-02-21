import { ProductCategory } from '@prisma/client';

export interface CreateCategoryDto {
    name: string;
    description?: string | null;
    slug: string;
    parentId?: string | null;
    image?: string | null;
    sortOrder?: number;
    isActive?: boolean;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> { }

export interface CategoryQueryDto {
    page?: number;
    limit?: number;
    isActive?: boolean;
    parentId?: string | null;
    search?: string;
    sortBy?: 'createdAt' | 'name' | 'sortOrder';
    sortOrder?: 'asc' | 'desc';
}

export interface CategoryResponseDto {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    parentId: string | null;
    image: string | null;
    sortOrder: number;
    isActive: boolean;
    children?: CategoryResponseDto[];
    createdAt: Date;
    updatedAt: Date;
}

type CategoryWithRelations = ProductCategory & {
    children?: ProductCategory[];
};

export function toCategoryResponseDto(c: CategoryWithRelations): CategoryResponseDto {
    return {
        id: c.id,
        name: c.name,
        description: c.description,
        slug: c.slug,
        parentId: c.parentId,
        image: c.image,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        children: c.children?.map(child => toCategoryResponseDto(child as CategoryWithRelations)),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}
