"use strict";
// ============================================================================
// REQUEST DTOs
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTagResponseDto = toTagResponseDto;
// ============================================================================
// MAPPER
// ============================================================================
function toTagResponseDto(tag) {
    return {
        id: tag.id,
        name: tag.name,
        color: tag.color || undefined,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
    };
}
//# sourceMappingURL=tags.dto.js.map