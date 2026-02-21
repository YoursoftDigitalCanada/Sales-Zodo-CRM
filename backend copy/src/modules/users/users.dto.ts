import { User, UserStatus } from '@prisma/client';

export interface CreateUserDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    tenantId?: string;
}

export interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    avatar?: string | null;
    status?: UserStatus;
}

export interface UserQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: UserStatus;
    sortBy?: 'firstName' | 'lastName' | 'email' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}

export interface UserResponseDto {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string | null;
    avatar: string | null;
    status: UserStatus;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserListResponseDto {
    data: UserResponseDto[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export function toUserResponseDto(user: User): UserResponseDto {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        phone: user.phone,
        avatar: user.avatar,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
