// ============================================================================
// PERMISSIONS CONSTANTS
// ============================================================================

/**
 * Permission codes used throughout the application
 * Format: MODULE_ACTION
 */
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // Leads
  LEADS_VIEW: 'leads.view',
  LEADS_CREATE: 'leads.create',
  LEADS_UPDATE: 'leads.update',
  LEADS_DELETE: 'leads.delete',
  LEADS_ASSIGN: 'leads.assign',
  LEADS_CONVERT: 'leads.convert',
  LEADS_IMPORT: 'leads.import',
  LEADS_EXPORT: 'leads.export',

  // Lead Sources
  LEAD_SOURCES_VIEW: 'lead-sources.view',
  LEAD_SOURCES_CREATE: 'lead-sources.create',
  LEAD_SOURCES_UPDATE: 'lead-sources.update',
  LEAD_SOURCES_DELETE: 'lead-sources.delete',

  // Tags
  TAGS_VIEW: 'tags.view',
  TAGS_CREATE: 'tags.create',
  TAGS_UPDATE: 'tags.update',
  TAGS_DELETE: 'tags.delete',

  // Clients
  CLIENTS_VIEW: 'clients.view',
  CLIENTS_CREATE: 'clients.create',
  CLIENTS_UPDATE: 'clients.update',
  CLIENTS_DELETE: 'clients.delete',
  CLIENTS_ASSIGN: 'clients.assign',

  // Contacts
  CONTACTS_VIEW: 'contacts.view',
  CONTACTS_CREATE: 'contacts.create',
  CONTACTS_UPDATE: 'contacts.update',
  CONTACTS_DELETE: 'contacts.delete',

  // Groups
  GROUPS_VIEW: 'groups.view',
  GROUPS_CREATE: 'groups.create',
  GROUPS_UPDATE: 'groups.update',
  GROUPS_DELETE: 'groups.delete',

  // Applications
  APPLICATIONS_VIEW: 'applications.view',
  APPLICATIONS_CREATE: 'applications.create',
  APPLICATIONS_UPDATE: 'applications.update',
  APPLICATIONS_DELETE: 'applications.delete',
  APPLICATIONS_APPROVE: 'applications.approve',
  APPLICATIONS_REJECT: 'applications.reject',

  // Tasks
  TASKS_VIEW: 'tasks.view',
  TASKS_CREATE: 'tasks.create',
  TASKS_UPDATE: 'tasks.update',
  TASKS_DELETE: 'tasks.delete',
  TASKS_ASSIGN: 'tasks.assign',

  // Projects
  PROJECTS_VIEW: 'projects.view',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_UPDATE: 'projects.update',
  PROJECTS_DELETE: 'projects.delete',
  PROJECTS_MANAGE_MEMBERS: 'projects.manage-members',

  // Calendar
  CALENDAR_VIEW: 'calendar.view',
  CALENDAR_CREATE: 'calendar.create',
  CALENDAR_UPDATE: 'calendar.update',
  CALENDAR_DELETE: 'calendar.delete',

  // Files
  FILES_VIEW: 'files.view',
  FILES_CREATE: 'files.create',
  FILES_UPDATE: 'files.update',
  FILES_DELETE: 'files.delete',
  FILES_DOWNLOAD: 'files.download',

  // Folders
  FOLDERS_VIEW: 'folders.view',
  FOLDERS_CREATE: 'folders.create',
  FOLDERS_UPDATE: 'folders.update',
  FOLDERS_DELETE: 'folders.delete',

  // Invoices
  INVOICES_VIEW: 'invoices.view',
  INVOICES_CREATE: 'invoices.create',
  INVOICES_UPDATE: 'invoices.update',
  INVOICES_DELETE: 'invoices.delete',
  INVOICES_SEND: 'invoices.send',
  INVOICES_MARK_PAID: 'invoices.mark-paid',

  // Quotes / Proposals
  QUOTES_VIEW: 'quotes.view',
  QUOTES_CREATE: 'quotes.create',
  QUOTES_UPDATE: 'quotes.update',
  QUOTES_DELETE: 'quotes.delete',

  // Contracts
  CONTRACTS_VIEW: 'contracts.view',
  CONTRACTS_CREATE: 'contracts.create',
  CONTRACTS_UPDATE: 'contracts.update',
  CONTRACTS_DELETE: 'contracts.delete',

  // Expenses
  EXPENSES_VIEW: 'expenses.view',
  EXPENSES_CREATE: 'expenses.create',
  EXPENSES_UPDATE: 'expenses.update',
  EXPENSES_DELETE: 'expenses.delete',
  EXPENSES_APPROVE: 'expenses.approve',
  EXPENSES_REIMBURSE: 'expenses.reimburse',

  // Bookings
  BOOKINGS_VIEW: 'bookings.view',
  BOOKINGS_CREATE: 'bookings.create',
  BOOKINGS_UPDATE: 'bookings.update',
  BOOKINGS_DELETE: 'bookings.delete',
  BOOKINGS_CONFIRM: 'bookings.confirm',
  BOOKINGS_CANCEL: 'bookings.cancel',

  // Services
  SERVICES_VIEW: 'services.view',
  SERVICES_CREATE: 'services.create',
  SERVICES_UPDATE: 'services.update',
  SERVICES_DELETE: 'services.delete',

  // Products
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_DELETE: 'products.delete',

  // Categories
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_UPDATE: 'categories.update',
  CATEGORIES_DELETE: 'categories.delete',

  // Orders
  ORDERS_VIEW: 'orders.view',
  ORDERS_CREATE: 'orders.create',
  ORDERS_UPDATE: 'orders.update',
  ORDERS_DELETE: 'orders.delete',
  ORDERS_PROCESS: 'orders.process',
  ORDERS_SHIP: 'orders.ship',
  ORDERS_REFUND: 'orders.refund',

  // Emails
  EMAILS_VIEW: 'emails.view',
  EMAILS_CREATE: 'emails.create',
  EMAILS_SEND: 'emails.send',
  EMAILS_DELETE: 'emails.delete',

  // Chat
  CHAT_VIEW: 'chat.view',
  CHAT_CREATE: 'chat.create',
  CHAT_DELETE: 'chat.delete',

  // Analytics
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_EXPORT: 'analytics.export',

  // Users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_MANAGE_STATUS: 'users.manage-status',

  // Employees
  EMPLOYEES_VIEW: 'employees.view',
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_UPDATE: 'employees.update',
  EMPLOYEES_DELETE: 'employees.delete',

  // Roles
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  ROLES_ASSIGN_PERMISSIONS: 'roles.assign-permissions',

  // Tenants
  TENANTS_VIEW: 'tenants.view',
  TENANTS_CREATE: 'tenants.create',
  TENANTS_UPDATE: 'tenants.update',
  TENANTS_DELETE: 'tenants.delete',
  TENANTS_MANAGE_SUBSCRIPTION: 'tenants.manage-subscription',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',
  SETTINGS_MANAGE_INTEGRATIONS: 'settings.manage-integrations',

  // Notifications
  NOTIFICATIONS_VIEW: 'notifications.view',
  NOTIFICATIONS_MANAGE: 'notifications.manage',

  // Audit Logs
  AUDIT_VIEW: 'audit.view',
  AUDIT_EXPORT: 'audit.export',

  // Support
  SUPPORT_VIEW: 'support.view',
  SUPPORT_CREATE: 'support.create',
  SUPPORT_UPDATE: 'support.update',
  SUPPORT_DELETE: 'support.delete',

  // Roof Estimator
  ROOF_ESTIMATOR_VIEW: 'roof-estimator.view',
  ROOF_ESTIMATOR_CREATE: 'roof-estimator.create',
  ROOF_ESTIMATOR_UPDATE: 'roof-estimator.update',
  ROOF_ESTIMATOR_DELETE: 'roof-estimator.delete',
  ROOF_ESTIMATOR_SETTINGS: 'roof-estimator.settings',
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

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
export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Dashboard
  { code: PERMISSIONS.DASHBOARD_VIEW, name: 'View Dashboard', description: 'Access the main dashboard', module: 'dashboard', action: 'view' },

  // Leads
  { code: PERMISSIONS.LEADS_VIEW, name: 'View Leads', description: 'View lead listings and details', module: 'leads', action: 'view' },
  { code: PERMISSIONS.LEADS_CREATE, name: 'Create Leads', description: 'Create new leads', module: 'leads', action: 'create' },
  { code: PERMISSIONS.LEADS_UPDATE, name: 'Update Leads', description: 'Edit lead information', module: 'leads', action: 'update' },
  { code: PERMISSIONS.LEADS_DELETE, name: 'Delete Leads', description: 'Remove leads from the system', module: 'leads', action: 'delete' },
  { code: PERMISSIONS.LEADS_ASSIGN, name: 'Assign Leads', description: 'Assign leads to employees', module: 'leads', action: 'assign' },
  { code: PERMISSIONS.LEADS_CONVERT, name: 'Convert Leads', description: 'Convert leads to clients', module: 'leads', action: 'convert' },
  { code: PERMISSIONS.LEADS_IMPORT, name: 'Import Leads', description: 'Bulk import leads', module: 'leads', action: 'import' },
  { code: PERMISSIONS.LEADS_EXPORT, name: 'Export Leads', description: 'Export lead data', module: 'leads', action: 'export' },

  // Lead Sources
  { code: PERMISSIONS.LEAD_SOURCES_VIEW, name: 'View Lead Sources', description: 'View lead sources', module: 'lead-sources', action: 'view' },
  { code: PERMISSIONS.LEAD_SOURCES_CREATE, name: 'Create Lead Sources', description: 'Create lead sources', module: 'lead-sources', action: 'create' },
  { code: PERMISSIONS.LEAD_SOURCES_UPDATE, name: 'Update Lead Sources', description: 'Edit lead sources', module: 'lead-sources', action: 'update' },
  { code: PERMISSIONS.LEAD_SOURCES_DELETE, name: 'Delete Lead Sources', description: 'Remove lead sources', module: 'lead-sources', action: 'delete' },

  // Tags
  { code: PERMISSIONS.TAGS_VIEW, name: 'View Tags', description: 'View tags', module: 'tags', action: 'view' },
  { code: PERMISSIONS.TAGS_CREATE, name: 'Create Tags', description: 'Create tags', module: 'tags', action: 'create' },
  { code: PERMISSIONS.TAGS_UPDATE, name: 'Update Tags', description: 'Edit tags', module: 'tags', action: 'update' },
  { code: PERMISSIONS.TAGS_DELETE, name: 'Delete Tags', description: 'Remove tags', module: 'tags', action: 'delete' },

  // Clients
  { code: PERMISSIONS.CLIENTS_VIEW, name: 'View Clients', description: 'View client listings and details', module: 'clients', action: 'view' },
  { code: PERMISSIONS.CLIENTS_CREATE, name: 'Create Clients', description: 'Create new clients', module: 'clients', action: 'create' },
  { code: PERMISSIONS.CLIENTS_UPDATE, name: 'Update Clients', description: 'Edit client information', module: 'clients', action: 'update' },
  { code: PERMISSIONS.CLIENTS_DELETE, name: 'Delete Clients', description: 'Remove clients from the system', module: 'clients', action: 'delete' },
  { code: PERMISSIONS.CLIENTS_ASSIGN, name: 'Assign Clients', description: 'Assign clients to employees', module: 'clients', action: 'assign' },

  // Contacts
  { code: PERMISSIONS.CONTACTS_VIEW, name: 'View Contacts', description: 'View contact listings', module: 'contacts', action: 'view' },
  { code: PERMISSIONS.CONTACTS_CREATE, name: 'Create Contacts', description: 'Create new contacts', module: 'contacts', action: 'create' },
  { code: PERMISSIONS.CONTACTS_UPDATE, name: 'Update Contacts', description: 'Edit contact information', module: 'contacts', action: 'update' },
  { code: PERMISSIONS.CONTACTS_DELETE, name: 'Delete Contacts', description: 'Remove contacts', module: 'contacts', action: 'delete' },

  // Groups
  { code: PERMISSIONS.GROUPS_VIEW, name: 'View Groups', description: 'View client groups', module: 'groups', action: 'view' },
  { code: PERMISSIONS.GROUPS_CREATE, name: 'Create Groups', description: 'Create client groups', module: 'groups', action: 'create' },
  { code: PERMISSIONS.GROUPS_UPDATE, name: 'Update Groups', description: 'Edit client groups', module: 'groups', action: 'update' },
  { code: PERMISSIONS.GROUPS_DELETE, name: 'Delete Groups', description: 'Remove client groups', module: 'groups', action: 'delete' },

  // Applications
  { code: PERMISSIONS.APPLICATIONS_VIEW, name: 'View Applications', description: 'View applications', module: 'applications', action: 'view' },
  { code: PERMISSIONS.APPLICATIONS_CREATE, name: 'Create Applications', description: 'Create applications', module: 'applications', action: 'create' },
  { code: PERMISSIONS.APPLICATIONS_UPDATE, name: 'Update Applications', description: 'Edit applications', module: 'applications', action: 'update' },
  { code: PERMISSIONS.APPLICATIONS_DELETE, name: 'Delete Applications', description: 'Remove applications', module: 'applications', action: 'delete' },
  { code: PERMISSIONS.APPLICATIONS_APPROVE, name: 'Approve Applications', description: 'Approve applications', module: 'applications', action: 'approve' },
  { code: PERMISSIONS.APPLICATIONS_REJECT, name: 'Reject Applications', description: 'Reject applications', module: 'applications', action: 'reject' },

  // Tasks
  { code: PERMISSIONS.TASKS_VIEW, name: 'View Tasks', description: 'View task listings', module: 'tasks', action: 'view' },
  { code: PERMISSIONS.TASKS_CREATE, name: 'Create Tasks', description: 'Create new tasks', module: 'tasks', action: 'create' },
  { code: PERMISSIONS.TASKS_UPDATE, name: 'Update Tasks', description: 'Edit task information', module: 'tasks', action: 'update' },
  { code: PERMISSIONS.TASKS_DELETE, name: 'Delete Tasks', description: 'Remove tasks', module: 'tasks', action: 'delete' },
  { code: PERMISSIONS.TASKS_ASSIGN, name: 'Assign Tasks', description: 'Assign tasks to employees', module: 'tasks', action: 'assign' },

  // Projects
  { code: PERMISSIONS.PROJECTS_VIEW, name: 'View Projects', description: 'View project listings', module: 'projects', action: 'view' },
  { code: PERMISSIONS.PROJECTS_CREATE, name: 'Create Projects', description: 'Create new projects', module: 'projects', action: 'create' },
  { code: PERMISSIONS.PROJECTS_UPDATE, name: 'Update Projects', description: 'Edit project information', module: 'projects', action: 'update' },
  { code: PERMISSIONS.PROJECTS_DELETE, name: 'Delete Projects', description: 'Remove projects', module: 'projects', action: 'delete' },
  { code: PERMISSIONS.PROJECTS_MANAGE_MEMBERS, name: 'Manage Project Members', description: 'Add/remove project members', module: 'projects', action: 'manage-members' },

  // Calendar
  { code: PERMISSIONS.CALENDAR_VIEW, name: 'View Calendar', description: 'View calendar events', module: 'calendar', action: 'view' },
  { code: PERMISSIONS.CALENDAR_CREATE, name: 'Create Events', description: 'Create calendar events', module: 'calendar', action: 'create' },
  { code: PERMISSIONS.CALENDAR_UPDATE, name: 'Update Events', description: 'Edit calendar events', module: 'calendar', action: 'update' },
  { code: PERMISSIONS.CALENDAR_DELETE, name: 'Delete Events', description: 'Remove calendar events', module: 'calendar', action: 'delete' },

  // Files
  { code: PERMISSIONS.FILES_VIEW, name: 'View Files', description: 'View files', module: 'files', action: 'view' },
  { code: PERMISSIONS.FILES_CREATE, name: 'Upload Files', description: 'Upload new files', module: 'files', action: 'create' },
  { code: PERMISSIONS.FILES_UPDATE, name: 'Update Files', description: 'Edit file information', module: 'files', action: 'update' },
  { code: PERMISSIONS.FILES_DELETE, name: 'Delete Files', description: 'Remove files', module: 'files', action: 'delete' },
  { code: PERMISSIONS.FILES_DOWNLOAD, name: 'Download Files', description: 'Download files', module: 'files', action: 'download' },

  // Folders
  { code: PERMISSIONS.FOLDERS_VIEW, name: 'View Folders', description: 'View folders', module: 'folders', action: 'view' },
  { code: PERMISSIONS.FOLDERS_CREATE, name: 'Create Folders', description: 'Create new folders', module: 'folders', action: 'create' },
  { code: PERMISSIONS.FOLDERS_UPDATE, name: 'Update Folders', description: 'Edit folders', module: 'folders', action: 'update' },
  { code: PERMISSIONS.FOLDERS_DELETE, name: 'Delete Folders', description: 'Remove folders', module: 'folders', action: 'delete' },

  // Invoices
  { code: PERMISSIONS.INVOICES_VIEW, name: 'View Invoices', description: 'View invoices', module: 'invoices', action: 'view' },
  { code: PERMISSIONS.INVOICES_CREATE, name: 'Create Invoices', description: 'Create new invoices', module: 'invoices', action: 'create' },
  { code: PERMISSIONS.INVOICES_UPDATE, name: 'Update Invoices', description: 'Edit invoices', module: 'invoices', action: 'update' },
  { code: PERMISSIONS.INVOICES_DELETE, name: 'Delete Invoices', description: 'Remove invoices', module: 'invoices', action: 'delete' },
  { code: PERMISSIONS.INVOICES_SEND, name: 'Send Invoices', description: 'Send invoices to clients', module: 'invoices', action: 'send' },
  { code: PERMISSIONS.INVOICES_MARK_PAID, name: 'Mark Invoices Paid', description: 'Mark invoices as paid', module: 'invoices', action: 'mark-paid' },

  // Quotes
  { code: PERMISSIONS.QUOTES_VIEW, name: 'View Quotes', description: 'View quotes and proposals', module: 'quotes', action: 'view' },
  { code: PERMISSIONS.QUOTES_CREATE, name: 'Create Quotes', description: 'Create new quotes', module: 'quotes', action: 'create' },
  { code: PERMISSIONS.QUOTES_UPDATE, name: 'Update Quotes', description: 'Edit quotes', module: 'quotes', action: 'update' },
  { code: PERMISSIONS.QUOTES_DELETE, name: 'Delete Quotes', description: 'Remove quotes', module: 'quotes', action: 'delete' },

  // Contracts
  { code: PERMISSIONS.CONTRACTS_VIEW, name: 'View Contracts', description: 'View contracts', module: 'contracts', action: 'view' },
  { code: PERMISSIONS.CONTRACTS_CREATE, name: 'Create Contracts', description: 'Create contracts', module: 'contracts', action: 'create' },
  { code: PERMISSIONS.CONTRACTS_UPDATE, name: 'Update Contracts', description: 'Edit contracts', module: 'contracts', action: 'update' },
  { code: PERMISSIONS.CONTRACTS_DELETE, name: 'Delete Contracts', description: 'Remove contracts', module: 'contracts', action: 'delete' },

  // Expenses
  { code: PERMISSIONS.EXPENSES_VIEW, name: 'View Expenses', description: 'View expenses', module: 'expenses', action: 'view' },
  { code: PERMISSIONS.EXPENSES_CREATE, name: 'Create Expenses', description: 'Create expense reports', module: 'expenses', action: 'create' },
  { code: PERMISSIONS.EXPENSES_UPDATE, name: 'Update Expenses', description: 'Edit expenses', module: 'expenses', action: 'update' },
  { code: PERMISSIONS.EXPENSES_DELETE, name: 'Delete Expenses', description: 'Remove expenses', module: 'expenses', action: 'delete' },
  { code: PERMISSIONS.EXPENSES_APPROVE, name: 'Approve Expenses', description: 'Approve expense reports', module: 'expenses', action: 'approve' },
  { code: PERMISSIONS.EXPENSES_REIMBURSE, name: 'Reimburse Expenses', description: 'Mark expenses as reimbursed', module: 'expenses', action: 'reimburse' },

  // Bookings
  { code: PERMISSIONS.BOOKINGS_VIEW, name: 'View Bookings', description: 'View bookings', module: 'bookings', action: 'view' },
  { code: PERMISSIONS.BOOKINGS_CREATE, name: 'Create Bookings', description: 'Create new bookings', module: 'bookings', action: 'create' },
  { code: PERMISSIONS.BOOKINGS_UPDATE, name: 'Update Bookings', description: 'Edit bookings', module: 'bookings', action: 'update' },
  { code: PERMISSIONS.BOOKINGS_DELETE, name: 'Delete Bookings', description: 'Remove bookings', module: 'bookings', action: 'delete' },
  { code: PERMISSIONS.BOOKINGS_CONFIRM, name: 'Confirm Bookings', description: 'Confirm bookings', module: 'bookings', action: 'confirm' },
  { code: PERMISSIONS.BOOKINGS_CANCEL, name: 'Cancel Bookings', description: 'Cancel bookings', module: 'bookings', action: 'cancel' },

  // Services
  { code: PERMISSIONS.SERVICES_VIEW, name: 'View Services', description: 'View service offerings', module: 'services', action: 'view' },
  { code: PERMISSIONS.SERVICES_CREATE, name: 'Create Services', description: 'Create new services', module: 'services', action: 'create' },
  { code: PERMISSIONS.SERVICES_UPDATE, name: 'Update Services', description: 'Edit services', module: 'services', action: 'update' },
  { code: PERMISSIONS.SERVICES_DELETE, name: 'Delete Services', description: 'Remove or deactivate services', module: 'services', action: 'delete' },

  // Products
  { code: PERMISSIONS.PRODUCTS_VIEW, name: 'View Products', description: 'View products', module: 'products', action: 'view' },
  { code: PERMISSIONS.PRODUCTS_CREATE, name: 'Create Products', description: 'Create products', module: 'products', action: 'create' },
  { code: PERMISSIONS.PRODUCTS_UPDATE, name: 'Update Products', description: 'Edit products', module: 'products', action: 'update' },
  { code: PERMISSIONS.PRODUCTS_DELETE, name: 'Delete Products', description: 'Remove products', module: 'products', action: 'delete' },

  // Categories
  { code: PERMISSIONS.CATEGORIES_VIEW, name: 'View Categories', description: 'View product categories', module: 'categories', action: 'view' },
  { code: PERMISSIONS.CATEGORIES_CREATE, name: 'Create Categories', description: 'Create categories', module: 'categories', action: 'create' },
  { code: PERMISSIONS.CATEGORIES_UPDATE, name: 'Update Categories', description: 'Edit categories', module: 'categories', action: 'update' },
  { code: PERMISSIONS.CATEGORIES_DELETE, name: 'Delete Categories', description: 'Remove categories', module: 'categories', action: 'delete' },

  // Orders
  { code: PERMISSIONS.ORDERS_VIEW, name: 'View Orders', description: 'View orders', module: 'orders', action: 'view' },
  { code: PERMISSIONS.ORDERS_CREATE, name: 'Create Orders', description: 'Create orders', module: 'orders', action: 'create' },
  { code: PERMISSIONS.ORDERS_UPDATE, name: 'Update Orders', description: 'Edit orders', module: 'orders', action: 'update' },
  { code: PERMISSIONS.ORDERS_DELETE, name: 'Delete Orders', description: 'Remove orders', module: 'orders', action: 'delete' },
  { code: PERMISSIONS.ORDERS_PROCESS, name: 'Process Orders', description: 'Process orders', module: 'orders', action: 'process' },
  { code: PERMISSIONS.ORDERS_SHIP, name: 'Ship Orders', description: 'Mark orders as shipped', module: 'orders', action: 'ship' },
  { code: PERMISSIONS.ORDERS_REFUND, name: 'Refund Orders', description: 'Issue refunds', module: 'orders', action: 'refund' },

  // Emails
  { code: PERMISSIONS.EMAILS_VIEW, name: 'View Emails', description: 'View emails', module: 'emails', action: 'view' },
  { code: PERMISSIONS.EMAILS_CREATE, name: 'Create Emails', description: 'Create email drafts', module: 'emails', action: 'create' },
  { code: PERMISSIONS.EMAILS_SEND, name: 'Send Emails', description: 'Send emails', module: 'emails', action: 'send' },
  { code: PERMISSIONS.EMAILS_DELETE, name: 'Delete Emails', description: 'Remove emails', module: 'emails', action: 'delete' },

  // Chat
  { code: PERMISSIONS.CHAT_VIEW, name: 'View Chat', description: 'Access chat', module: 'chat', action: 'view' },
  { code: PERMISSIONS.CHAT_CREATE, name: 'Create Chat Rooms', description: 'Create chat rooms', module: 'chat', action: 'create' },
  { code: PERMISSIONS.CHAT_DELETE, name: 'Delete Chat', description: 'Delete chat messages/rooms', module: 'chat', action: 'delete' },

  // Analytics
  { code: PERMISSIONS.ANALYTICS_VIEW, name: 'View Analytics', description: 'Access analytics dashboard', module: 'analytics', action: 'view' },
  { code: PERMISSIONS.ANALYTICS_EXPORT, name: 'Export Analytics', description: 'Export analytics data', module: 'analytics', action: 'export' },

  // Users
  { code: PERMISSIONS.USERS_VIEW, name: 'View Users', description: 'View user list', module: 'users', action: 'view' },
  { code: PERMISSIONS.USERS_CREATE, name: 'Create Users', description: 'Create/invite new users', module: 'users', action: 'create' },
  { code: PERMISSIONS.USERS_UPDATE, name: 'Update Users', description: 'Edit user information', module: 'users', action: 'update' },
  { code: PERMISSIONS.USERS_DELETE, name: 'Delete Users', description: 'Remove users', module: 'users', action: 'delete' },
  { code: PERMISSIONS.USERS_MANAGE_STATUS, name: 'Manage User Status', description: 'Activate/deactivate users', module: 'users', action: 'manage-status' },

  // Employees
  { code: PERMISSIONS.EMPLOYEES_VIEW, name: 'View Employees', description: 'View employee list', module: 'employees', action: 'view' },
  { code: PERMISSIONS.EMPLOYEES_CREATE, name: 'Create Employees', description: 'Add employees', module: 'employees', action: 'create' },
  { code: PERMISSIONS.EMPLOYEES_UPDATE, name: 'Update Employees', description: 'Edit employee info', module: 'employees', action: 'update' },
  { code: PERMISSIONS.EMPLOYEES_DELETE, name: 'Delete Employees', description: 'Remove employees', module: 'employees', action: 'delete' },

  // Roles
  { code: PERMISSIONS.ROLES_VIEW, name: 'View Roles', description: 'View roles', module: 'roles', action: 'view' },
  { code: PERMISSIONS.ROLES_CREATE, name: 'Create Roles', description: 'Create roles', module: 'roles', action: 'create' },
  { code: PERMISSIONS.ROLES_UPDATE, name: 'Update Roles', description: 'Edit roles', module: 'roles', action: 'update' },
  { code: PERMISSIONS.ROLES_DELETE, name: 'Delete Roles', description: 'Remove roles', module: 'roles', action: 'delete' },
  { code: PERMISSIONS.ROLES_ASSIGN_PERMISSIONS, name: 'Assign Permissions', description: 'Manage role permissions', module: 'roles', action: 'assign-permissions' },

  // Tenants
  { code: PERMISSIONS.TENANTS_VIEW, name: 'View Tenant', description: 'View tenant information', module: 'tenants', action: 'view' },
  { code: PERMISSIONS.TENANTS_CREATE, name: 'Create Tenant', description: 'Create new tenants', module: 'tenants', action: 'create' },
  { code: PERMISSIONS.TENANTS_UPDATE, name: 'Update Tenant', description: 'Edit tenant settings', module: 'tenants', action: 'update' },
  { code: PERMISSIONS.TENANTS_DELETE, name: 'Delete Tenant', description: 'Delete tenants', module: 'tenants', action: 'delete' },
  { code: PERMISSIONS.TENANTS_MANAGE_SUBSCRIPTION, name: 'Manage Subscription', description: 'Manage tenant subscription', module: 'tenants', action: 'manage-subscription' },

  // Settings
  { code: PERMISSIONS.SETTINGS_VIEW, name: 'View Settings', description: 'View settings', module: 'settings', action: 'view' },
  { code: PERMISSIONS.SETTINGS_UPDATE, name: 'Update Settings', description: 'Edit settings', module: 'settings', action: 'update' },
  { code: PERMISSIONS.SETTINGS_MANAGE_INTEGRATIONS, name: 'Manage Integrations', description: 'Manage third-party integrations', module: 'settings', action: 'manage-integrations' },

  // Notifications
  { code: PERMISSIONS.NOTIFICATIONS_VIEW, name: 'View Notifications', description: 'View notifications', module: 'notifications', action: 'view' },
  { code: PERMISSIONS.NOTIFICATIONS_MANAGE, name: 'Manage Notifications', description: 'Manage notification settings', module: 'notifications', action: 'manage' },

  // Audit
  { code: PERMISSIONS.AUDIT_VIEW, name: 'View Audit Logs', description: 'View audit logs', module: 'audit', action: 'view' },
  { code: PERMISSIONS.AUDIT_EXPORT, name: 'Export Audit Logs', description: 'Export audit data', module: 'audit', action: 'export' },

  // Support
  { code: PERMISSIONS.SUPPORT_VIEW, name: 'View Support Tickets', description: 'View support tickets and updates', module: 'support', action: 'view' },
  { code: PERMISSIONS.SUPPORT_CREATE, name: 'Create Support Tickets', description: 'Create support tickets', module: 'support', action: 'create' },
  { code: PERMISSIONS.SUPPORT_UPDATE, name: 'Update Support Tickets', description: 'Reply to or update support tickets', module: 'support', action: 'update' },
  { code: PERMISSIONS.SUPPORT_DELETE, name: 'Delete Support Tickets', description: 'Delete support tickets', module: 'support', action: 'delete' },

  // Roof Estimator
  { code: PERMISSIONS.ROOF_ESTIMATOR_VIEW, name: 'View Roof Estimates', description: 'View roof estimates and AI results', module: 'roof-estimator', action: 'view' },
  { code: PERMISSIONS.ROOF_ESTIMATOR_CREATE, name: 'Create Roof Estimates', description: 'Generate and save roof estimates', module: 'roof-estimator', action: 'create' },
  { code: PERMISSIONS.ROOF_ESTIMATOR_UPDATE, name: 'Update Roof Estimates', description: 'Edit saved roof estimates', module: 'roof-estimator', action: 'update' },
  { code: PERMISSIONS.ROOF_ESTIMATOR_DELETE, name: 'Delete Roof Estimates', description: 'Remove roof estimates', module: 'roof-estimator', action: 'delete' },
  { code: PERMISSIONS.ROOF_ESTIMATOR_SETTINGS, name: 'Manage Estimator Settings', description: 'Configure pricing and company info for estimates', module: 'roof-estimator', action: 'settings' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all permission codes for a specific module
 */
export function getModulePermissions(module: string): PermissionCode[] {
  return PERMISSION_DEFINITIONS
    .filter((p) => p.module === module)
    .map((p) => p.code);
}

/**
 * Get all unique module names
 */
export function getAllModules(): string[] {
  const modules = new Set(PERMISSION_DEFINITIONS.map((p) => p.module));
  return Array.from(modules);
}

/**
 * Check if a permission code is valid
 */
export function isValidPermission(code: string): code is PermissionCode {
  return Object.values(PERMISSIONS).includes(code as PermissionCode);
}

/**
 * Get permission definition by code
 */
export function getPermissionDefinition(code: PermissionCode): PermissionDefinition | undefined {
  return PERMISSION_DEFINITIONS.find((p) => p.code === code);
}
