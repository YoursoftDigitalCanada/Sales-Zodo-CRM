import { UploadFileDto, UpdateFileDto, FileQueryDto } from './files.dto';
export declare class FilesService {
    create(tenantId: string, data: UploadFileDto, uploadedById?: string): Promise<import("./files.dto").FileResponseDto>;
    getById(id: string, tenantId: string): Promise<import("./files.dto").FileResponseDto>;
    getMany(tenantId: string, query: FileQueryDto): Promise<{
        data: import("./files.dto").FileResponseDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    update(id: string, tenantId: string, data: UpdateFileDto): Promise<import("./files.dto").FileResponseDto>;
    delete(id: string, tenantId: string): Promise<void>;
}
export declare const filesService: FilesService;
//# sourceMappingURL=files.service.d.ts.map