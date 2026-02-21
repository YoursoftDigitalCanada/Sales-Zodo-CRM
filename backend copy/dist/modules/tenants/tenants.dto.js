"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTenantResponseDto = toTenantResponseDto;
function toTenantResponseDto(t) {
    return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        domain: t.domain,
        plan: t.plan,
        isActive: t.isActive,
        settings: t.settings || {},
        usersCount: t._count?.users || 0,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
    };
}
//# sourceMappingURL=tenants.dto.js.map