"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toProjectResponseDto = toProjectResponseDto;
function toProjectResponseDto(p) {
    return {
        id: p.id,
        projectTitle: p.projectTitle,
        description: p.description,
        client: p.client ? { id: p.client.id, clientName: p.client.clientName } : null,
        category: p.category,
        projectManager: p.projectManager ? { id: p.projectManager.id, firstName: p.projectManager.user.firstName, lastName: p.projectManager.user.lastName } : null,
        startDate: p.startDate,
        dueDate: p.dueDate,
        progressPercentage: p.progressPercentage,
        status: p.status,
        priority: p.priority,
        milestones: p.milestones || [],
        teamMembers: (p.teamMembers || []).map((tm) => ({ id: tm.employee.id, firstName: tm.employee.user.firstName, lastName: tm.employee.user.lastName })),
        attachments: p.attachments || [],
        budget: p.budget ? Number(p.budget) : null,
        estimatedHours: p.estimatedHours ? Number(p.estimatedHours) : null,
        tags: p.tags || [],
        tasksCount: p._count?.tasks || 0,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    };
}
//# sourceMappingURL=projects.dto.js.map