import { Prisma } from '@prisma/client';
import { CreateProjectDto, UpdateProjectDto, ProjectQueryDto } from './projects.dto';
export declare class ProjectsRepository {
    create(tenantId: string, data: CreateProjectDto): Promise<{
        code: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        currency: import(".prisma/client").$Enums.Currency;
        startDate: Date | null;
        endDate: Date | null;
        clientId: string | null;
        actualEndDate: Date | null;
        budget: Prisma.Decimal | null;
        progress: number;
        archivedAt: Date | null;
    }>;
    findById(id: string, tenantId: string): Promise<({
        client: {
            id: string;
            clientName: string;
        } | null;
        _count: {
            tasks: number;
        };
        teamMembers: never;
        projectManager: never;
    } & {
        code: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        currency: import(".prisma/client").$Enums.Currency;
        startDate: Date | null;
        endDate: Date | null;
        clientId: string | null;
        actualEndDate: Date | null;
        budget: Prisma.Decimal | null;
        progress: number;
        archivedAt: Date | null;
    }) | null>;
    findMany(tenantId: string, query: ProjectQueryDto): Promise<{
        data: ({
            client: {
                id: string;
                clientName: string;
            } | null;
            _count: {
                tasks: number;
            };
            teamMembers: never;
            projectManager: never;
        } & {
            code: string | null;
            status: import(".prisma/client").$Enums.ProjectStatus;
            tenantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            currency: import(".prisma/client").$Enums.Currency;
            startDate: Date | null;
            endDate: Date | null;
            clientId: string | null;
            actualEndDate: Date | null;
            budget: Prisma.Decimal | null;
            progress: number;
            archivedAt: Date | null;
        })[];
        total: number;
    }>;
    update(id: string, data: UpdateProjectDto): Promise<{
        client: {
            id: string;
            clientName: string;
        } | null;
        _count: {
            tasks: number;
        };
        teamMembers: never;
        projectManager: never;
    } & {
        code: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        currency: import(".prisma/client").$Enums.Currency;
        startDate: Date | null;
        endDate: Date | null;
        clientId: string | null;
        actualEndDate: Date | null;
        budget: Prisma.Decimal | null;
        progress: number;
        archivedAt: Date | null;
    }>;
    delete(id: string): Promise<{
        code: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        currency: import(".prisma/client").$Enums.Currency;
        startDate: Date | null;
        endDate: Date | null;
        clientId: string | null;
        actualEndDate: Date | null;
        budget: Prisma.Decimal | null;
        progress: number;
        archivedAt: Date | null;
    }>;
}
export declare const projectsRepository: ProjectsRepository;
//# sourceMappingURL=projects.repository.d.ts.map