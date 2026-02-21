import { Project, ProjectStatus, Currency } from '@prisma/client';

// ============================================================================
// PROJECTS DTOs - Matching Prisma Schema
// Project fields: name, description, code, status(ProjectStatus), startDate,
// endDate, actualEndDate, budget(Decimal), currency(Currency), progress(Int),
// clientId, tenantId. Relations: tasks, members(ProjectMember), files
// ============================================================================

export interface CreateProjectDto {
    name: string;
    description?: string | null;
    code?: string | null;
    status?: ProjectStatus;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    budget?: number | null;
    currency?: Currency;
    progress?: number;
    clientId?: string | null;
    teamMembers?: string[]; // employee IDs
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> { }

export interface ProjectQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: ProjectStatus;
    clientId?: string;
    sortBy?: 'name' | 'createdAt' | 'endDate' | 'status';
    sortOrder?: 'asc' | 'desc';
}

export interface ProjectResponseDto {
    id: string;
    name: string;
    description: string | null;
    code: string | null;
    status: ProjectStatus;
    startDate: Date | null;
    endDate: Date | null;
    actualEndDate: Date | null;
    budget: number | null;
    currency: Currency;
    progress: number;
    client: { id: string; clientName: string } | null;
    teamMembers: { id: string; role: string | null; employee: { id: string; user: { firstName: string; lastName: string } } }[];
    tasksCount: number;
    filesCount: number;
    createdAt: Date;
    updatedAt: Date;
}

type ProjectWithRelations = Project & {
    client?: { id: string; clientName: string } | null;
    members?: { id: string; role: string | null; employee: { id: string; user: { firstName: string; lastName: string } } }[];
    _count?: { tasks: number; files: number };
};

export function toProjectResponseDto(p: ProjectWithRelations): ProjectResponseDto {
    return {
        id: p.id,
        name: p.name,
        description: p.description,
        code: p.code,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        actualEndDate: p.actualEndDate,
        budget: p.budget ? Number(p.budget) : null,
        currency: p.currency,
        progress: p.progress,
        client: p.client ? { id: p.client.id, clientName: p.client.clientName } : null,
        teamMembers: (p.members || []).map((m) => ({
            id: m.id,
            role: m.role,
            employee: { id: m.employee.id, user: { firstName: m.employee.user.firstName, lastName: m.employee.user.lastName } },
        })),
        tasksCount: p._count?.tasks || 0,
        filesCount: p._count?.files || 0,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    };
}
