"use strict";
// ============================================================================
// ROLE CONSTANTS & DEFINITIONS
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_DEFINITIONS = exports.SYSTEM_ROLES = void 0;
const permissions_1 = require("./permissions");
/**
 * System role names
 */
exports.SYSTEM_ROLES = {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    EMPLOYEE: 'Employee',
    VIEWER: 'Viewer',
};
// Get all permission codes as an array
const ALL_PERMISSIONS = Object.values(permissions_1.PERMISSIONS);
// Common read-only permissions
const VIEW_PERMISSIONS = ALL_PERMISSIONS.filter(p => p.endsWith('.view'));
// Manager-level permissions (view + create + update)
const MANAGER_PERMISSIONS = ALL_PERMISSIONS.filter(p => p.endsWith('.view') || p.endsWith('.create') || p.endsWith('.update') || p.endsWith('.assign'));
// Employee permissions (limited)
const EMPLOYEE_PERMISSIONS = [
    permissions_1.PERMISSIONS.DASHBOARD_VIEW,
    permissions_1.PERMISSIONS.TASKS_VIEW,
    permissions_1.PERMISSIONS.TASKS_CREATE,
    permissions_1.PERMISSIONS.TASKS_UPDATE,
    permissions_1.PERMISSIONS.PROJECTS_VIEW,
    permissions_1.PERMISSIONS.CLIENTS_VIEW,
    permissions_1.PERMISSIONS.CONTACTS_VIEW,
    permissions_1.PERMISSIONS.CALENDAR_VIEW,
    permissions_1.PERMISSIONS.CALENDAR_CREATE,
    permissions_1.PERMISSIONS.CALENDAR_UPDATE,
    permissions_1.PERMISSIONS.FILES_VIEW,
    permissions_1.PERMISSIONS.FILES_CREATE,
    permissions_1.PERMISSIONS.FILES_UPDATE,
    permissions_1.PERMISSIONS.NOTIFICATIONS_VIEW,
    permissions_1.PERMISSIONS.NOTIFICATIONS_MANAGE,
];
/**
 * Role definitions with their permissions
 */
exports.ROLE_DEFINITIONS = [
    {
        name: exports.SYSTEM_ROLES.OWNER,
        description: 'Full system access with all permissions',
        isSystemRole: true,
        isDefault: false,
        permissions: ALL_PERMISSIONS,
    },
    {
        name: exports.SYSTEM_ROLES.ADMIN,
        description: 'Administrative access for managing the organization',
        isSystemRole: true,
        isDefault: false,
        permissions: ALL_PERMISSIONS.filter(p => !p.startsWith('tenants.') && !p.startsWith('billing.')),
    },
    {
        name: exports.SYSTEM_ROLES.MANAGER,
        description: 'Manage teams and operations',
        isSystemRole: true,
        isDefault: false,
        permissions: MANAGER_PERMISSIONS,
    },
    {
        name: exports.SYSTEM_ROLES.EMPLOYEE,
        description: 'Standard employee with limited permissions',
        isSystemRole: true,
        isDefault: true,
        permissions: EMPLOYEE_PERMISSIONS,
    },
    {
        name: exports.SYSTEM_ROLES.VIEWER,
        description: 'Read-only access to view data',
        isSystemRole: true,
        isDefault: false,
        permissions: VIEW_PERMISSIONS,
    },
];
//# sourceMappingURL=roles.js.map