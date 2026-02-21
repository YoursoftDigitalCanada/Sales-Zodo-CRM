export interface CreateTagDto {
    name: string;
    color?: string;
}
export interface UpdateTagDto {
    name?: string;
    color?: string;
}
export interface TagQueryDto {
    page?: number;
    limit?: number;
    search?: string;
}
export interface TagResponseDto {
    id: string;
    name: string;
    color?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface TagListResponseDto {
    data: TagResponseDto[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export declare function toTagResponseDto(tag: any): TagResponseDto;
//# sourceMappingURL=tags.dto.d.ts.map