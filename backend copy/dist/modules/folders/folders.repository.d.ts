import { Prisma } from '@prisma/client';
import { CreateFolderDto, UpdateFolderDto, FolderQueryDto } from './folders.dto';
export declare class FoldersRepository {
    create(tenantId: string, data: CreateFolderDto): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isShared: boolean;
        sharedWith: Prisma.JsonValue | null;
        deletedAt: Date | null;
        parentId: string | null;
    }>;
    findById(id: string, tenantId: string): Promise<({
        _count: {
            files: number;
            children: number;
        };
        parent: {
            id: string;
            name: string;
        } | null;
    } & {
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isShared: boolean;
        sharedWith: Prisma.JsonValue | null;
        deletedAt: Date | null;
        parentId: string | null;
    }) | null>;
    findMany(tenantId: string, query: FolderQueryDto): Promise<{
        data: ({
            _count: {
                files: number;
                children: number;
            };
            parent: {
                id: string;
                name: string;
            } | null;
        } & {
            tenantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isShared: boolean;
            sharedWith: Prisma.JsonValue | null;
            deletedAt: Date | null;
            parentId: string | null;
        })[];
        total: number;
    }>;
    update(id: string, data: UpdateFolderDto): Promise<{
        _count: {
            files: number;
            children: number;
        };
        parent: {
            id: string;
            name: string;
        } | null;
    } & {
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isShared: boolean;
        sharedWith: Prisma.JsonValue | null;
        deletedAt: Date | null;
        parentId: string | null;
    }>;
    delete(id: string): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isShared: boolean;
        sharedWith: Prisma.JsonValue | null;
        deletedAt: Date | null;
        parentId: string | null;
    }>;
}
export declare const foldersRepository: FoldersRepository;
//# sourceMappingURL=folders.repository.d.ts.map