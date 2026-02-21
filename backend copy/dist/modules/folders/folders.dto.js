"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toFolderResponseDto = toFolderResponseDto;
function toFolderResponseDto(f) {
    return {
        id: f.id,
        name: f.name,
        description: f.description,
        parent: f.parent ? { id: f.parent.id, name: f.parent.name } : null,
        filesCount: f._count?.files || 0,
        subFoldersCount: f._count?.children || 0,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
    };
}
//# sourceMappingURL=folders.dto.js.map