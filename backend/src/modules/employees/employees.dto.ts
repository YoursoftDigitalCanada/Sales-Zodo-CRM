import { Employee } from '@prisma/client';

export interface CreateEmployeeDto {
    userId: string;
    roleId: string;
    employeeNumber?: string;
    department?: string | null;
    position?: string | null;
    hireDate?: Date | string | null;
    isActive?: boolean;
}

export interface UpdateEmployeeDto extends Partial<Omit<CreateEmployeeDto, 'userId'>> { }

export interface EmployeeQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    department?: string;
    sortBy?: 'createdAt' | 'hireDate' | 'department';
    sortOrder?: 'asc' | 'desc';
}

export interface EmployeeResponseDto {
    id: string;
    employeeNumber: string | null;
    department: string | null;
    position: string | null;
    hireDate: Date | null;
    isActive: boolean;
    user: { id: string; firstName: string; lastName: string; email: string } | null;
    role: { id: string; name: string } | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface DepartmentConfigDto {
    id: string;
    name: string;
    code: string;
    description: string;
    headId?: string | null;
    budget: number;
    color: string;
    createdAt: string;
    isActive: boolean;
}

export interface CreateDepartmentDto {
    name: string;
    code: string;
    description: string;
    headId?: string | null;
    budget: number;
    color: string;
    isActive?: boolean;
}

export interface UpdateDepartmentDto extends Partial<CreateDepartmentDto> { }

export interface DepartmentResponseDto {
    id: string;
    name: string;
    code: string;
    description: string;
    headId?: string | null;
    headName?: string;
    headAvatar?: string | null;
    employeeCount: number;
    budget: number;
    color: string;
    createdAt: Date;
    isActive: boolean;
}

type EmployeeWithUser = Employee & {
    user: { id: string; firstName: string; lastName: string; email: string };
    role?: { id: string; name: string } | null;
};

export function toEmployeeResponseDto(emp: EmployeeWithUser): EmployeeResponseDto {
    return {
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        department: emp.department,
        position: emp.position,
        hireDate: emp.hireDate,
        isActive: emp.isActive,
        user: { id: emp.user.id, firstName: emp.user.firstName, lastName: emp.user.lastName, email: emp.user.email },
        role: emp.role ? { id: emp.role.id, name: emp.role.name } : null,
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt,
    };
}
