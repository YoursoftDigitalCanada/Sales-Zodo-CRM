import { PrismaClient, Prisma } from '@prisma/client';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto } from './employees.dto';

const prisma = new PrismaClient();
const employeeInclude = {
    user: { select: { id: true, firstName: true, lastName: true, email: true } },
    role: { select: { id: true, name: true } },
};

export class EmployeesRepository {
    async create(tenantId: string, data: CreateEmployeeDto) {
        return prisma.employee.create({
            data: {
                tenantId,
                userId: data.userId,
                roleId: data.roleId,
                employeeNumber: data.employeeNumber,
                department: data.department,
                position: data.position,
                hireDate: data.hireDate ? new Date(data.hireDate) : null,
                isActive: data.isActive ?? true,
            },
            include: employeeInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.employee.findFirst({ where: { id, tenantId }, include: employeeInclude });
    }

    async findMany(tenantId: string, query: EmployeeQueryDto) {
        const { page = 1, limit = 20, search, isActive, department, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where: Prisma.EmployeeWhereInput = {
            tenantId,
            ...(isActive !== undefined && { isActive }),
            ...(department && { department: { contains: department, mode: 'insensitive' as const } }),
            ...(search && {
                OR: [
                    { user: { firstName: { contains: search, mode: 'insensitive' as const } } },
                    { user: { lastName: { contains: search, mode: 'insensitive' as const } } },
                    { employeeNumber: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.employee.findMany({ where, include: employeeInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.employee.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, data: UpdateEmployeeDto) {
        return prisma.employee.update({
            where: { id },
            data: {
                ...(data.roleId !== undefined && { roleId: data.roleId }),
                ...(data.employeeNumber !== undefined && { employeeNumber: data.employeeNumber }),
                ...(data.department !== undefined && { department: data.department }),
                ...(data.position !== undefined && { position: data.position }),
                ...(data.hireDate !== undefined && { hireDate: data.hireDate ? new Date(data.hireDate) : null }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
            include: employeeInclude,
        });
    }

    async delete(id: string) {
        return prisma.employee.delete({ where: { id } });
    }
}

export const employeesRepository = new EmployeesRepository();
