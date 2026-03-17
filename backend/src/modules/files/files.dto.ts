import { File } from '@prisma/client';

// ============================================================================
// FILES DTOs — Enterprise File Manager
// ============================================================================

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
    checksum?: string | null;
    fromAddress?: string;
}

export interface UpdateFileDto {
    name?: string;
    folderId?: string | null;
}

export interface MoveFileDto {
    folderId: string | null;
}

export interface CopyFileDto {
    folderId?: string | null;
    name?: string;
}

export interface ShareFileDto {
    expiresInHours?: number; // hours until link expires, null = never
}

export interface BulkActionDto {
    fileIds: string[];
}

export interface BulkMoveDto {
    fileIds: string[];
    folderId: string | null;
}

export interface FileQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    folderId?: string;
    clientId?: string;
    projectId?: string;
    mimeType?: string;
    tag?: string;
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
    isStarred: boolean;
    shareLink: string | null;
    shareExpiresAt: Date | null;
    checksum: string | null;
    tags: { id: string; name: string; color: string | null }[];
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface StorageAnalyticsDto {
    totalUsed: number;       // bytes
    totalLimit: number;      // bytes (plan-based)
    fileCount: number;
    breakdown: {
        documents: number;
        images: number;
        videos: number;
        audio: number;
        other: number;
    };
}

type FileWithRelations = File & {
    folder?: { id: string; name: string } | null;
    tags?: { tag: { id: string; name: string; color: string | null } }[];
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
        folder: (f as any).folder || null,
        isShared: f.isShared,
        isStarred: (f as any).isStarred ?? false,
        shareLink: f.shareLink,
        shareExpiresAt: f.shareExpiresAt,
        checksum: f.checksum,
        tags: (f.tags || []).map((ft: any) => ({
            id: ft.tag?.id || ft.id,
            name: ft.tag?.name || ft.name,
            color: ft.tag?.color || ft.color || null,
        })),
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        deletedAt: f.deletedAt,
    };
}
