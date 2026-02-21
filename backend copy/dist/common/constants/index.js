"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canAccessModule = exports.getModuleRequiredPermissions = exports.getTopLevelModules = exports.moduleExists = exports.getAllModuleIds = exports.getModuleBreadcrumb = exports.getParentModule = exports.getModuleById = exports.getSidebarForPermissions = exports.getModulesForPermissions = exports.SIDEBAR_MODULES = exports.isRoleAtLeast = exports.isRoleHigher = exports.isSystemRole = exports.getDefaultRole = exports.getRoleDefinition = exports.ROLE_HIERARCHY = exports.ROLE_DEFINITIONS = exports.SYSTEM_ROLES = exports.isValidPermission = exports.getAllModules = exports.getModulePermissions = exports.PERMISSION_DEFINITIONS = exports.PERMISSIONS = void 0;
// Permissions
var permissions_1 = require("./permissions");
Object.defineProperty(exports, "PERMISSIONS", { enumerable: true, get: function () { return permissions_1.PERMISSIONS; } });
Object.defineProperty(exports, "PERMISSION_DEFINITIONS", { enumerable: true, get: function () { return permissions_1.PERMISSION_DEFINITIONS; } });
Object.defineProperty(exports, "getModulePermissions", { enumerable: true, get: function () { return permissions_1.getModulePermissions; } });
Object.defineProperty(exports, "getAllModules", { enumerable: true, get: function () { return permissions_1.getAllModules; } });
Object.defineProperty(exports, "isValidPermission", { enumerable: true, get: function () { return permissions_1.isValidPermission; } });
// Roles
var roles_1 = require("./roles");
Object.defineProperty(exports, "SYSTEM_ROLES", { enumerable: true, get: function () { return roles_1.SYSTEM_ROLES; } });
Object.defineProperty(exports, "ROLE_DEFINITIONS", { enumerable: true, get: function () { return roles_1.ROLE_DEFINITIONS; } });
Object.defineProperty(exports, "ROLE_HIERARCHY", { enumerable: true, get: function () { return roles_1.ROLE_HIERARCHY; } });
Object.defineProperty(exports, "getRoleDefinition", { enumerable: true, get: function () { return roles_1.getRoleDefinition; } });
Object.defineProperty(exports, "getDefaultRole", { enumerable: true, get: function () { return roles_1.getDefaultRole; } });
Object.defineProperty(exports, "isSystemRole", { enumerable: true, get: function () { return roles_1.isSystemRole; } });
Object.defineProperty(exports, "isRoleHigher", { enumerable: true, get: function () { return roles_1.isRoleHigher; } });
Object.defineProperty(exports, "isRoleAtLeast", { enumerable: true, get: function () { return roles_1.isRoleAtLeast; } });
// Modules
var modules_1 = require("./modules");
Object.defineProperty(exports, "SIDEBAR_MODULES", { enumerable: true, get: function () { return modules_1.SIDEBAR_MODULES; } });
Object.defineProperty(exports, "getModulesForPermissions", { enumerable: true, get: function () { return modules_1.getModulesForPermissions; } });
Object.defineProperty(exports, "getSidebarForPermissions", { enumerable: true, get: function () { return modules_1.getSidebarForPermissions; } });
Object.defineProperty(exports, "getModuleById", { enumerable: true, get: function () { return modules_1.getModuleById; } });
Object.defineProperty(exports, "getParentModule", { enumerable: true, get: function () { return modules_1.getParentModule; } });
Object.defineProperty(exports, "getModuleBreadcrumb", { enumerable: true, get: function () { return modules_1.getModuleBreadcrumb; } });
Object.defineProperty(exports, "getAllModuleIds", { enumerable: true, get: function () { return modules_1.getAllModuleIds; } });
Object.defineProperty(exports, "moduleExists", { enumerable: true, get: function () { return modules_1.moduleExists; } });
Object.defineProperty(exports, "getTopLevelModules", { enumerable: true, get: function () { return modules_1.getTopLevelModules; } });
Object.defineProperty(exports, "getModuleRequiredPermissions", { enumerable: true, get: function () { return modules_1.getModulePermissions; } });
Object.defineProperty(exports, "canAccessModule", { enumerable: true, get: function () { return modules_1.canAccessModule; } });
//# sourceMappingURL=index.js.map