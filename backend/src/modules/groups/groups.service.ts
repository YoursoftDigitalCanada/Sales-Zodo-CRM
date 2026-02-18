import { groupsRepository } from './groups.repository';
import { CreateGroupDto, UpdateGroupDto, GroupQueryDto, toGroupResponseDto } from './groups.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class GroupsService {
    async create(tenantId: string, data: CreateGroupDto) {
        const group = await groupsRepository.create(tenantId, data);
        return toGroupResponseDto(group);
    }

    async getById(id: string, tenantId: string) {
        const group = await groupsRepository.findById(id, tenantId);
        if (!group) throw new NotFoundError('Group not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toGroupResponseDto(group);
    }

    async getMany(tenantId: string, query: GroupQueryDto) {
        const { data, total } = await groupsRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toGroupResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateGroupDto) {
        const existing = await groupsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Group not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const group = await groupsRepository.update(id, data);
        return toGroupResponseDto(group);
    }

    async delete(id: string, tenantId: string) {
        const existing = await groupsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Group not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await groupsRepository.delete(id);
    }

    async addMembers(id: string, tenantId: string, clientIds: string[]) {
        const existing = await groupsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Group not found', ErrorCodes.RESOURCE_NOT_FOUND);
        for (const clientId of clientIds) {
            await groupsRepository.addMember(id, clientId);
        }
    }

    async removeMembers(id: string, tenantId: string, clientIds: string[]) {
        const existing = await groupsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Group not found', ErrorCodes.RESOURCE_NOT_FOUND);
        for (const clientId of clientIds) {
            await groupsRepository.removeMember(id, clientId);
        }
    }
}

export const groupsService = new GroupsService();
