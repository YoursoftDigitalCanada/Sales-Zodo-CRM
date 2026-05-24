import { Task, TaskStatus, TaskPriority } from '@prisma/client';

// ============================================================================
// TASKS DTOs - Matching Schema Fields
// ============================================================================

export const TASK_CATEGORY_TAG_PREFIX = '__task_category__:';
export const TASK_META_TAG_PREFIX = '__task_meta__:';
export const TASK_STARRED_TAG = `${TASK_META_TAG_PREFIX}starred`;
export const TASK_RECURRING_TAG = `${TASK_META_TAG_PREFIX}recurring`;

export interface TaskSubtaskInputDto {
    id?: string;
    title: string;
    completed?: boolean;
}

export interface TaskSubtaskDto {
    id: string;
    title: string;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateTaskDto {
    title: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedToId?: string | null;
    dueDate?: Date | string | null;
    startDate?: Date | string | null;
    projectId?: string | null;
    clientId?: string | null;
    leadId?: string | null;
    contactId?: string | null;
    referenceDoctype?: string | null;
    referenceDocname?: string | null;
    estimatedHours?: number | null;
    actualMinutes?: number | null;
    category?: string | null;
    tags?: string[];
    subtasks?: TaskSubtaskInputDto[];
    isStarred?: boolean;
    isRecurring?: boolean;
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
    leadId?: string;
    contactId?: string;
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
    actualTime: number | null;
    project: { id: string; name: string } | null;
    client: { id: string; clientName: string } | null;
    leadId: string | null;
    referenceDoctype: string | null;
    referenceDocname: string | null;
    category: string | null;
    tags: string[];
    subtasks: TaskSubtaskDto[];
    isStarred: boolean;
    isRecurring: boolean;
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
    tags?: Array<{ tag: { name: string; color?: string | null } }>;
    subtasks?: Array<{
        id: string;
        title: string;
        status: TaskStatus;
        completedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
};

function normalizeTaskText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
}

export function buildTaskStoredTagNames(input: {
    category?: string | null;
    tags?: string[] | null;
    isStarred?: boolean;
    isRecurring?: boolean;
}): string[] {
    const stored = new Set<string>();

    if (typeof input.category === 'string' && input.category.trim()) {
        stored.add(`${TASK_CATEGORY_TAG_PREFIX}${normalizeTaskText(input.category)}`);
    }

    for (const tag of input.tags || []) {
        const normalized = normalizeTaskText(tag);
        if (!normalized) {
            continue;
        }

        stored.add(normalized);
    }

    if (input.isStarred) {
        stored.add(TASK_STARRED_TAG);
    }

    if (input.isRecurring) {
        stored.add(TASK_RECURRING_TAG);
    }

    return [...stored];
}

export function parseTaskStoredTags(
    tagLinks?: Array<{ tag: { name: string; color?: string | null } }>,
): {
    category: string | null;
    tags: string[];
    isStarred: boolean;
    isRecurring: boolean;
} {
    let category: string | null = null;
    let isStarred = false;
    let isRecurring = false;
    const tags: string[] = [];

    for (const link of tagLinks || []) {
        const name = typeof link?.tag?.name === 'string' ? link.tag.name : '';
        if (!name) {
            continue;
        }

        if (name.startsWith(TASK_CATEGORY_TAG_PREFIX)) {
            category = name.slice(TASK_CATEGORY_TAG_PREFIX.length) || null;
            continue;
        }

        if (name === TASK_STARRED_TAG) {
            isStarred = true;
            continue;
        }

        if (name === TASK_RECURRING_TAG) {
            isRecurring = true;
            continue;
        }

        tags.push(name);
    }

    return {
        category,
        tags,
        isStarred,
        isRecurring,
    };
}

export function toTaskResponseDto(t: TaskWithRelations): TaskResponseDto {
    const tagState = parseTaskStoredTags(t.tags);

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
        actualTime: t.actualTime,
        project: t.project || null,
        client: t.client || null,
        leadId: (t as any).leadId ?? null,
        referenceDoctype: (t as any).referenceDoctype ?? null,
        referenceDocname: (t as any).referenceDocname ?? null,
        category: tagState.category,
        tags: tagState.tags,
        subtasks: (t.subtasks || []).map((subtask) => ({
            id: subtask.id,
            title: subtask.title,
            completed: subtask.status === 'DONE' || subtask.status === 'COMPLETED',
            createdAt: subtask.createdAt,
            updatedAt: subtask.updatedAt,
        })),
        isStarred: tagState.isStarred,
        isRecurring: tagState.isRecurring,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
    };
}
