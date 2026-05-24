import { Prisma, TaskStatus, TaskPriority } from '@prisma/client';
import {
    CreateTaskDto,
    UpdateTaskDto,
    TaskQueryDto,
    buildTaskStoredTagNames,
    parseTaskStoredTags,
} from './tasks.dto';
import {
    DataAccessContext,
    buildTaskAccessWhere,
    mergeWhereWithAccess,
} from '../../common/access/data-access';

import { prisma } from '../../config/database';
const taskInclude = {
    assignedTo: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
    createdBy: { include: { user: { select: { firstName: true, lastName: true } } } },
    project: { select: { id: true, name: true } },
    client: { select: { id: true, clientName: true } },
    tags: {
        include: {
            tag: {
                select: {
                    name: true,
                    color: true,
                },
            },
        },
    },
    subtasks: {
        select: {
            id: true,
            title: true,
            status: true,
            completedAt: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: {
            createdAt: 'asc' as const,
        },
    },
};

export class TasksRepository {
    private async syncTaskTags(
        tx: Prisma.TransactionClient,
        taskId: string,
        tenantId: string,
        data: {
            category?: string | null;
            tags?: string[] | null;
            isStarred?: boolean;
            isRecurring?: boolean;
        },
    ): Promise<void> {
        const storedNames = buildTaskStoredTagNames(data);
        await tx.taskTag.deleteMany({ where: { taskId, tenantId } });

        if (storedNames.length === 0) {
            return;
        }

        const existingTags = await tx.tag.findMany({
            where: {
                tenantId,
                name: { in: storedNames },
            },
            select: {
                id: true,
                name: true,
            },
        });
        const existingMap = new Map(existingTags.map((tag) => [tag.name, tag.id]));

        for (const name of storedNames) {
            if (existingMap.has(name)) {
                continue;
            }

            const tag = await tx.tag.create({
                data: {
                    tenantId,
                    name,
                },
                select: {
                    id: true,
                    name: true,
                },
            });
            existingMap.set(tag.name, tag.id);
        }

        await tx.taskTag.createMany({
            data: storedNames.map((name) => ({
                tenantId,
                taskId,
                tagId: existingMap.get(name)!,
            })),
            skipDuplicates: true,
        });
    }

    private async syncSubtasks(
        tx: Prisma.TransactionClient,
        parentTaskId: string,
        tenantId: string,
        subtasks: NonNullable<CreateTaskDto['subtasks']>,
        createdById?: string | null,
    ): Promise<void> {
        const existingSubtasks = await tx.task.findMany({
            where: {
                tenantId,
                parentTaskId,
            },
            select: {
                id: true,
            },
        });
        const existingIds = new Set(existingSubtasks.map((subtask) => subtask.id));
        const incomingExistingIds = subtasks
            .map((subtask) => subtask.id)
            .filter((id): id is string => Boolean(id && existingIds.has(id)));

        await tx.task.deleteMany({
            where: {
                tenantId,
                parentTaskId,
                ...(incomingExistingIds.length > 0
                    ? { id: { notIn: incomingExistingIds } }
                    : {}),
            },
        });

        for (const subtask of subtasks) {
            const payload = {
                title: subtask.title.trim(),
                status: subtask.completed ? TaskStatus.DONE : TaskStatus.TODO,
                completedAt: subtask.completed ? new Date() : null,
            };

            if (subtask.id && existingIds.has(subtask.id)) {
                await tx.task.update({
                    where: { id_tenantId: { id: subtask.id, tenantId } },
                    data: payload,
                });
                continue;
            }

            await tx.task.create({
                data: {
                    tenantId,
                    parentTaskId,
                    createdById: createdById || null,
                    description: null,
                    priority: TaskPriority.LOW,
                    ...payload,
                },
            });
        }
    }

    async create(tenantId: string, data: CreateTaskDto, createdById?: string) {
        return prisma.$transaction(async (tx) => {
            const task = await tx.task.create({
                data: {
                    tenantId,
                    title: data.title,
                    description: data.description,
                    status: data.status || 'TODO',
                    priority: data.priority || 'MEDIUM',
                    assignedToId: data.assignedToId || null,
                    createdById: createdById || null,
                    dueDate: data.dueDate ? new Date(data.dueDate as string) : null,
                    startDate: data.startDate ? new Date(data.startDate as string) : null,
                    projectId: data.projectId || null,
                    clientId: data.clientId || null,
                    leadId: data.leadId || null,
                    referenceDoctype: data.contactId ? 'Contact' : data.referenceDoctype || null,
                    referenceDocname: data.contactId ? data.contactId : data.referenceDocname || null,
                    estimatedTime: data.estimatedHours ? Math.round(data.estimatedHours * 60) : null,
                    actualTime: data.actualMinutes ?? null,
                },
            });

            await this.syncTaskTags(tx, task.id, tenantId, {
                category: data.category,
                tags: data.tags,
                isStarred: data.isStarred,
                isRecurring: data.isRecurring,
            });

            if (data.subtasks && data.subtasks.length > 0) {
                await this.syncSubtasks(tx, task.id, tenantId, data.subtasks, createdById || null);
            }

            return tx.task.findFirstOrThrow({
                where: { id: task.id, tenantId },
                include: taskInclude,
            });
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.task.findFirst({ where: { id, tenantId, parentTaskId: null }, include: taskInclude });
    }

    async findMany(tenantId: string, query: TaskQueryDto, dataAccess?: DataAccessContext) {
        const { page = 1, limit = 20, search, status, priority, assignedToId, projectId, clientId, leadId, contactId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const baseWhere: Prisma.TaskWhereInput = {
            tenantId,
            parentTaskId: null,
            ...(status && { status }),
            ...(priority && { priority }),
            ...(assignedToId && { assignedToId }),
            ...(projectId && { projectId }),
            ...(clientId && { clientId }),
            ...(leadId && { leadId }),
            ...(contactId && { referenceDoctype: 'Contact', referenceDocname: contactId }),
            ...(search && { title: { contains: search, mode: 'insensitive' as const } }),
        };
        const where = mergeWhereWithAccess(baseWhere, buildTaskAccessWhere(dataAccess));
        const [data, total] = await Promise.all([
            prisma.task.findMany({ where, include: taskInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.task.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateTaskDto) {
        const existing = await prisma.task.findFirst({ where: { id, tenantId, parentTaskId: null }, include: taskInclude });
        if (!existing) throw new Error('Task not found or access denied');

        return prisma.$transaction(async (tx) => {
            await tx.task.update({
                where: { id_tenantId: { id, tenantId } },
                data: {
                    ...(data.title !== undefined && { title: data.title }),
                    ...(data.description !== undefined && { description: data.description }),
                    ...(data.status !== undefined && { status: data.status }),
                    ...(data.priority !== undefined && { priority: data.priority }),
                    ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
                    ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate as string) : null }),
                    ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate as string) : null }),
                    ...(data.projectId !== undefined && { projectId: data.projectId }),
                    ...(data.clientId !== undefined && { clientId: data.clientId }),
                    ...(data.leadId !== undefined && { leadId: data.leadId }),
                    ...(data.contactId !== undefined
                        ? { referenceDoctype: data.contactId ? 'Contact' : null, referenceDocname: data.contactId || null }
                        : {
                            ...(data.referenceDoctype !== undefined && { referenceDoctype: data.referenceDoctype }),
                            ...(data.referenceDocname !== undefined && { referenceDocname: data.referenceDocname }),
                        }),
                    ...(data.estimatedHours !== undefined && { estimatedTime: data.estimatedHours ? Math.round(data.estimatedHours * 60) : null }),
                    ...(data.actualMinutes !== undefined && { actualTime: data.actualMinutes ?? null }),
                },
            });

            if (
                data.tags !== undefined
                || data.category !== undefined
                || data.isStarred !== undefined
                || data.isRecurring !== undefined
            ) {
                const currentTagState = parseTaskStoredTags(existing.tags);
                await this.syncTaskTags(tx, id, tenantId, {
                    category: data.category !== undefined ? data.category : currentTagState.category,
                    tags: data.tags !== undefined ? data.tags : currentTagState.tags,
                    isStarred: data.isStarred !== undefined ? data.isStarred : currentTagState.isStarred,
                    isRecurring: data.isRecurring !== undefined ? data.isRecurring : currentTagState.isRecurring,
                });
            }

            if (data.subtasks !== undefined) {
                await this.syncSubtasks(tx, id, tenantId, data.subtasks, existing.createdById);
            }

            return tx.task.findFirstOrThrow({
                where: { id, tenantId, parentTaskId: null },
                include: taskInclude,
            });
        });
    }

    async updateStatus(id: string, tenantId: string, status: TaskStatus) {
        // Verify tenant ownership
        const existing = await prisma.task.findFirst({ where: { id, tenantId, parentTaskId: null } });
        if (!existing) throw new Error('Task not found or access denied');

        return prisma.task.update({
            where: { id_tenantId: { id, tenantId } },
            data: {
                status,
                completedAt: status === 'DONE' || status === 'COMPLETED' ? new Date() : null,
            },
            include: taskInclude,
        });
    }

    async delete(id: string, tenantId: string) {
        // Tenant-scoped delete
        const existing = await prisma.task.findFirst({ where: { id, tenantId, parentTaskId: null } });
        if (!existing) throw new Error('Task not found or access denied');
        return prisma.$transaction(async (tx) => {
            await tx.task.deleteMany({ where: { tenantId, parentTaskId: id } });
            await tx.taskTag.deleteMany({ where: { taskId: id, tenantId } });
            return tx.task.delete({ where: { id_tenantId: { id, tenantId } } });
        });
    }

    async employeeExists(employeeId: string, tenantId: string): Promise<boolean> {
        const count = await prisma.employee.count({ where: { id: employeeId, tenantId, isActive: true } });
        return count > 0;
    }

    async projectExists(projectId: string, tenantId: string): Promise<boolean> {
        const count = await prisma.project.count({ where: { id: projectId, tenantId, deletedAt: null } });
        return count > 0;
    }

    async clientExists(clientId: string, tenantId: string): Promise<boolean> {
        const count = await prisma.client.count({ where: { id: clientId, tenantId } });
        return count > 0;
    }

    async leadExists(leadId: string, tenantId: string): Promise<boolean> {
        const count = await prisma.lead.count({ where: { id: leadId, tenantId } });
        return count > 0;
    }

    async contactExists(contactId: string, tenantId: string): Promise<boolean> {
        const count = await prisma.contact.count({ where: { id: contactId, tenantId } });
        return count > 0;
    }

    async proposalExists(proposalId: string, tenantId: string): Promise<boolean> {
        const count = await prisma.proposal.count({ where: { id: proposalId, tenantId } });
        return count > 0;
    }

    async contractExists(contractId: string, tenantId: string): Promise<boolean> {
        const count = await prisma.contract.count({ where: { id: contractId, tenantId } });
        return count > 0;
    }

    async invoiceExists(invoiceId: string, tenantId: string): Promise<boolean> {
        const count = await prisma.invoice.count({ where: { id: invoiceId, tenantId } });
        return count > 0;
    }

    async assign(id: string, tenantId: string, assignedToId: string | null) {
        // Verify tenant ownership
        const existing = await prisma.task.findFirst({ where: { id, tenantId, parentTaskId: null } });
        if (!existing) throw new Error('Task not found or access denied');

        return prisma.task.update({
            where: { id_tenantId: { id, tenantId } },
            data: { assignedToId },
            include: taskInclude,
        });
    }

    async getKanban(tenantId: string, filters?: { assignedToId?: string; projectId?: string }, dataAccess?: DataAccessContext) {
        const baseWhere: Prisma.TaskWhereInput = {
            tenantId,
            parentTaskId: null,
            ...(filters?.assignedToId && { assignedToId: filters.assignedToId }),
            ...(filters?.projectId && { projectId: filters.projectId }),
        };
        const where = mergeWhereWithAccess(baseWhere, buildTaskAccessWhere(dataAccess));
        const tasks = await prisma.task.findMany({ where, include: taskInclude, orderBy: { createdAt: 'desc' } });

        const statuses: TaskStatus[] = ['PENDING', 'TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
        return statuses.map(status => ({
            status,
            tasks: tasks.filter(t => t.status === status),
            count: tasks.filter(t => t.status === status).length,
        }));
    }

    async getStatistics(tenantId: string, dataAccess?: DataAccessContext) {
        const accessibleWhere = buildTaskAccessWhere(dataAccess);
        const TODO_STATUS: TaskStatus = 'TODO';
        const IN_PROGRESS_STATUS: TaskStatus = 'IN_PROGRESS';
        const REVIEW_STATUS: TaskStatus = 'REVIEW';
        const DONE_STATUS: TaskStatus = 'DONE';
        const [total, todo, inProgress, review, done, overdue] = await Promise.all([
            prisma.task.count({ where: mergeWhereWithAccess({ tenantId, parentTaskId: null }, accessibleWhere) }),
            prisma.task.count({ where: mergeWhereWithAccess({ tenantId, parentTaskId: null, status: TODO_STATUS }, accessibleWhere) }),
            prisma.task.count({ where: mergeWhereWithAccess({ tenantId, parentTaskId: null, status: IN_PROGRESS_STATUS }, accessibleWhere) }),
            prisma.task.count({ where: mergeWhereWithAccess({ tenantId, parentTaskId: null, status: REVIEW_STATUS }, accessibleWhere) }),
            prisma.task.count({ where: mergeWhereWithAccess({ tenantId, parentTaskId: null, status: DONE_STATUS }, accessibleWhere) }),
            prisma.task.count({ where: mergeWhereWithAccess({ tenantId, parentTaskId: null, status: { not: DONE_STATUS }, dueDate: { lt: new Date() } }, accessibleWhere) }),
        ]);
        return { total, todo, inProgress, review, done, overdue };
    }
}

export const tasksRepository = new TasksRepository();
