import { PrismaClient, Prisma, ProjectStatus } from '@prisma/client';
import { CreateProjectDto, UpdateProjectDto, ProjectQueryDto } from './projects.dto';

const prisma = new PrismaClient();
const projectInclude = {
    client: { select: { id: true, clientName: true } },
    members: { include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } } },
    _count: { select: { tasks: true, files: true } },
};

export class ProjectsRepository {
    async create(tenantId: string, data: CreateProjectDto) {
        return prisma.project.create({
            data: {
                tenantId,
                name: data.name,
                description: data.description,
                code: data.code,
                clientId: data.clientId,
                startDate: data.startDate ? new Date(data.startDate as string) : null,
                endDate: data.endDate ? new Date(data.endDate as string) : null,
                progress: data.progress || 0,
                status: data.status || 'PLANNING',
                budget: data.budget,
                currency: data.currency || 'USD',
                ...(data.teamMembers?.length && {
                    members: { create: data.teamMembers.map((employeeId) => ({ employeeId })) },
                }),
            },
            include: projectInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.project.findFirst({ where: { id, tenantId }, include: projectInclude });
    }

    async findMany(tenantId: string, query: ProjectQueryDto) {
        const { page = 1, limit = 20, search, status, clientId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where: Prisma.ProjectWhereInput = {
            tenantId,
            ...(status && { status }),
            ...(clientId && { clientId }),
            ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
        };
        const [data, total] = await Promise.all([
            prisma.project.findMany({ where, include: projectInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.project.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateProjectDto) {
        // Verify tenant ownership
        const existing = await prisma.project.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Project not found or access denied');

        // Handle team members update separately
        if (data.teamMembers) {
            await prisma.projectMember.deleteMany({ where: { projectId: id } });
        }

        return prisma.project.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.code !== undefined && { code: data.code }),
                ...(data.clientId !== undefined && { clientId: data.clientId }),
                ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate as string) : null }),
                ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate as string) : null }),
                ...(data.progress !== undefined && { progress: data.progress }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.budget !== undefined && { budget: data.budget }),
                ...(data.currency !== undefined && { currency: data.currency }),
                ...(data.teamMembers && {
                    members: { create: data.teamMembers.map((employeeId) => ({ employeeId })) },
                }),
            },
            include: projectInclude,
        });
    }

    async delete(id: string, tenantId: string) {
        // Verify tenant ownership
        const existing = await prisma.project.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Project not found or access denied');

        await prisma.projectMember.deleteMany({ where: { projectId: id } });
        return prisma.project.delete({ where: { id } });
    }
}

export const projectsRepository = new ProjectsRepository();
