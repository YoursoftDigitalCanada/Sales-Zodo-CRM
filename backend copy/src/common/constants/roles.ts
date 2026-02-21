// ============================================================================
// ROLE CONSTANTS & DEFINITIONS
// ============================================================================

import { PERMISSIONS } from './permissions';

/**
 * System role names
 */
export const SYSTEM_ROLES = {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    EMPLOYEE: 'Employee',
    VIEWER: 'Viewer',
} as const;

export type SystemRole = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES];

/**
 * Role definition interface
 */
export interface RoleDefinition {
    name: string;
    description: string;
    isSystemRole: boolean;
    isDefault: boolean;
    permissions: string[];
}

// Get all permission codes as an array
const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// Common read-only permissions
const VIEW_PERMISSIONS = ALL_PERMISSIONS.filter(p => p.endsWith('.view'));

// Manager-level permissions (view + create + update)
const MANAGER_PERMISSIONS = ALL_PERMISSIONS.filter(p =>
    p.endsWith('.view') || p.endsWith('.create') || p.endsWith('.update') || p.endsWith('.assign')
);

// Employee permissions (limited)
const EMPLOYEE_PERMISSIONS = [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.CLIENTS_VIEW,
    PERMISSIONS.CONTACTS_VIEW,
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.CALENDAR_CREATE,
    PERMISSIONS.CALENDAR_UPDATE,
    PERMISSIONS.FILES_VIEW,
    PERMISSIONS.FILES_CREATE,
    PERMISSIONS.FILES_UPDATE,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.NOTIFICATIONS_MANAGE,
];

/**
 * Role definitions with their permissions
 */
export const ROLE_DEFINITIONS: RoleDefinition[] = [
    {
        name: SYSTEM_ROLES.OWNER,
        description: 'Full system access with all permissions',
        isSystemRole: true,
        isDefault: false,
        permissions: ALL_PERMISSIONS,
    },
    {
        name: SYSTEM_ROLES.ADMIN,
        description: 'Administrative access for managing the organization',
        isSystemRole: true,
        isDefault: false,
        permissions: ALL_PERMISSIONS.filter(p =>
            !p.startsWith('tenants.') && !p.startsWith('billing.')
        ),
    },
    {
        name: SYSTEM_ROLES.MANAGER,
        description: 'Manage teams and operations',
        isSystemRole: true,
        isDefault: false,
        permissions: MANAGER_PERMISSIONS,
    },
    {
        name: SYSTEM_ROLES.EMPLOYEE,
        description: 'Standard employee with limited permissions',
        isSystemRole: true,
        isDefault: true,
        permissions: EMPLOYEE_PERMISSIONS,
    },
    {
        name: SYSTEM_ROLES.VIEWER,
        description: 'Read-only access to view data',
        isSystemRole: true,
        isDefault: false,
        permissions: VIEW_PERMISSIONS,
    },
];

/**
 * Role hierarchy (higher index = higher level)
 */
export const ROLE_HIERARCHY: string[] = [
    SYSTEM_ROLES.VIEWER,
    SYSTEM_ROLES.EMPLOYEE,
    SYSTEM_ROLES.MANAGER,
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.OWNER,
];

/**
 * Get role definition by name
 */
export function getRoleDefinition(name: string): RoleDefinition | undefined {
    return ROLE_DEFINITIONS.find(r => r.name === name);
}

/**
 * Get the default role
 */
export function getDefaultRole(): RoleDefinition | undefined {
    return ROLE_DEFINITIONS.find(r => r.isDefault);
}

/**
 * Check if a role is a system role
 */
export function isSystemRole(name: string): boolean {
    return Object.values(SYSTEM_ROLES).includes(name as SystemRole);
}

/**
 * Check if roleA is higher than roleB in the hierarchy
 */
export function isRoleHigher(roleA: string, roleB: string): boolean {
    const indexA = ROLE_HIERARCHY.indexOf(roleA);
    const indexB = ROLE_HIERARCHY.indexOf(roleB);
    if (indexA === -1 || indexB === -1) return false;
    return indexA > indexB;
}

/**
 * Check if roleA is at least as high as roleB in the hierarchy
 */
export function isRoleAtLeast(roleA: string, roleB: string): boolean {
    const indexA = ROLE_HIERARCHY.indexOf(roleA);
    const indexB = ROLE_HIERARCHY.indexOf(roleB);
    if (indexA === -1 || indexB === -1) return false;
    return indexA >= indexB;
}
