"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toEmailTemplateResponseDto = toEmailTemplateResponseDto;
function toEmailTemplateResponseDto(t) {
    return {
        id: t.id,
        name: t.name,
        subject: t.subject,
        body: t.body,
        type: t.type,
        variables: t.variables || [],
        isActive: t.isActive,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
    };
}
//# sourceMappingURL=emails.dto.js.map