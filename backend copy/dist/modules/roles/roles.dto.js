"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRoleResponseDto = toRoleResponseDto;
function toRoleResponseDto(role) {
    return {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isDefault: role.isDefault,
        usersCount: role._count?.users || 0,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
    };
}
//# sourceMappingURL=roles.dto.js.map