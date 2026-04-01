import { UserStatus } from '@prisma/client';

export interface CreateUserDto {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  department?: string | null;
  position?: string | null;
  tenantId?: string;
  roleId?: string;
  sendInviteEmail?: boolean;
}

export interface InviteUserDto {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  department?: string | null;
  position?: string | null;
  roleId: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  avatar?: string | null;
  status?: UserStatus;
  department?: string | null;
  position?: string | null;
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
  lastLoginAt: Date | null;
  employeeId: string | null;
  role: { id: string; name: string } | null;
  department: string | null;
  position: string | null;
  membershipStatus: 'active' | 'invited' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface InviteUserResponseDto {
  user: UserResponseDto;
  temporaryPassword?: string;
  inviteEmailSent: boolean;
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

type UserMembershipRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  phone: string | null;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employees?: Array<{
    id: string;
    isActive: boolean;
    department: string | null;
    position: string | null;
    role: { id: string; name: string } | null;
  }>;
};

export function toUserResponseDto(user: UserMembershipRecord): UserResponseDto {
  const membership = user.employees?.[0] || null;
  const membershipStatus: UserResponseDto['membershipStatus'] =
    !membership || !membership.isActive || user.status === 'INACTIVE' || user.status === 'SUSPENDED'
      ? 'suspended'
      : user.status === 'PENDING_VERIFICATION' || !user.lastLoginAt
        ? 'invited'
        : 'active';

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
    lastLoginAt: user.lastLoginAt,
    employeeId: membership?.id || null,
    role: membership?.role || null,
    department: membership?.department || null,
    position: membership?.position || null,
    membershipStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
