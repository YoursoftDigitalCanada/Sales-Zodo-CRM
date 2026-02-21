import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto } from './employees.dto';
export declare class EmployeesService {
    create(tenantId: string, data: CreateEmployeeDto): Promise<import("./employees.dto").EmployeeResponseDto>;
    getById(id: string, tenantId: string): Promise<import("./employees.dto").EmployeeResponseDto>;
    getMany(tenantId: string, query: EmployeeQueryDto): Promise<{
        data: import("./employees.dto").EmployeeResponseDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    update(id: string, tenantId: string, data: UpdateEmployeeDto): Promise<import("./employees.dto").EmployeeResponseDto>;
    delete(id: string, tenantId: string): Promise<void>;
}
export declare const employeesService: EmployeesService;
//# sourceMappingURL=employees.service.d.ts.map