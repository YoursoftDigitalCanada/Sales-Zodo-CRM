export interface CreateServiceDto {
    name: string;
    description?: string | null;
    category?: string | null;
    basePrice?: number | null;
    durationMinutes?: number | null;
    isActive?: boolean;
}

export interface UpdateServiceDto extends Partial<CreateServiceDto> { }

export interface ServiceQueryDto {
    page?: number;
    limit?: number;
    category?: string;
    isActive?: boolean;
    search?: string;
    sortBy?: 'name' | 'createdAt' | 'basePrice';
    sortOrder?: 'asc' | 'desc';
}

export interface ServiceResponseDto {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    basePrice: number | null;
    durationMinutes: number | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export function toServiceResponseDto(s: any): ServiceResponseDto {
    return {
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        basePrice: s.basePrice ? Number(s.basePrice) : null,
        durationMinutes: s.durationMinutes,
        isActive: s.isActive,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
    };
}
