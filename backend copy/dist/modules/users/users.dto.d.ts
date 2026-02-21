import { User } from '@prisma/client';
export interface CreateUserDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    roleId?: string;
    isActive?: boolean;
}
export interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    avatar?: string | null;
    roleId?: string | null;
    isActive?: boolean;
}
export interface UserQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    roleId?: string;
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
    isActive: boolean;
    emailVerified: boolean;
    role: {
        id: string;
        name: string;
    } | null;
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
type UserWithRole = User & {
    role?: {
        id: string;
        name: string;
    } | null;
};
export declare function toUserResponseDto(user: UserWithRole): UserResponseDto;
export {};
//# sourceMappingURL=users.dto.d.ts.map