import { groupsRepository } from './groups.repository';
import { CreateGroupDto, UpdateGroupDto, GroupQueryDto, toGroupResponseDto } from './groups.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';

export class GroupsService {
    async create(tenantId: string, data: CreateGroupDto) {
        const group = await groupsRepository.create(tenantId, data);
        const dto = toGroupResponseDto(group);

        activityLogger.log({
            tenantId, entityType: 'ClientGroup', entityId: dto.id,
            action: 'CREATE', module: 'groups',
            description: `Created group "${(group as any).name || dto.id}"`,
            metadata: { groupName: (group as any).name },
        });

        eventBus.emit('group.created', {
            tenantId,
            groupId: dto.id,
            groupName: (group as any).name || '',
        });

        return dto;
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
        const group = await groupsRepository.update(id, tenantId, data);
        const dto = toGroupResponseDto(group);

        activityLogger.log({
            tenantId, entityType: 'ClientGroup', entityId: dto.id,
            action: 'UPDATE', module: 'groups',
            description: `Updated group "${(group as any).name || dto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        eventBus.emit('group.updated', {
            tenantId,
            groupId: dto.id,
            groupName: (group as any).name || '',
            updatedFields: Object.keys(data),
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await groupsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Group not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'ClientGroup', entityId: id,
            action: 'DELETE', module: 'groups',
            description: `Deleted group "${(existing as any).name || id}"`,
        });

        await groupsRepository.delete(id, tenantId);
    }

    async addMembers(id: string, tenantId: string, clientIds: string[]) {
        const existing = await groupsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Group not found', ErrorCodes.RESOURCE_NOT_FOUND);
        for (const clientId of clientIds) {
            await groupsRepository.addMember(id, clientId);
        }

        activityLogger.log({
            tenantId, entityType: 'ClientGroup', entityId: id,
            action: 'UPDATE', module: 'groups',
            description: `Added ${clientIds.length} member(s) to group "${(existing as any).name || id}"`,
            metadata: { addedClientIds: clientIds },
        });
    }

    async removeMembers(id: string, tenantId: string, clientIds: string[]) {
        const existing = await groupsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Group not found', ErrorCodes.RESOURCE_NOT_FOUND);
        for (const clientId of clientIds) {
            await groupsRepository.removeMember(id, clientId);
        }

        activityLogger.log({
            tenantId, entityType: 'ClientGroup', entityId: id,
            action: 'UPDATE', module: 'groups',
            description: `Removed ${clientIds.length} member(s) from group "${(existing as any).name || id}"`,
            metadata: { removedClientIds: clientIds },
        });
    }
}

export const groupsService = new GroupsService();
