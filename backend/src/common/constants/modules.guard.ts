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
    'tenants',
    'settings',
    'notifications',
    'tags',
] as const;

/**
 * Optional modules that tenants can enable/disable.
 * Maps route prefix (without leading /) to the module slug.
 */
export const ROUTE_MODULE_MAP: Record<string, readonly string[]> = {
    // CRM
    'leads': ['leads'],
    'lead-sources': ['leads'],        // sub-feature of leads
    'pipeline': ['leads'],
    'clients': ['clients'],
    'contacts': ['clients'],      // sub-feature of clients
    'groups': ['clients'],      // sub-feature of clients

    // Operations
    'projects': ['projects'],
    'tasks': ['tasks'],
    'calendar': ['calendar'],
    'timeline': ['tasks'],

    // Finance
    'invoices': ['finance', 'invoices'],
    'billing': ['finance', 'invoices', 'payments', 'subscriptions'],
    'quotes': ['finance', 'quotes', 'proposals'],
    'contracts': ['finance'],
    'proposals': ['finance', 'quotes', 'proposals'],
    'services': ['finance'],
    'expenses': ['finance'],
    'bookkeeping': ['finance'],
    'bookings': ['finance'],

    // File Management
    'files': ['files'],
    'folders': ['files'],        // sub-feature of files
    'documents': ['files'],

    // Communication
    'emails': ['letterbox', 'communication'],
    'chat': ['chat', 'communication'],
    'support-tickets': ['support'],
    'tickets': ['support'],

    // Team
    'users': ['team'],
    'employees': ['team'],
    'roles': ['team'],
    'permissions': ['team'],
    'crew': ['team'],

    // Analytics
    'analytics': ['analytics'],
    'automation': ['automation'],

    // Applications
    'applications': ['projects'],

    // E-commerce
    'ecommerce': ['finance'],

    // AI
    'roof-estimator': ['roof-estimator'],
    'construction-estimator': ['roof-estimator'],
    'copilot': ['ai-assistant'],
    'eagleview': ['roof-estimator'],
    'roofing-automation': ['roofing-automation'],
};

/**
 * All optional module slugs (unique values from ROUTE_MODULE_MAP).
 */
export const ALL_OPTIONAL_MODULES = [
    ...new Set(Object.values(ROUTE_MODULE_MAP).flat()),
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
    'files',
    'letterbox',
    'chat',
    'support',
    'analytics',
    'automation',
    'team',
    'roof-estimator',
    'ai-assistant',
];
