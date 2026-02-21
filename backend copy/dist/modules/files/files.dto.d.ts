import { File } from '@prisma/client';
export interface UploadFileDto {
    name: string;
    folderId?: string | null;
    description?: string | null;
    clientId?: string | null;
    projectId?: string | null;
    mimeType?: string;
    size?: number;
    url?: string;
    path?: string;
}
export interface UpdateFileDto {
    name?: string;
    folderId?: string | null;
    description?: string | null;
}
export interface FileQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    folderId?: string | null;
    clientId?: string;
    projectId?: string;
    mimeType?: string;
    sortBy?: 'name' | 'createdAt' | 'size';
    sortOrder?: 'asc' | 'desc';
}
export interface FileResponseDto {
    id: string;
    name: string;
    description: string | null;
    mimeType: string;
    size: number;
    url: string;
    folder: {
        id: string;
        name: string;
    } | null;
    uploadedBy: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
}
type FileWithRelations = File & {
    folder?: {
        id: string;
        name: string;
    } | null;
    uploadedBy?: {
        id: string;
        user: {
            firstName: string;
            lastName: string;
        };
    } | null;
};
export declare function toFileResponseDto(f: FileWithRelations): FileResponseDto;
export {};
//# sourceMappingURL=files.dto.d.ts.map