"use strict";
// ============================================================================
// REQUEST DTOs
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLeadSourceResponseDto = toLeadSourceResponseDto;
// ============================================================================
// MAPPER
// ============================================================================
function toLeadSourceResponseDto(source) {
    return {
        id: source.id,
        name: source.name,
        description: source.description || undefined,
        isActive: source.isActive,
        leadCount: source._count?.leads,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
    };
}
//# sourceMappingURL=lead-sources.dto.js.map