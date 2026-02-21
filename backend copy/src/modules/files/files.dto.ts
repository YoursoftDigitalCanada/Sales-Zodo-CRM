import { File } from '@prisma/client';

export interface UploadFileDto {
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    extension?: string | null;
    folderId?: string | null;
    projectId?: string | null;
    applicationId?: string | null;
}

export interface UpdateFileDto {
    name?: string;
    folderId?: string | null;
}

export interface FileQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    folderId?: string;
    mimeType?: string;
    sortBy?: 'name' | 'createdAt' | 'size';
    sortOrder?: 'asc' | 'desc';
}

export interface FileResponseDto {
    id: string;
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    extension: string | null;
    folderId: string | null;
    folder: { id: string; name: string } | null;
    isShared: boolean;
    createdAt: Date;
    updatedAt: Date;
}

type FileWithRelations = File & {
    folder?: { id: string; name: string } | null;
};

export function toFileResponseDto(f: FileWithRelations): FileResponseDto {
    return {
        id: f.id,
        name: f.name,
        originalName: f.originalName,
        mimeType: f.mimeType,
        size: Number(f.size),
        path: f.path,
        extension: f.extension,
        folderId: f.folderId,
        folder: f.folder || null,
        isShared: f.isShared,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
    };
}
