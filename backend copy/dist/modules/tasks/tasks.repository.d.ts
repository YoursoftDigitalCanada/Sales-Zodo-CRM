import { TaskStatus } from '@prisma/client';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './tasks.dto';
export declare class TasksRepository {
    create(tenantId: string, data: CreateTaskDto, createdById?: string): Promise<{
        client: {
            id: string;
            clientName: string;
        } | null;
        project: {
            id: string;
            name: string;
        } | null;
        assignedTo: ({
            user: {
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
        createdBy: ({
            user: {
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.TaskStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        assignedToId: string | null;
        createdById: string | null;
        startDate: Date | null;
        title: string;
        dueDate: Date | null;
        projectId: string | null;
        clientId: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        completedAt: Date | null;
        estimatedTime: number | null;
        actualTime: number | null;
        parentTaskId: string | null;
    }>;
    findById(id: string, tenantId: string): Promise<({
        client: {
            id: string;
            clientName: string;
        } | null;
        project: {
            id: string;
            name: string;
        } | null;
        assignedTo: ({
            user: {
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
        createdBy: ({
            user: {
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.TaskStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        assignedToId: string | null;
        createdById: string | null;
        startDate: Date | null;
        title: string;
        dueDate: Date | null;
        projectId: string | null;
        clientId: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        completedAt: Date | null;
        estimatedTime: number | null;
        actualTime: number | null;
        parentTaskId: string | null;
    }) | null>;
    findMany(tenantId: string, query: TaskQueryDto): Promise<{
        data: ({
            client: {
                id: string;
                clientName: string;
            } | null;
            project: {
                id: string;
                name: string;
            } | null;
            assignedTo: ({
                user: {
                    email: string;
                    firstName: string;
                    lastName: string;
                };
            } & {
                userId: string;
                tenantId: string;
                id: string;
                employeeNumber: string | null;
                department: string | null;
                position: string | null;
                hireDate: Date | null;
                isActive: boolean;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
            }) | null;
            createdBy: ({
                user: {
                    firstName: string;
                    lastName: string;
                };
            } & {
                userId: string;
                tenantId: string;
                id: string;
                employeeNumber: string | null;
                department: string | null;
                position: string | null;
                hireDate: Date | null;
                isActive: boolean;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
            }) | null;
        } & {
            status: import(".prisma/client").$Enums.TaskStatus;
            tenantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            assignedToId: string | null;
            createdById: string | null;
            startDate: Date | null;
            title: string;
            dueDate: Date | null;
            projectId: string | null;
            clientId: string | null;
            priority: import(".prisma/client").$Enums.TaskPriority;
            completedAt: Date | null;
            estimatedTime: number | null;
            actualTime: number | null;
            parentTaskId: string | null;
        })[];
        total: number;
    }>;
    update(id: string, tenantId: string, data: UpdateTaskDto): Promise<{
        client: {
            id: string;
            clientName: string;
        } | null;
        project: {
            id: string;
            name: string;
        } | null;
        assignedTo: ({
            user: {
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
        createdBy: ({
            user: {
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.TaskStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        assignedToId: string | null;
        createdById: string | null;
        startDate: Date | null;
        title: string;
        dueDate: Date | null;
        projectId: string | null;
        clientId: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        completedAt: Date | null;
        estimatedTime: number | null;
        actualTime: number | null;
        parentTaskId: string | null;
    }>;
    updateStatus(id: string, tenantId: string, status: TaskStatus): Promise<{
        client: {
            id: string;
            clientName: string;
        } | null;
        project: {
            id: string;
            name: string;
        } | null;
        assignedTo: ({
            user: {
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
        createdBy: ({
            user: {
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.TaskStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        assignedToId: string | null;
        createdById: string | null;
        startDate: Date | null;
        title: string;
        dueDate: Date | null;
        projectId: string | null;
        clientId: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        completedAt: Date | null;
        estimatedTime: number | null;
        actualTime: number | null;
        parentTaskId: string | null;
    }>;
    delete(id: string, tenantId: string): Promise<{
        status: import(".prisma/client").$Enums.TaskStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        assignedToId: string | null;
        createdById: string | null;
        startDate: Date | null;
        title: string;
        dueDate: Date | null;
        projectId: string | null;
        clientId: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        completedAt: Date | null;
        estimatedTime: number | null;
        actualTime: number | null;
        parentTaskId: string | null;
    }>;
    employeeExists(employeeId: string, tenantId: string): Promise<boolean>;
    projectExists(projectId: string, tenantId: string): Promise<boolean>;
    assign(id: string, tenantId: string, assignedToId: string | null): Promise<{
        client: {
            id: string;
            clientName: string;
        } | null;
        project: {
            id: string;
            name: string;
        } | null;
        assignedTo: ({
            user: {
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
        createdBy: ({
            user: {
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.TaskStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        assignedToId: string | null;
        createdById: string | null;
        startDate: Date | null;
        title: string;
        dueDate: Date | null;
        projectId: string | null;
        clientId: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        completedAt: Date | null;
        estimatedTime: number | null;
        actualTime: number | null;
        parentTaskId: string | null;
    }>;
    getKanban(tenantId: string, filters?: {
        assignedToId?: string;
        projectId?: string;
    }): Promise<{
        status: import(".prisma/client").$Enums.TaskStatus;
        tasks: ({
            client: {
                id: string;
                clientName: string;
            } | null;
            project: {
                id: string;
                name: string;
            } | null;
            assignedTo: ({
                user: {
                    email: string;
                    firstName: string;
                    lastName: string;
                };
            } & {
                userId: string;
                tenantId: string;
                id: string;
                employeeNumber: string | null;
                department: string | null;
                position: string | null;
                hireDate: Date | null;
                isActive: boolean;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
            }) | null;
            createdBy: ({
                user: {
                    firstName: string;
                    lastName: string;
                };
            } & {
                userId: string;
                tenantId: string;
                id: string;
                employeeNumber: string | null;
                department: string | null;
                position: string | null;
                hireDate: Date | null;
                isActive: boolean;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
            }) | null;
        } & {
            status: import(".prisma/client").$Enums.TaskStatus;
            tenantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            assignedToId: string | null;
            createdById: string | null;
            startDate: Date | null;
            title: string;
            dueDate: Date | null;
            projectId: string | null;
            clientId: string | null;
            priority: import(".prisma/client").$Enums.TaskPriority;
            completedAt: Date | null;
            estimatedTime: number | null;
            actualTime: number | null;
            parentTaskId: string | null;
        })[];
        count: number;
    }[]>;
    getStatistics(tenantId: string): Promise<{
        total: number;
        todo: number;
        inProgress: number;
        review: number;
        done: number;
        overdue: number;
    }>;
}
export declare const tasksRepository: TasksRepository;
//# sourceMappingURL=tasks.repository.d.ts.map