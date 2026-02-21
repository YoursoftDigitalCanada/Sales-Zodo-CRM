// Permissions
export {
  PERMISSIONS,
  PERMISSION_DEFINITIONS,
  getModulePermissions,
  getAllModules,
  isValidPermission,
  type PermissionCode,
  type PermissionDefinition,
} from './permissions';

// Roles
export {
  SYSTEM_ROLES,
  ROLE_DEFINITIONS,
  ROLE_HIERARCHY,
  getRoleDefinition,
  getDefaultRole,
  isSystemRole,
  isRoleHigher,
  isRoleAtLeast,
  type SystemRole,
  type RoleDefinition,
} from './roles';

// Modules
export {
  SIDEBAR_MODULES,
  getModulesForPermissions,
  getSidebarForPermissions,
  getModuleById,
  getParentModule,
  getModuleBreadcrumb,
  getAllModuleIds,
  moduleExists,
  getTopLevelModules,
  getModulePermissions as getModuleRequiredPermissions,
  canAccessModule,
  type SidebarModule,
} from './modules';