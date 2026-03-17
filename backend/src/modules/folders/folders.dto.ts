import { Folder } from '@prisma/client';

export interface CreateFolderDto {
    name: string;
    parentId?: string | null;
    isShared?: boolean;
    sharedWith?: string[] | null;
}

export interface UpdateFolderDto extends Partial<CreateFolderDto> { }

export interface FolderQueryDto {
    page?: number;
    limit?: number;
    parentId?: string | null;
    search?: string;
    sortBy?: 'name' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}

export interface FolderResponseDto {
    id: string;
    name: string;
    isShared: boolean;
    isStarred: boolean;
    parentId: string | null;
    parent: { id: string; name: string } | null;
    filesCount: number;
    childrenCount: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

type FolderWithRelations = Folder & {
    parent?: { id: string; name: string } | null;
    _count?: { files: number; children: number };
};

export function toFolderResponseDto(f: FolderWithRelations): FolderResponseDto {
    return {
        id: f.id,
        name: f.name,
        isShared: f.isShared,
        isStarred: (f as any).isStarred ?? false,
        parentId: f.parentId,
        parent: f.parent || null,
        filesCount: f._count?.files || 0,
        childrenCount: f._count?.children || 0,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        deletedAt: f.deletedAt,
    };
}
