import { Folder } from '@prisma/client';
export interface CreateFolderDto {
    name: string;
    parentId?: string | null;
    description?: string | null;
}
export interface UpdateFolderDto extends Partial<CreateFolderDto> {
}
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
    description: string | null;
    parent: {
        id: string;
        name: string;
    } | null;
    filesCount: number;
    subFoldersCount: number;
    createdAt: Date;
    updatedAt: Date;
}
type FolderWithRelations = Folder & {
    parent?: {
        id: string;
        name: string;
    } | null;
    _count?: {
        files: number;
        children: number;
    };
};
export declare function toFolderResponseDto(f: FolderWithRelations): FolderResponseDto;
export {};
//# sourceMappingURL=folders.dto.d.ts.map