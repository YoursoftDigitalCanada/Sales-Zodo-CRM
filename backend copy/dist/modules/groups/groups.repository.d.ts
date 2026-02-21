import { CreateGroupDto, UpdateGroupDto, GroupQueryDto } from './groups.dto';
export declare class GroupsRepository {
    create(tenantId: string, data: CreateGroupDto): Promise<any>;
    findById(id: string, tenantId: string): Promise<any>;
    findMany(tenantId: string, query: GroupQueryDto): Promise<{
        data: any;
        total: any;
    }>;
    update(id: string, data: UpdateGroupDto): Promise<any>;
    delete(id: string): Promise<any>;
    addMembers(id: string, clientIds: string[]): Promise<any>;
    removeMembers(id: string, clientIds: string[]): Promise<void>;
}
export declare const groupsRepository: GroupsRepository;
//# sourceMappingURL=groups.repository.d.ts.map