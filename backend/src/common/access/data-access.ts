import { Prisma } from '@prisma/client';

export interface DataAccessContext {
  hasFullAccess: boolean;
  allowedClientIds: string[];
  allowedProjectIds: string[];
  employeeId?: string;
  roleName?: string;
}

const FULL_ACCESS_ROLE_NAMES = new Set([
  'Owner',
  'Admin',
  'Super Admin',
  'ADMIN',
  'SUPER_ADMIN',
]);

export function hasFullDataAccess(roleName?: string | null): boolean {
  if (!roleName) {
    return false;
  }

  return FULL_ACCESS_ROLE_NAMES.has(roleName);
}

function denyAll<T extends Record<string, any>>(idField: string = 'id'): T {
  return { [idField]: '__no_access__' } as T;
}

function buildOrWhere<T extends { OR?: unknown }>(
  hasFullAccess: boolean,
  orConditions: T['OR'],
  idField?: string,
): T {
  if (hasFullAccess) {
    return {} as T;
  }

  if (Array.isArray(orConditions) && orConditions.length > 0) {
    return { OR: orConditions } as T;
  }

  return denyAll<T>(idField);
}

export function buildClientAccessWhere(dataAccess?: DataAccessContext): Prisma.ClientWhereInput {
  if (!dataAccess) {
    return {};
  }

  const orConditions: Prisma.ClientWhereInput[] = [];

  if (dataAccess.allowedClientIds.length > 0) {
    orConditions.push({ id: { in: dataAccess.allowedClientIds } });
  }

  if (dataAccess.employeeId) {
    orConditions.push({ assignedOwnerId: dataAccess.employeeId });
  }

  return buildOrWhere<Prisma.ClientWhereInput>(dataAccess.hasFullAccess, orConditions);
}

export function buildProjectAccessWhere(dataAccess?: DataAccessContext): Prisma.ProjectWhereInput {
  if (!dataAccess) {
    return {};
  }

  const orConditions: Prisma.ProjectWhereInput[] = [];

  if (dataAccess.allowedProjectIds.length > 0) {
    orConditions.push({ id: { in: dataAccess.allowedProjectIds } });
  }

  if (dataAccess.allowedClientIds.length > 0) {
    orConditions.push({ clientId: { in: dataAccess.allowedClientIds } });
  }

  if (dataAccess.employeeId) {
    orConditions.push({ projectManagerId: dataAccess.employeeId });
    orConditions.push({ salesRepId: dataAccess.employeeId });
    orConditions.push({ members: { some: { employeeId: dataAccess.employeeId } } });
  }

  return buildOrWhere<Prisma.ProjectWhereInput>(dataAccess.hasFullAccess, orConditions);
}

export function buildLeadAccessWhere(dataAccess?: DataAccessContext): Prisma.LeadWhereInput {
  if (!dataAccess) {
    return {};
  }

  const orConditions: Prisma.LeadWhereInput[] = [];

  if (dataAccess.employeeId) {
    orConditions.push({ assignedToId: dataAccess.employeeId });
    orConditions.push({ createdById: dataAccess.employeeId });
  }

  if (dataAccess.allowedClientIds.length > 0) {
    orConditions.push({ convertedToClientId: { in: dataAccess.allowedClientIds } });
    orConditions.push({
      projects: {
        some: {
          deletedAt: null,
          clientId: { in: dataAccess.allowedClientIds },
        },
      },
    });
  }

  if (dataAccess.allowedProjectIds.length > 0) {
    orConditions.push({
      projects: {
        some: {
          deletedAt: null,
          id: { in: dataAccess.allowedProjectIds },
        },
      },
    });
  }

  return buildOrWhere<Prisma.LeadWhereInput>(dataAccess.hasFullAccess, orConditions);
}

export function buildTaskAccessWhere(dataAccess?: DataAccessContext): Prisma.TaskWhereInput {
  if (!dataAccess) {
    return {};
  }

  const orConditions: Prisma.TaskWhereInput[] = [];

  if (dataAccess.employeeId) {
    orConditions.push({ assignedToId: dataAccess.employeeId });
    orConditions.push({ createdById: dataAccess.employeeId });
    orConditions.push({
      project: {
        OR: [
          { projectManagerId: dataAccess.employeeId },
          { salesRepId: dataAccess.employeeId },
          { members: { some: { employeeId: dataAccess.employeeId } } },
        ],
      },
    });
  }

  if (dataAccess.allowedClientIds.length > 0) {
    orConditions.push({ clientId: { in: dataAccess.allowedClientIds } });
    orConditions.push({
      project: {
        deletedAt: null,
        clientId: { in: dataAccess.allowedClientIds },
      },
    });
  }

  if (dataAccess.allowedProjectIds.length > 0) {
    orConditions.push({ projectId: { in: dataAccess.allowedProjectIds } });
  }

  return buildOrWhere<Prisma.TaskWhereInput>(dataAccess.hasFullAccess, orConditions);
}

export function mergeWhereWithAccess<T extends Record<string, any>>(
  baseWhere: T,
  accessWhere?: Record<string, any>,
): T {
  if (!accessWhere || Object.keys(accessWhere).length === 0) {
    return baseWhere;
  }

  return {
    AND: [baseWhere, accessWhere],
  } as unknown as T;
}
