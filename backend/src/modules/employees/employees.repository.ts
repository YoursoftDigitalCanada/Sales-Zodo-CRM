import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import {
    CreateEmployeeDto,
    UpdateEmployeeDto,
    EmployeeQueryDto,
    buildEmployeeProfileData,
    normalizeEmployeeProfileData,
} from './employees.dto';

const employeeInclude = {
    user: {
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            phone: true,
        },
    },
    role: { select: { id: true, name: true } },
    employeeDocuments: {
        select: {
            id: true,
            name: true,
            type: true,
            fileUrl: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' as const },
    },
};

export class EmployeesRepository {
    async create(tenantId: string, data: CreateEmployeeDto) {
        return prisma.employee.create({
            data: {
                tenantId,
                userId: data.userId,
                roleId: data.roleId,
                employeeNumber: data.employeeNumber || (data as { employeeCode?: string }).employeeCode,
                department: data.department,
                position: data.position,
                hireDate: data.hireDate ? new Date(data.hireDate) : null,
                employmentStatus: data.employmentStatus || (data.isActive === false ? 'inactive' : 'active'),
                employmentType: data.employmentType || 'full-time',
                salary: data.salary ?? null,
                profileData: buildEmployeeProfileData({
                    skills: data.skills,
                    address: data.address,
                    emergencyContact: data.emergencyContact,
                }),
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

    async update(id: string, tenantId: string, data: UpdateEmployeeDto) {
        // Verify tenant ownership
        const existing = await prisma.employee.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Employee not found or access denied');

        const currentProfile = normalizeEmployeeProfileData(existing.profileData);

        return prisma.employee.update({
            where: { id },
            data: {
                ...(data.roleId !== undefined
                    ? {
                        role: {
                            connect: { id: data.roleId },
                        },
                    }
                    : {}),
                ...(
                    data.employeeNumber !== undefined
                    || (data as { employeeCode?: string }).employeeCode !== undefined
                        ? {
                            employeeNumber: data.employeeNumber ?? (data as { employeeCode?: string }).employeeCode ?? null,
                        }
                        : {}
                ),
                ...(data.department !== undefined && { department: data.department }),
                ...(data.position !== undefined && { position: data.position }),
                ...(data.hireDate !== undefined && { hireDate: data.hireDate ? new Date(data.hireDate) : null }),
                ...(data.employmentStatus !== undefined && { employmentStatus: data.employmentStatus || 'active' }),
                ...(data.employmentType !== undefined && { employmentType: data.employmentType || 'full-time' }),
                ...(data.salary !== undefined && { salary: data.salary ?? null }),
                ...(
                    data.skills !== undefined
                    || data.address !== undefined
                    || data.emergencyContact !== undefined
                        ? {
                            profileData: buildEmployeeProfileData({
                                skills: data.skills ?? currentProfile.skills,
                                address: data.address ?? currentProfile.address,
                                emergencyContact: data.emergencyContact ?? currentProfile.emergencyContact,
                                managerId: currentProfile.managerId,
                                managerName: currentProfile.managerName,
                            }),
                        }
                        : {}
                ),
                ...(
                    data.firstName !== undefined
                    || data.lastName !== undefined
                    || data.email !== undefined
                    || data.phone !== undefined
                        ? {
                            user: {
                                update: {
                                    ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
                                    ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
                                    ...(data.email !== undefined ? { email: data.email.toLowerCase() } : {}),
                                    ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
                                },
                            },
                        }
                        : {}
                ),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
            include: employeeInclude,
        });
    }

    async delete(id: string, tenantId: string) {
        // Tenant-scoped delete
        const existing = await prisma.employee.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Employee not found or access denied');
        return prisma.employee.delete({ where: { id } });
    }
}

export const employeesRepository = new EmployeesRepository();
