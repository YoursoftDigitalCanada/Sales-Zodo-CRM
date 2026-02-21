import { Project, ProjectStatus, ProjectPriority } from '@prisma/client';
export interface MilestoneDto {
    title: string;
    dueDate?: Date | string | null;
    isCompleted?: boolean;
}
export interface AttachmentDto {
    name: string;
    url: string;
    type?: string;
}
export interface CreateProjectDto {
    projectTitle: string;
    description?: string | null;
    clientId?: string | null;
    category?: string | null;
    projectManagerId?: string | null;
    startDate?: Date | string | null;
    dueDate?: Date | string | null;
    progressPercentage?: number;
    status?: ProjectStatus;
    milestones?: MilestoneDto[];
    teamMembers?: string[];
    attachments?: AttachmentDto[];
    priority?: ProjectPriority;
    budget?: number | null;
    estimatedHours?: number | null;
    tags?: string[];
    notifyTeamMembers?: boolean;
}
export interface UpdateProjectDto extends Partial<CreateProjectDto> {
}
export interface ProjectQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: ProjectStatus;
    priority?: ProjectPriority;
    clientId?: string;
    projectManagerId?: string;
    sortBy?: 'projectTitle' | 'createdAt' | 'dueDate' | 'priority';
    sortOrder?: 'asc' | 'desc';
}
export interface ProjectResponseDto {
    id: string;
    projectTitle: string;
    description: string | null;
    client: {
        id: string;
        clientName: string;
    } | null;
    category: string | null;
    projectManager: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
    startDate: Date | null;
    dueDate: Date | null;
    progressPercentage: number;
    status: ProjectStatus;
    priority: ProjectPriority;
    milestones: MilestoneDto[];
    teamMembers: {
        id: string;
        firstName: string;
        lastName: string;
    }[];
    attachments: AttachmentDto[];
    budget: number | null;
    estimatedHours: number | null;
    tags: string[];
    tasksCount: number;
    createdAt: Date;
    updatedAt: Date;
}
type ProjectWithRelations = Project & {
    client?: {
        id: string;
        clientName: string;
    } | null;
    projectManager?: {
        id: string;
        user: {
            firstName: string;
            lastName: string;
        };
    } | null;
    teamMembers?: {
        employee: {
            id: string;
            user: {
                firstName: string;
                lastName: string;
            };
        };
    }[];
    _count?: {
        tasks: number;
    };
};
export declare function toProjectResponseDto(p: ProjectWithRelations): ProjectResponseDto;
export {};
//# sourceMappingURL=projects.dto.d.ts.map