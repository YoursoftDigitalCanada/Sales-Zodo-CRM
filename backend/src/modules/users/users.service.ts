import crypto from 'crypto';
import { UserStatus } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { tenantMailerService } from '../../common/services/tenant-mailer.service';
import { DEFAULT_EMAIL_TEMPLATES } from '../settings/settings.constants';
import { settingsManager } from '../settings/settings.manager';
import { settingsRepository } from '../settings/settings.repository';
import {
  type CreateUserDto,
  type InviteUserDto,
  type InviteUserResponseDto,
  type UpdateUserDto,
  type UserListResponseDto,
  type UserQueryDto,
  type UserResponseDto,
  toUserResponseDto,
} from './users.dto';
import { usersRepository } from './users.repository';

function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce(
    (output, [key, value]) => output.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template
  );
}

export class UsersService {
  private createTemporaryPassword(): string {
    return `Temp-${crypto.randomBytes(6).toString('hex')}!`;
  }

  async create(data: CreateUserDto, tenantId: string): Promise<UserResponseDto> {
    await settingsManager.assertUsageWithinPlan(tenantId, 'users');

    const existing = await usersRepository.findByEmail(data.email);
    if (existing) {
      throw new BadRequestError('Email already exists', ErrorCodes.USER_EMAIL_TAKEN);
    }

    const role = data.roleId
      ? await usersRepository.findRoleById(data.roleId, tenantId)
      : await usersRepository.findDefaultRole(tenantId);
    if (!role) {
      throw new BadRequestError('Role not found');
    }

    const user = await usersRepository.createWithMembership(
      {
        ...data,
        password: data.password || this.createTemporaryPassword(),
        roleId: role.id,
      },
      tenantId
    );

    return toUserResponseDto(user);
  }

  async invite(data: InviteUserDto, tenantId: string): Promise<InviteUserResponseDto> {
    await settingsManager.assertUsageWithinPlan(tenantId, 'users');

    const existing = await usersRepository.findByEmail(data.email);
    if (existing) {
      throw new BadRequestError('Email already exists', ErrorCodes.USER_EMAIL_TAKEN);
    }

    const role = await usersRepository.findRoleById(data.roleId, tenantId);
    if (!role) {
      throw new BadRequestError('Role not found');
    }

    const temporaryPassword = this.createTemporaryPassword();
    const firstName = data.firstName?.trim() || data.email.split('@')[0];
    const lastName = data.lastName?.trim() || '';

    const user = await usersRepository.createWithMembership(
      {
        email: data.email,
        firstName,
        lastName,
        phone: data.phone || null,
        password: temporaryPassword,
        roleId: role.id,
        department: data.department || null,
        position: data.position || null,
      },
      tenantId
    );

    const settings = await settingsRepository.ensure(tenantId);
    let inviteEmailSent = false;

    try {
      const inviteTemplate = DEFAULT_EMAIL_TEMPLATES.TEAM_INVITE;
      const workspaceName = settings.tenant?.name || 'Your workspace';
      const delivery = await tenantMailerService.sendTenantEmail({
        tenantId,
        to: data.email,
        subject: interpolateTemplate(inviteTemplate.subject, {
          workspaceName,
          firstName,
          roleName: role.name,
          temporaryPassword,
        }),
        html: interpolateTemplate(inviteTemplate.bodyHtml, {
          workspaceName,
          firstName,
          roleName: role.name,
          temporaryPassword,
        }),
        text: interpolateTemplate(inviteTemplate.bodyText, {
          workspaceName,
          firstName,
          roleName: role.name,
          temporaryPassword,
        }),
      });
      inviteEmailSent = delivery.sent;
    } catch {
      inviteEmailSent = false;
    }

    return {
      user: toUserResponseDto(user),
      temporaryPassword: inviteEmailSent ? undefined : temporaryPassword,
      inviteEmailSent,
    };
  }

  async getById(id: string, tenantId: string): Promise<UserResponseDto> {
    const user = await usersRepository.findById(id, tenantId);
    if (!user) {
      throw new NotFoundError('User not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }
    return toUserResponseDto(user);
  }

  async getMany(query: UserQueryDto, tenantId: string): Promise<UserListResponseDto> {
    const { data, total } = await usersRepository.findMany(query, tenantId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(toUserResponseDto),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async update(id: string, tenantId: string, data: UpdateUserDto): Promise<UserResponseDto> {
    const existing = await usersRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('User not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const user = await usersRepository.update(id, tenantId, data);
    if (!user) {
      throw new NotFoundError('User not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }
    return toUserResponseDto(user);
  }

  async updateStatus(id: string, tenantId: string, status: UserStatus): Promise<UserResponseDto> {
    const existing = await usersRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('User not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const user = await usersRepository.updateStatus(id, tenantId, status);
    if (!user) {
      throw new NotFoundError('User not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }
    return toUserResponseDto(user);
  }

  async updateRole(id: string, tenantId: string, roleId: string): Promise<UserResponseDto> {
    const existing = await usersRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('User not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const role = await usersRepository.findRoleById(roleId, tenantId);
    if (!role) {
      throw new BadRequestError('Role not found');
    }

    const user = await usersRepository.updateRole(id, tenantId, role.id);
    if (!user) {
      throw new NotFoundError('User not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }
    return toUserResponseDto(user);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await usersRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('User not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    await usersRepository.deactivateMembership(id, tenantId);
  }
}

export const usersService = new UsersService();
