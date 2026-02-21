import { Task, TaskStatus, TaskPriority } from '@prisma/client';

// ============================================================================
// TASKS DTOs - Matching Schema Fields
// ============================================================================

export interface CreateTaskDto {
    title: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedToId?: string | null;
    dueDate?: Date | string | null;
    projectId?: string | null;
    clientId?: string | null;
    estimatedHours?: number | null;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> { }

export interface TaskQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedToId?: string;
    projectId?: string;
    clientId?: string;
    sortBy?: 'title' | 'createdAt' | 'dueDate' | 'priority';
    sortOrder?: 'asc' | 'desc';
}

export interface TaskResponseDto {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    assignedTo: { id: string; user: { firstName: string; lastName: string; email?: string } } | null;
    createdBy: { id: string; user: { firstName: string; lastName: string } } | null;
    dueDate: Date | null;
    startDate: Date | null;
    completedAt: Date | null;
    estimatedTime: number | null;
    project: { id: string; name: string } | null;
    client: { id: string; clientName: string } | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface TaskListResponseDto {
    data: TaskResponseDto[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

// Kanban view types
export interface TaskKanbanDto {
    status: TaskStatus;
    tasks: TaskResponseDto[];
    count: number;
}

export interface TaskStatisticsDto {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    overdue: number;
}

type TaskWithRelations = Task & {
    assignedTo?: { id: string; user: { firstName: string; lastName: string; email?: string } } | null;
    createdBy?: { id: string; user: { firstName: string; lastName: string } } | null;
    project?: { id: string; name: string } | null;
    client?: { id: string; clientName: string } | null;
};

export function toTaskResponseDto(t: TaskWithRelations): TaskResponseDto {
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
