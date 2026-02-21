/**
 * Permission codes used throughout the application
 * Format: MODULE_ACTION
 */
export declare const PERMISSIONS: {
    readonly DASHBOARD_VIEW: "dashboard.view";
    readonly LEADS_VIEW: "leads.view";
    readonly LEADS_CREATE: "leads.create";
    readonly LEADS_UPDATE: "leads.update";
    readonly LEADS_DELETE: "leads.delete";
    readonly LEADS_ASSIGN: "leads.assign";
    readonly LEADS_CONVERT: "leads.convert";
    readonly LEADS_IMPORT: "leads.import";
    readonly LEADS_EXPORT: "leads.export";
    readonly LEAD_SOURCES_VIEW: "lead-sources.view";
    readonly LEAD_SOURCES_CREATE: "lead-sources.create";
    readonly LEAD_SOURCES_UPDATE: "lead-sources.update";
    readonly LEAD_SOURCES_DELETE: "lead-sources.delete";
    readonly TAGS_VIEW: "tags.view";
    readonly TAGS_CREATE: "tags.create";
    readonly TAGS_UPDATE: "tags.update";
    readonly TAGS_DELETE: "tags.delete";
    readonly CLIENTS_VIEW: "clients.view";
    readonly CLIENTS_CREATE: "clients.create";
    readonly CLIENTS_UPDATE: "clients.update";
    readonly CLIENTS_DELETE: "clients.delete";
    readonly CLIENTS_ASSIGN: "clients.assign";
    readonly CONTACTS_VIEW: "contacts.view";
    readonly CONTACTS_CREATE: "contacts.create";
    readonly CONTACTS_UPDATE: "contacts.update";
    readonly CONTACTS_DELETE: "contacts.delete";
    readonly GROUPS_VIEW: "groups.view";
    readonly GROUPS_CREATE: "groups.create";
    readonly GROUPS_UPDATE: "groups.update";
    readonly GROUPS_DELETE: "groups.delete";
    readonly APPLICATIONS_VIEW: "applications.view";
    readonly APPLICATIONS_CREATE: "applications.create";
    readonly APPLICATIONS_UPDATE: "applications.update";
    readonly APPLICATIONS_DELETE: "applications.delete";
    readonly APPLICATIONS_APPROVE: "applications.approve";
    readonly APPLICATIONS_REJECT: "applications.reject";
    readonly TASKS_VIEW: "tasks.view";
    readonly TASKS_CREATE: "tasks.create";
    readonly TASKS_UPDATE: "tasks.update";
    readonly TASKS_DELETE: "tasks.delete";
    readonly TASKS_ASSIGN: "tasks.assign";
    readonly PROJECTS_VIEW: "projects.view";
    readonly PROJECTS_CREATE: "projects.create";
    readonly PROJECTS_UPDATE: "projects.update";
    readonly PROJECTS_DELETE: "projects.delete";
    readonly PROJECTS_MANAGE_MEMBERS: "projects.manage-members";
    readonly CALENDAR_VIEW: "calendar.view";
    readonly CALENDAR_CREATE: "calendar.create";
    readonly CALENDAR_UPDATE: "calendar.update";
    readonly CALENDAR_DELETE: "calendar.delete";
    readonly FILES_VIEW: "files.view";
    readonly FILES_CREATE: "files.create";
    readonly FILES_UPDATE: "files.update";
    readonly FILES_DELETE: "files.delete";
    readonly FILES_DOWNLOAD: "files.download";
    readonly FOLDERS_VIEW: "folders.view";
    readonly FOLDERS_CREATE: "folders.create";
    readonly FOLDERS_UPDATE: "folders.update";
    readonly FOLDERS_DELETE: "folders.delete";
    readonly INVOICES_VIEW: "invoices.view";
    readonly INVOICES_CREATE: "invoices.create";
    readonly INVOICES_UPDATE: "invoices.update";
    readonly INVOICES_DELETE: "invoices.delete";
    readonly INVOICES_SEND: "invoices.send";
    readonly INVOICES_MARK_PAID: "invoices.mark-paid";
    readonly EXPENSES_VIEW: "expenses.view";
    readonly EXPENSES_CREATE: "expenses.create";
    readonly EXPENSES_UPDATE: "expenses.update";
    readonly EXPENSES_DELETE: "expenses.delete";
    readonly EXPENSES_APPROVE: "expenses.approve";
    readonly EXPENSES_REIMBURSE: "expenses.reimburse";
    readonly BOOKINGS_VIEW: "bookings.view";
    readonly BOOKINGS_CREATE: "bookings.create";
    readonly BOOKINGS_UPDATE: "bookings.update";
    readonly BOOKINGS_DELETE: "bookings.delete";
    readonly BOOKINGS_CONFIRM: "bookings.confirm";
    readonly BOOKINGS_CANCEL: "bookings.cancel";
    readonly PRODUCTS_VIEW: "products.view";
    readonly PRODUCTS_CREATE: "products.create";
    readonly PRODUCTS_UPDATE: "products.update";
    readonly PRODUCTS_DELETE: "products.delete";
    readonly CATEGORIES_VIEW: "categories.view";
    readonly CATEGORIES_CREATE: "categories.create";
    readonly CATEGORIES_UPDATE: "categories.update";
    readonly CATEGORIES_DELETE: "categories.delete";
    readonly ORDERS_VIEW: "orders.view";
    readonly ORDERS_CREATE: "orders.create";
    readonly ORDERS_UPDATE: "orders.update";
    readonly ORDERS_DELETE: "orders.delete";
    readonly ORDERS_PROCESS: "orders.process";
    readonly ORDERS_SHIP: "orders.ship";
    readonly ORDERS_REFUND: "orders.refund";
    readonly EMAILS_VIEW: "emails.view";
    readonly EMAILS_CREATE: "emails.create";
    readonly EMAILS_SEND: "emails.send";
    readonly EMAILS_DELETE: "emails.delete";
    readonly CHAT_VIEW: "chat.view";
    readonly CHAT_CREATE: "chat.create";
    readonly CHAT_DELETE: "chat.delete";
    readonly ANALYTICS_VIEW: "analytics.view";
    readonly ANALYTICS_EXPORT: "analytics.export";
    readonly USERS_VIEW: "users.view";
    readonly USERS_CREATE: "users.create";
    readonly USERS_UPDATE: "users.update";
    readonly USERS_DELETE: "users.delete";
    readonly USERS_MANAGE_STATUS: "users.manage-status";
    readonly EMPLOYEES_VIEW: "employees.view";
    readonly EMPLOYEES_CREATE: "employees.create";
    readonly EMPLOYEES_UPDATE: "employees.update";
    readonly EMPLOYEES_DELETE: "employees.delete";
    readonly ROLES_VIEW: "roles.view";
    readonly ROLES_CREATE: "roles.create";
    readonly ROLES_UPDATE: "roles.update";
    readonly ROLES_DELETE: "roles.delete";
    readonly ROLES_ASSIGN_PERMISSIONS: "roles.assign-permissions";
    readonly TENANTS_VIEW: "tenants.view";
    readonly TENANTS_UPDATE: "tenants.update";
    readonly TENANTS_MANAGE_SUBSCRIPTION: "tenants.manage-subscription";
    readonly SETTINGS_VIEW: "settings.view";
    readonly SETTINGS_UPDATE: "settings.update";
    readonly SETTINGS_MANAGE_INTEGRATIONS: "settings.manage-integrations";
    readonly NOTIFICATIONS_VIEW: "notifications.view";
    readonly NOTIFICATIONS_MANAGE: "notifications.manage";
    readonly AUDIT_VIEW: "audit.view";
    readonly AUDIT_EXPORT: "audit.export";
};
export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export interface PermissionDefinition {
    code: PermissionCode;
    name: string;
    description: string;
    module: string;
    action: string;
}
/**
 * Full permission definitions with metadata
 */
export declare const PERMISSION_DEFINITIONS: PermissionDefinition[];
/**
 * Get all permission codes for a specific module
 */
export declare function getModulePermissions(module: string): PermissionCode[];
/**
 * Get all unique module names
 */
export declare function getAllModules(): string[];
/**
 * Check if a permission code is valid
 */
export declare function isValidPermission(code: string): code is PermissionCode;
/**
 * Get permission definition by code
 */
export declare function getPermissionDefinition(code: PermissionCode): PermissionDefinition | undefined;
//# sourceMappingURL=permissions.d.ts.map