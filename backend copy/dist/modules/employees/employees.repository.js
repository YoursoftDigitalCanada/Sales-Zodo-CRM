"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeesRepository = exports.EmployeesRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const employeeInclude = { user: { select: { id: true, firstName: true, lastName: true, email: true } } };
class EmployeesRepository {
    async create(tenantId, data) {
        return prisma.employee.create({
            data: {
                tenantId,
                userId: data.userId,
                employeeCode: data.employeeCode,
                department: data.department,
                position: data.position,
                hireDate: data.hireDate ? new Date(data.hireDate) : null,
                salary: data.salary,
                isActive: data.isActive ?? true,
            },
            include: employeeInclude,
        });
    }
    async findById(id, tenantId) {
        return prisma.employee.findFirst({ where: { id, tenantId }, include: employeeInclude });
    }
    async findMany(tenantId, query) {
        const { page = 1, limit = 20, search, isActive, department, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where = {
            tenantId,
            ...(isActive !== undefined && { isActive }),
            ...(department && { department: { contains: department, mode: 'insensitive' } }),
            ...(search && {
                OR: [
                    { user: { firstName: { contains: search, mode: 'insensitive' } } },
                    { user: { lastName: { contains: search, mode: 'insensitive' } } },
                    { employeeCode: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.employee.findMany({ where, include: employeeInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.employee.count({ where }),
        ]);
        return { data, total };
    }
    async update(id, data) {
        return prisma.employee.update({
            where: { id },
            data: {
                ...(data.employeeCode !== undefined && { employeeCode: data.employeeCode }),
                ...(data.department !== undefined && { department: data.department }),
                ...(data.position !== undefined && { position: data.position }),
                ...(data.hireDate !== undefined && { hireDate: data.hireDate ? new Date(data.hireDate) : null }),
                ...(data.salary !== undefined && { salary: data.salary }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
            include: employeeInclude,
        });
    }
    async delete(id) {
        return prisma.employee.delete({ where: { id } });
    }
}
exports.EmployeesRepository = EmployeesRepository;
exports.employeesRepository = new EmployeesRepository();
//# sourceMappingURL=employees.repository.js.map