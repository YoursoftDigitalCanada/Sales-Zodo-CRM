import { usersRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto, UserQueryDto, UserListResponseDto, UserResponseDto, toUserResponseDto } from './users.dto';
import { NotFoundError, BadRequestError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class UsersService {
    async create(data: CreateUserDto): Promise<UserResponseDto> {
        const existing = await usersRepository.findByEmail(data.email);
        if (existing) {
            throw new BadRequestError('Email already exists', ErrorCodes.USER_EMAIL_TAKEN);
        }
        const user = await usersRepository.create(data);
        return toUserResponseDto(user);
    }

    async getById(id: string): Promise<UserResponseDto> {
        const user = await usersRepository.findById(id);
        if (!user) throw new NotFoundError('User not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toUserResponseDto(user);
    }

    async getMany(query: UserQueryDto, tenantId?: string): Promise<UserListResponseDto> {
        const { data, total } = await usersRepository.findMany(query, tenantId);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);

        return {
            data: data.map(toUserResponseDto),
            meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        };
    }

    async update(id: string, data: UpdateUserDto): Promise<UserResponseDto> {
        const existing = await usersRepository.findById(id);
        if (!existing) throw new NotFoundError('User not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const user = await usersRepository.update(id, data);
        return toUserResponseDto(user);
    }

    async delete(id: string): Promise<void> {
        const existing = await usersRepository.findById(id);
        if (!existing) throw new NotFoundError('User not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await usersRepository.delete(id);
    }

    async updateStatus(id: string, status: string): Promise<UserResponseDto> {
        const existing = await usersRepository.findById(id);
        if (!existing) throw new NotFoundError('User not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const user = await usersRepository.updateStatus(id, status);
        return toUserResponseDto(user);
    }
}

export const usersService = new UsersService();
