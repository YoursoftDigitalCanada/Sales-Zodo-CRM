"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toFileResponseDto = toFileResponseDto;
function toFileResponseDto(f) {
    return {
        id: f.id,
        name: f.name,
        description: f.description,
        mimeType: f.mimeType,
        size: Number(f.size),
        url: f.url,
        folder: f.folder ? { id: f.folder.id, name: f.folder.name } : null,
        uploadedBy: f.uploadedBy ? { id: f.uploadedBy.id, firstName: f.uploadedBy.user.firstName, lastName: f.uploadedBy.user.lastName } : null,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
    };
}
//# sourceMappingURL=files.dto.js.map