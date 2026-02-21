import { Employee } from '@prisma/client';
export interface CreateEmployeeDto {
    userId: string;
    employeeCode?: string;
    department?: string | null;
    position?: string | null;
    hireDate?: Date | string | null;
    salary?: number | null;
    isActive?: boolean;
}
export interface UpdateEmployeeDto extends Partial<Omit<CreateEmployeeDto, 'userId'>> {
}
export interface EmployeeQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    department?: string;
    sortBy?: 'createdAt' | 'hireDate' | 'position';
    sortOrder?: 'asc' | 'desc';
}
export interface EmployeeResponseDto {
    id: string;
    employeeCode: string | null;
    department: string | null;
    position: string | null;
    hireDate: Date | null;
    salary: number | null;
    isActive: boolean;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
type EmployeeWithUser = Employee & {
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
};
export declare function toEmployeeResponseDto(emp: EmployeeWithUser): EmployeeResponseDto;
export {};
//# sourceMappingURL=employees.dto.d.ts.map