import { CreateGroupDto, UpdateGroupDto, GroupQueryDto } from './groups.dto';
export declare class GroupsService {
    create(tenantId: string, data: CreateGroupDto): Promise<import("./groups.dto").GroupResponseDto>;
    getById(id: string, tenantId: string): Promise<import("./groups.dto").GroupResponseDto>;
    getMany(tenantId: string, query: GroupQueryDto): Promise<{
        data: any;
        meta: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    update(id: string, tenantId: string, data: UpdateGroupDto): Promise<import("./groups.dto").GroupResponseDto>;
    delete(id: string, tenantId: string): Promise<void>;
    addMembers(id: string, tenantId: string, clientIds: string[]): Promise<void>;
    removeMembers(id: string, tenantId: string, clientIds: string[]): Promise<void>;
}
export declare const groupsService: GroupsService;
//# sourceMappingURL=groups.service.d.ts.map