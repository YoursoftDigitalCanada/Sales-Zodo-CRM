import { CreateProjectDto, UpdateProjectDto, ProjectQueryDto } from './projects.dto';
export declare class ProjectsService {
    create(tenantId: string, data: CreateProjectDto): Promise<import("./projects.dto").ProjectResponseDto>;
    getById(id: string, tenantId: string): Promise<import("./projects.dto").ProjectResponseDto>;
    getMany(tenantId: string, query: ProjectQueryDto): Promise<{
        data: import("./projects.dto").ProjectResponseDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    update(id: string, tenantId: string, data: UpdateProjectDto): Promise<import("./projects.dto").ProjectResponseDto>;
    delete(id: string, tenantId: string): Promise<void>;
}
export declare const projectsService: ProjectsService;
//# sourceMappingURL=projects.service.d.ts.map