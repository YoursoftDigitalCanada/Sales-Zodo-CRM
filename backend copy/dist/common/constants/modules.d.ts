/**
 * Sidebar module definitions
 * Used to determine which modules to show in the sidebar based on permissions
 */
export interface SidebarModule {
    id: string;
    name: string;
    icon: string;
    path: string;
    requiredPermissions: string[];
    children?: SidebarModule[];
    badge?: string;
    order: number;
}
export declare const SIDEBAR_MODULES: SidebarModule[];
/**
 * Get modules accessible by given permissions
 * Returns flat list of module IDs
 */
export declare function getModulesForPermissions(permissions: string[]): string[];
/**
 * Get full sidebar structure for given permissions
 * Returns hierarchical structure with only accessible modules
 */
export declare function getSidebarForPermissions(permissions: string[]): SidebarModule[];
/**
 * Get module by ID
 */
export declare function getModuleById(id: string): SidebarModule | undefined;
/**
 * Get parent module for a child module
 */
export declare function getParentModule(childId: string): SidebarModule | undefined;
/**
 * Get breadcrumb path for a module
 */
export declare function getModuleBreadcrumb(moduleId: string): SidebarModule[];
/**
 * Get all module IDs (flat list)
 */
export declare function getAllModuleIds(): string[];
/**
 * Check if a module exists
 */
export declare function moduleExists(moduleId: string): boolean;
/**
 * Get all top-level modules
 */
export declare function getTopLevelModules(): SidebarModule[];
/**
 * Get required permissions for accessing a module
 */
export declare function getModulePermissions(moduleId: string): string[];
/**
 * Check if user can access a specific module
 */
export declare function canAccessModule(moduleId: string, permissions: string[]): boolean;
//# sourceMappingURL=modules.d.ts.map