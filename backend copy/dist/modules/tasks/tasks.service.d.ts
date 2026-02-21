import { CreateTaskDto, UpdateTaskDto, TaskQueryDto, TaskResponseDto, TaskListResponseDto, TaskKanbanDto, TaskStatisticsDto } from './tasks.dto';
import { TaskStatus } from '@prisma/client';
export declare class TasksService {
    create(tenantId: string, data: CreateTaskDto, createdById?: string): Promise<TaskResponseDto>;
    getById(id: string, tenantId: string): Promise<TaskResponseDto>;
    getMany(tenantId: string, query: TaskQueryDto): Promise<TaskListResponseDto>;
    update(id: string, tenantId: string, data: UpdateTaskDto): Promise<TaskResponseDto>;
    delete(id: string, tenantId: string): Promise<void>;
    updateStatus(id: string, tenantId: string, status: TaskStatus): Promise<TaskResponseDto>;
    assign(id: string, tenantId: string, assignedToId: string | null): Promise<TaskResponseDto>;
    getKanban(tenantId: string, filters?: {
        assignedToId?: string;
        projectId?: string;
    }): Promise<TaskKanbanDto[]>;
    getStatistics(tenantId: string): Promise<TaskStatisticsDto>;
}
export declare const tasksService: TasksService;
//# sourceMappingURL=tasks.service.d.ts.map