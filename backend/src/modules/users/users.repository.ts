import { PrismaClient, Prisma } from '@prisma/client';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './users.dto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export class UsersRepository {
    async create(data: CreateUserDto) {
        const hashedPassword = await bcrypt.hash(data.password, 10);

        return prisma.user.create({
            data: {
                tenantId: data.tenantId,
                email: data.email,
                passwordHash: hashedPassword,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
            },
        });
    }

    async findById(id: string) {
        return prisma.user.findUnique({
            where: { id },
        });
    }

    async findByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email },
        });
    }

    async findMany(query: UserQueryDto, tenantId?: string) {
        const { page = 1, limit = 20, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;

        const where: Prisma.UserWhereInput = {
            ...(tenantId && { tenantId }),
            ...(status && { status }),
            ...(search && {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' as const } },
                    { lastName: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [data, total] = await Promise.all([
            prisma.user.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.user.count({ where }),
        ]);

        return { data, total };
    }

    async update(id: string, data: UpdateUserDto) {
        return prisma.user.update({
            where: { id },
            data: {
                ...(data.firstName !== undefined && { firstName: data.firstName }),
                ...(data.lastName !== undefined && { lastName: data.lastName }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.avatar !== undefined && { avatar: data.avatar }),
                ...(data.status !== undefined && { status: data.status }),
            },
        });
    }

    async delete(id: string) {
        return prisma.user.delete({ where: { id } });
    }

    async updateStatus(id: string, status: string) {
        return prisma.user.update({
            where: { id },
            data: { status: status as any },
        });
    }
}

export const usersRepository = new UsersRepository();
