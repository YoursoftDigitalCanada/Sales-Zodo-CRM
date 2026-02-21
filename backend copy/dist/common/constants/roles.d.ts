/**
 * System role names
 */
export declare const SYSTEM_ROLES: {
    readonly OWNER: "Owner";
    readonly ADMIN: "Admin";
    readonly MANAGER: "Manager";
    readonly EMPLOYEE: "Employee";
    readonly VIEWER: "Viewer";
};
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
/**
 * Role definitions with their permissions
 */
export declare const ROLE_DEFINITIONS: RoleDefinition[];
//# sourceMappingURL=roles.d.ts.map