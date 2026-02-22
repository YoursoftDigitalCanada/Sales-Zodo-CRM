import { PrismaClient, Prisma, TaskStatus, TaskPriority } from '@prisma/client';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './tasks.dto';

const prisma = new PrismaClient();
const taskInclude = {
    assignedTo: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
    createdBy: { include: { user: { select: { firstName: true, lastName: true } } } },
    project: { select: { id: true, name: true } },
    client: { select: { id: true, clientName: true } },
};

export class TasksRepository {
    async create(tenantId: string, data: CreateTaskDto, createdById?: string) {
        return prisma.task.create({
            data: {
                tenantId,
                title: data.title,
                description: data.description,
                status: data.status || 'TODO',
                priority: data.priority || 'MEDIUM',
                assignedToId: data.assignedToId || null,
                createdById: createdById || null,
                dueDate: data.dueDate ? new Date(data.dueDate as string) : null,
                projectId: data.projectId || null,
                clientId: data.clientId || null,
                estimatedTime: data.estimatedHours ? Math.round(data.estimatedHours * 60) : null,
            },
            include: taskInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.task.findFirst({ where: { id, tenantId }, include: taskInclude });
    }

    async findMany(tenantId: string, query: TaskQueryDto) {
        const { page = 1, limit = 20, search, status, priority, assignedToId, projectId, clientId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where: Prisma.TaskWhereInput = {
            tenantId,
            ...(status && { status }),
            ...(priority && { priority }),
            ...(assignedToId && { assignedToId }),
            ...(projectId && { projectId }),
            ...(clientId && { clientId }),
            ...(search && { title: { contains: search, mode: 'insensitive' as const } }),
        };
        const [data, total] = await Promise.all([
            prisma.task.findMany({ where, include: taskInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.task.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateTaskDto) {
        // Verify tenant ownership
        const existing = await prisma.task.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Task not found or access denied');

        return prisma.task.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.priority !== undefined && { priority: data.priority }),
                ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
                ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate as string) : null }),
                ...(data.projectId !== undefined && { projectId: data.projectId }),
                ...(data.clientId !== undefined && { clientId: data.clientId }),
            },
            include: taskInclude,
        });
    }

    async updateStatus(id: string, tenantId: string, status: TaskStatus) {
        // Verify tenant ownership
        const existing = await prisma.task.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Task not found or access denied');

        return prisma.task.update({
            where: { id },
            data: {
                status,
                completedAt: status === 'DONE' ? new Date() : null,
            },
            include: taskInclude,
        });
    }

    async delete(id: string, tenantId: string) {
        // Tenant-scoped delete
        const existing = await prisma.task.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Task not found or access denied');
        return prisma.task.delete({ where: { id } });
    }

    async employeeExists(employeeId: string, tenantId: string): Promise<boolean> {
        const count = await prisma.employee.count({ where: { id: employeeId, tenantId } });
        return count > 0;
    }

    async projectExists(projectId: string, tenantId: string): Promise<boolean> {
        const count = await prisma.project.count({ where: { id: projectId, tenantId } });
        return count > 0;
    }

    async assign(id: string, tenantId: string, assignedToId: string | null) {
        // Verify tenant ownership
        const existing = await prisma.task.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Task not found or access denied');

        return prisma.task.update({
            where: { id },
            data: { assignedToId },
            include: taskInclude,
        });
    }

    async getKanban(tenantId: string, filters?: { assignedToId?: string; projectId?: string }) {
        const where: Prisma.TaskWhereInput = {
            tenantId,
            ...(filters?.assignedToId && { assignedToId: filters.assignedToId }),
            ...(filters?.projectId && { projectId: filters.projectId }),
        };
        const tasks = await prisma.task.findMany({ where, include: taskInclude, orderBy: { createdAt: 'desc' } });

        const statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
        return statuses.map(status => ({
            status,
            tasks: tasks.filter(t => t.status === status),
            count: tasks.filter(t => t.status === status).length,
        }));
    }

    async getStatistics(tenantId: string) {
        const [total, todo, inProgress, review, done, overdue] = await Promise.all([
            prisma.task.count({ where: { tenantId } }),
            prisma.task.count({ where: { tenantId, status: 'TODO' } }),
            prisma.task.count({ where: { tenantId, status: 'IN_PROGRESS' } }),
            prisma.task.count({ where: { tenantId, status: 'REVIEW' } }),
            prisma.task.count({ where: { tenantId, status: 'DONE' } }),
            prisma.task.count({ where: { tenantId, status: { not: 'DONE' }, dueDate: { lt: new Date() } } }),
        ]);
        return { total, todo, inProgress, review, done, overdue };
    }
}

export const tasksRepository = new TasksRepository();
