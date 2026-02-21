import { Prisma } from '@prisma/client';
import { UploadFileDto, UpdateFileDto, FileQueryDto } from './files.dto';
export declare class FilesRepository {
    create(tenantId: string, data: UploadFileDto, uploadedById?: string): Promise<{
        path: string;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        projectId: string | null;
        size: bigint;
        originalName: string;
        mimeType: string;
        extension: string | null;
        checksum: string | null;
        folderId: string | null;
        applicationId: string | null;
        isShared: boolean;
        sharedWith: Prisma.JsonValue | null;
        shareLink: string | null;
        shareExpiresAt: Date | null;
        deletedAt: Date | null;
    }>;
    findById(id: string, tenantId: string): Promise<({
        folder: {
            id: string;
            name: string;
        } | null;
        uploadedBy: never;
    } & {
        path: string;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        projectId: string | null;
        size: bigint;
        originalName: string;
        mimeType: string;
        extension: string | null;
        checksum: string | null;
        folderId: string | null;
        applicationId: string | null;
        isShared: boolean;
        sharedWith: Prisma.JsonValue | null;
        shareLink: string | null;
        shareExpiresAt: Date | null;
        deletedAt: Date | null;
    }) | null>;
    findMany(tenantId: string, query: FileQueryDto): Promise<{
        data: ({
            folder: {
                id: string;
                name: string;
            } | null;
            uploadedBy: never;
        } & {
            path: string;
            tenantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            projectId: string | null;
            size: bigint;
            originalName: string;
            mimeType: string;
            extension: string | null;
            checksum: string | null;
            folderId: string | null;
            applicationId: string | null;
            isShared: boolean;
            sharedWith: Prisma.JsonValue | null;
            shareLink: string | null;
            shareExpiresAt: Date | null;
            deletedAt: Date | null;
        })[];
        total: number;
    }>;
    update(id: string, data: UpdateFileDto): Promise<{
        folder: {
            id: string;
            name: string;
        } | null;
        uploadedBy: never;
    } & {
        path: string;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        projectId: string | null;
        size: bigint;
        originalName: string;
        mimeType: string;
        extension: string | null;
        checksum: string | null;
        folderId: string | null;
        applicationId: string | null;
        isShared: boolean;
        sharedWith: Prisma.JsonValue | null;
        shareLink: string | null;
        shareExpiresAt: Date | null;
        deletedAt: Date | null;
    }>;
    delete(id: string): Promise<{
        path: string;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        projectId: string | null;
        size: bigint;
        originalName: string;
        mimeType: string;
        extension: string | null;
        checksum: string | null;
        folderId: string | null;
        applicationId: string | null;
        isShared: boolean;
        sharedWith: Prisma.JsonValue | null;
        shareLink: string | null;
        shareExpiresAt: Date | null;
        deletedAt: Date | null;
    }>;
}
export declare const filesRepository: FilesRepository;
//# sourceMappingURL=files.repository.d.ts.map