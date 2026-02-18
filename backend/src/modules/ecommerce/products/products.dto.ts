import { Product, ProductStatus, Currency } from '@prisma/client';

export interface CreateProductDto {
    name: string;
    description?: string | null;
    sku: string;
    slug: string;
    price: number;
    compareAtPrice?: number | null;
    costPrice?: number | null;
    currency?: Currency;
    trackInventory?: boolean;
    quantity?: number;
    lowStockThreshold?: number | null;
    status?: ProductStatus;
    categoryId?: string | null;
    images?: string[];
    metaTitle?: string | null;
    metaDescription?: string | null;
    weight?: number | null;
    weightUnit?: string | null;
}

export interface UpdateProductDto extends Partial<CreateProductDto> { }

export interface ProductQueryDto {
    page?: number;
    limit?: number;
    status?: ProductStatus;
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'createdAt' | 'name' | 'price' | 'quantity';
    sortOrder?: 'asc' | 'desc';
}

export interface ProductResponseDto {
    id: string;
    name: string;
    description: string | null;
    sku: string;
    slug: string;
    price: string;
    compareAtPrice: string | null;
    costPrice: string | null;
    currency: Currency;
    trackInventory: boolean;
    quantity: number;
    lowStockThreshold: number | null;
    status: ProductStatus;
    categoryId: string | null;
    category: { id: string; name: string; slug: string } | null;
    images: string[];
    metaTitle: string | null;
    metaDescription: string | null;
    weight: string | null;
    weightUnit: string | null;
    createdAt: Date;
    updatedAt: Date;
}

type ProductWithRelations = Product & {
    category?: { id: string; name: string; slug: string } | null;
};

export function toProductResponseDto(p: ProductWithRelations): ProductResponseDto {
    return {
        id: p.id,
        name: p.name,
        description: p.description,
        sku: p.sku,
        slug: p.slug,
        price: p.price.toString(),
        compareAtPrice: p.compareAtPrice?.toString() || null,
        costPrice: p.costPrice?.toString() || null,
        currency: p.currency,
        trackInventory: p.trackInventory,
        quantity: p.quantity,
        lowStockThreshold: p.lowStockThreshold,
        status: p.status,
        categoryId: p.categoryId,
        category: p.category || null,
        images: p.images as string[],
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
        weight: p.weight?.toString() || null,
        weightUnit: p.weightUnit,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    };
}
