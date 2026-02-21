import { Request } from 'express';
import { CreateTaskDto, UpdateTaskDto } from './tasks.dto';
import { TaskStatus } from '@prisma/client';
export declare class TasksManager {
    createTask(req: Request, tenantId: string, data: CreateTaskDto, createdById?: string): Promise<import("./tasks.dto").TaskResponseDto>;
    updateTask(req: Request, id: string, tenantId: string, data: UpdateTaskDto): Promise<import("./tasks.dto").TaskResponseDto>;
    deleteTask(req: Request, id: string, tenantId: string): Promise<void>;
    updateTaskStatus(req: Request, id: string, tenantId: string, status: TaskStatus): Promise<import("./tasks.dto").TaskResponseDto>;
    assignTask(req: Request, id: string, tenantId: string, assignedToId: string | null): Promise<import("./tasks.dto").TaskResponseDto>;
}
export declare const tasksManager: TasksManager;
//# sourceMappingURL=tasks.manager.d.ts.map