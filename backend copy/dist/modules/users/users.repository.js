"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRepository = exports.UsersRepository = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
const userInclude = {
    role: { select: { id: true, name: true } },
};
class UsersRepository {
    async create(tenantId, data) {
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 10);
        return prisma.user.create({
            data: {
                tenantId,
                email: data.email,
                password: hashedPassword,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                roleId: data.roleId,
                isActive: data.isActive ?? true,
            },
            include: userInclude,
        });
    }
    async findById(id, tenantId) {
        return prisma.user.findFirst({
            where: { id, tenantId },
            include: userInclude,
        });
    }
    async findByEmail(email, tenantId) {
        return prisma.user.findFirst({
            where: { email, tenantId },
            include: userInclude,
        });
    }
    async findMany(tenantId, query) {
        const { page = 1, limit = 20, search, isActive, roleId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where = {
            tenantId,
            ...(isActive !== undefined && { isActive }),
            ...(roleId && { roleId }),
            ...(search && {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: userInclude,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.user.count({ where }),
        ]);
        return { data, total };
    }
    async update(id, tenantId, data) {
        return prisma.user.update({
            where: { id },
            data: {
                ...(data.firstName !== undefined && { firstName: data.firstName }),
                ...(data.lastName !== undefined && { lastName: data.lastName }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.avatar !== undefined && { avatar: data.avatar }),
                ...(data.roleId !== undefined && { roleId: data.roleId }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
            include: userInclude,
        });
    }
    async delete(id) {
        return prisma.user.delete({ where: { id } });
    }
    async updateStatus(id, isActive) {
        return prisma.user.update({
            where: { id },
            data: { isActive },
            include: userInclude,
        });
    }
}
exports.UsersRepository = UsersRepository;
exports.usersRepository = new UsersRepository();
//# sourceMappingURL=users.repository.js.map