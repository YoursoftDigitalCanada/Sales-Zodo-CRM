import { CreateFolderDto, UpdateFolderDto, FolderQueryDto } from './folders.dto';
export declare class FoldersService {
    create(tenantId: string, data: CreateFolderDto): Promise<import("./folders.dto").FolderResponseDto>;
    getById(id: string, tenantId: string): Promise<import("./folders.dto").FolderResponseDto>;
    getMany(tenantId: string, query: FolderQueryDto): Promise<{
        data: import("./folders.dto").FolderResponseDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    update(id: string, tenantId: string, data: UpdateFolderDto): Promise<import("./folders.dto").FolderResponseDto>;
    delete(id: string, tenantId: string): Promise<void>;
}
export declare const foldersService: FoldersService;
//# sourceMappingURL=folders.service.d.ts.map