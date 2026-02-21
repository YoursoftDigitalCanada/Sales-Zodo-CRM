import { Group, GroupType } from '@prisma/client';
export interface CreateGroupDto {
    groupName: string;
    description?: string | null;
    groupType?: GroupType;
    icon?: string | null;
    color?: string | null;
    autoUpdateMembers?: boolean;
}
export interface UpdateGroupDto extends Partial<CreateGroupDto> {
}
export interface GroupQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    groupType?: GroupType;
    sortBy?: 'groupName' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}
export interface GroupResponseDto {
    id: string;
    groupName: string;
    description: string | null;
    groupType: GroupType;
    icon: string | null;
    color: string | null;
    autoUpdateMembers: boolean;
    membersCount: number;
    createdAt: Date;
    updatedAt: Date;
}
type GroupWithCount = Group & {
    _count?: {
        members: number;
    };
};
export declare function toGroupResponseDto(group: GroupWithCount): GroupResponseDto;
export {};
//# sourceMappingURL=groups.dto.d.ts.map