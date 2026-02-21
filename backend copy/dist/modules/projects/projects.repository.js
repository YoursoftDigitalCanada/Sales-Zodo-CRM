"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectsRepository = exports.ProjectsRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const projectInclude = {
    client: { select: { id: true, clientName: true } },
    projectManager: { include: { user: { select: { firstName: true, lastName: true } } } },
    teamMembers: { include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } } },
    _count: { select: { tasks: true } },
};
class ProjectsRepository {
    async create(tenantId, data) {
        return prisma.project.create({
            data: {
                tenantId,
                projectTitle: data.projectTitle,
                description: data.description,
                clientId: data.clientId,
                category: data.category,
                projectManagerId: data.projectManagerId,
                startDate: data.startDate ? new Date(data.startDate) : null,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                progressPercentage: data.progressPercentage || 0,
                status: data.status || 'NOT_STARTED',
                priority: data.priority || 'MEDIUM',
                milestones: data.milestones || [],
                attachments: data.attachments || [],
                budget: data.budget,
                estimatedHours: data.estimatedHours,
                tags: data.tags || [],
                ...(data.teamMembers?.length && {
                    teamMembers: { create: data.teamMembers.map((employeeId) => ({ employeeId })) },
                }),
            },
            include: projectInclude,
        });
    }
    async findById(id, tenantId) {
        return prisma.project.findFirst({ where: { id, tenantId }, include: projectInclude });
    }
    async findMany(tenantId, query) {
        const { page = 1, limit = 20, search, status, priority, clientId, projectManagerId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where = {
            tenantId,
            ...(status && { status }),
            ...(priority && { priority }),
            ...(clientId && { clientId }),
            ...(projectManagerId && { projectManagerId }),
            ...(search && { projectTitle: { contains: search, mode: 'insensitive' } }),
        };
        const [data, total] = await Promise.all([
            prisma.project.findMany({ where, include: projectInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.project.count({ where }),
        ]);
        return { data, total };
    }
    async update(id, data) {
        // Handle team members update separately
        if (data.teamMembers) {
            await prisma.projectMember.deleteMany({ where: { projectId: id } });
        }
        return prisma.project.update({
            where: { id },
            data: {
                ...(data.projectTitle !== undefined && { projectTitle: data.projectTitle }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.clientId !== undefined && { clientId: data.clientId }),
                ...(data.category !== undefined && { category: data.category }),
                ...(data.projectManagerId !== undefined && { projectManagerId: data.projectManagerId }),
                ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
                ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
                ...(data.progressPercentage !== undefined && { progressPercentage: data.progressPercentage }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.priority !== undefined && { priority: data.priority }),
                ...(data.milestones !== undefined && { milestones: data.milestones }),
                ...(data.attachments !== undefined && { attachments: data.attachments }),
                ...(data.budget !== undefined && { budget: data.budget }),
                ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
                ...(data.tags !== undefined && { tags: data.tags }),
                ...(data.teamMembers && {
                    teamMembers: { create: data.teamMembers.map((employeeId) => ({ employeeId })) },
                }),
            },
            include: projectInclude,
        });
    }
    async delete(id) {
        await prisma.projectMember.deleteMany({ where: { projectId: id } });
        return prisma.project.delete({ where: { id } });
    }
}
exports.ProjectsRepository = ProjectsRepository;
exports.projectsRepository = new ProjectsRepository();
//# sourceMappingURL=projects.repository.js.map