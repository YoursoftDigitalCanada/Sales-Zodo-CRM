import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto } from './employees.dto';
export declare class EmployeesRepository {
    create(tenantId: string, data: CreateEmployeeDto): Promise<{
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
    }>;
    findById(id: string, tenantId: string): Promise<({
        user: {
            email: string;
            id: string;
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
    }) | null>;
    findMany(tenantId: string, query: EmployeeQueryDto): Promise<{
        data: ({
            user: {
                email: string;
                id: string;
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
        })[];
        total: number;
    }>;
    update(id: string, data: UpdateEmployeeDto): Promise<{
        user: {
            email: string;
            id: string;
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
    }>;
    delete(id: string): Promise<{
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
    }>;
}
export declare const employeesRepository: EmployeesRepository;
//# sourceMappingURL=employees.repository.d.ts.map