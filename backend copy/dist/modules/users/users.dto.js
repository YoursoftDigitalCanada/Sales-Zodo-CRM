"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toUserResponseDto = toUserResponseDto;
function toUserResponseDto(user) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        phone: user.phone,
        avatar: user.avatar,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        role: user.role ? { id: user.role.id, name: user.role.name } : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
//# sourceMappingURL=users.dto.js.map