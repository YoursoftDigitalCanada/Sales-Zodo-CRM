import { ClientGroup } from '@prisma/client';

// ============================================================================
// GROUPS DTOs - Using ClientGroup model (not non-existent "Group")
// ============================================================================

export interface CreateGroupDto {
    name: string;
    description?: string | null;
    color?: string | null;
    autoUpdateEnabled?: boolean;
    autoUpdateRules?: Record<string, unknown>;
}

export interface UpdateGroupDto extends Partial<CreateGroupDto> { }

export interface GroupQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'name' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}

export interface GroupResponseDto {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    autoUpdateEnabled: boolean;
    autoUpdateRules: Record<string, unknown> | null;
    membersCount: number;
    createdAt: Date;
    updatedAt: Date;
}

type ClientGroupWithRelations = ClientGroup & {
    _count?: { members: number };
    members?: { id: string; clientId: string; addedManually: boolean }[];
};

export function toGroupResponseDto(g: ClientGroupWithRelations): GroupResponseDto {
    return {
        id: g.id,
        name: g.name,
        description: g.description,
        color: g.color,
        autoUpdateEnabled: g.autoUpdateEnabled,
        autoUpdateRules: (g.autoUpdateRules as Record<string, unknown>) || null,
        membersCount: g._count?.members || 0,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
    };
}
