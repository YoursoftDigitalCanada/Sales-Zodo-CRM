// src/common/constants/modules.guard.ts
// ============================================================================
// TENANT MODULE CONFIGURATION — Route → Module Mapping
//
// Maps API route prefixes to logical CRM modules. The moduleGuard middleware
// uses this to check if a module is enabled for the tenant before allowing
// access. Core modules (always enabled) are NOT listed here.
// ============================================================================

/**
 * Modules that are ALWAYS enabled for every tenant — cannot be disabled.
 * These are foundational to CRM operation.
 */
export const CORE_MODULES = [
    'dashboard',
    'auth',
    'users',
    'employees',
    'roles',
    'tenants',
    'permissions',
    'settings',
    'notifications',
    'tags',
] as const;

/**
 * Optional modules that tenants can enable/disable.
 * Maps route prefix (without leading /) to the module slug.
 */
export const ROUTE_MODULE_MAP: Record<string, string> = {
    // CRM
    'leads': 'leads',
    'lead-sources': 'leads',        // sub-feature of leads
    'clients': 'clients',
    'contacts': 'clients',      // sub-feature of clients
    'groups': 'clients',      // sub-feature of clients

    // Operations
    'projects': 'projects',
    'tasks': 'tasks',
    'calendar': 'calendar',

    // Finance
    'invoices': 'finance',
    'expenses': 'finance',
    'bookings': 'bookings',

    // File Management
    'files': 'files',
    'folders': 'files',        // sub-feature of files

    // Communication
    'emails': 'communication',
    'chat': 'communication',

    // Analytics
    'analytics': 'analytics',

    // Applications
    'applications': 'applications',

    // E-commerce
    'ecommerce': 'ecommerce',

    // AI
    'roof-estimator': 'roof-estimator',
};

/**
 * All optional module slugs (unique values from ROUTE_MODULE_MAP).
 */
export const ALL_OPTIONAL_MODULES = [
    ...new Set(Object.values(ROUTE_MODULE_MAP)),
] as const;

/**
 * Default enabled modules for new tenants.
 * Includes all modules — tenants can disable them later.
 */
export const DEFAULT_ENABLED_MODULES: string[] = [
    'leads',
    'clients',
    'projects',
    'tasks',
    'calendar',
    'finance',
    'bookings',
    'files',
    'communication',
    'analytics',
    'applications',
    'ecommerce',
    'roof-estimator',
];
