import { Prisma } from '@prisma/client';
import { CreateTagDto, UpdateTagDto, TagQueryDto } from './tags.dto';
export declare class TagsRepository {
    create(tenantId: string, data: CreateTagDto): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        color: string | null;
    }>;
    findById(id: string, tenantId: string): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        color: string | null;
    } | null>;
    findByName(name: string, tenantId: string, excludeId?: string): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        color: string | null;
    } | null>;
    findMany(tenantId: string, query: TagQueryDto): Promise<{
        data: {
            tenantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            color: string | null;
        }[];
        total: number;
    }>;
    findAll(tenantId: string): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        color: string | null;
    }[]>;
    update(id: string, tenantId: string, data: UpdateTagDto): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        color: string | null;
    }>;
    delete(id: string, tenantId: string): Promise<Prisma.BatchPayload>;
    hasAssociations(id: string): Promise<boolean>;
}
export declare const tagsRepository: TagsRepository;
//# sourceMappingURL=tags.repository.d.ts.map