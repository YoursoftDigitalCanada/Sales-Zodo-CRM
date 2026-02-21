"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toGroupResponseDto = toGroupResponseDto;
function toGroupResponseDto(group) {
    return {
        id: group.id,
        groupName: group.groupName,
        description: group.description,
        groupType: group.groupType,
        icon: group.icon,
        color: group.color,
        autoUpdateMembers: group.autoUpdateMembers,
        membersCount: group._count?.members || 0,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
    };
}
//# sourceMappingURL=groups.dto.js.map