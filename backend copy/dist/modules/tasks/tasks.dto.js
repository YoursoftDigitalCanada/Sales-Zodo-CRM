"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTaskResponseDto = toTaskResponseDto;
function toTaskResponseDto(t) {
    return {
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo || null,
        createdBy: t.createdBy || null,
        dueDate: t.dueDate,
        startDate: t.startDate,
        completedAt: t.completedAt,
        estimatedTime: t.estimatedTime,
        project: t.project || null,
        client: t.client || null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
    };
}
//# sourceMappingURL=tasks.dto.js.map