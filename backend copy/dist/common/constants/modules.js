"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIDEBAR_MODULES = void 0;
exports.getModulesForPermissions = getModulesForPermissions;
exports.getSidebarForPermissions = getSidebarForPermissions;
exports.getModuleById = getModuleById;
exports.getParentModule = getParentModule;
exports.getModuleBreadcrumb = getModuleBreadcrumb;
exports.getAllModuleIds = getAllModuleIds;
exports.moduleExists = moduleExists;
exports.getTopLevelModules = getTopLevelModules;
exports.getModulePermissions = getModulePermissions;
exports.canAccessModule = canAccessModule;
const permissions_1 = require("./permissions");
exports.SIDEBAR_MODULES = [
    {
        id: 'dashboard',
        name: 'Dashboard',
        icon: 'dashboard',
        path: '/dashboard',
        requiredPermissions: [permissions_1.PERMISSIONS.DASHBOARD_VIEW],
        order: 0,
    },
    {
        id: 'leads',
        name: 'Leads',
        icon: 'users',
        path: '/leads',
        requiredPermissions: [permissions_1.PERMISSIONS.LEADS_VIEW],
        order: 10,
        children: [
            {
                id: 'leads-list',
                name: 'All Leads',
                icon: 'list',
                path: '/leads',
                requiredPermissions: [permissions_1.PERMISSIONS.LEADS_VIEW],
                order: 0,
            },
            {
                id: 'leads-pipeline',
                name: 'Pipeline',
                icon: 'kanban',
                path: '/leads/pipeline',
                requiredPermissions: [permissions_1.PERMISSIONS.LEADS_VIEW],
                order: 1,
            },
            {
                id: 'leads-sources',
                name: 'Lead Sources',
                icon: 'source',
                path: '/leads/sources',
                requiredPermissions: [permissions_1.PERMISSIONS.LEAD_SOURCES_VIEW],
                order: 2,
            },
        ],
    },
    {
        id: 'clients',
        name: 'Clients',
        icon: 'briefcase',
        path: '/clients',
        requiredPermissions: [permissions_1.PERMISSIONS.CLIENTS_VIEW],
        order: 20,
        children: [
            {
                id: 'clients-list',
                name: 'All Clients',
                icon: 'list',
                path: '/clients',
                requiredPermissions: [permissions_1.PERMISSIONS.CLIENTS_VIEW],
                order: 0,
            },
            {
                id: 'contacts',
                name: 'Contacts',
                icon: 'contact',
                path: '/clients/contacts',
                requiredPermissions: [permissions_1.PERMISSIONS.CONTACTS_VIEW],
                order: 1,
            },
            {
                id: 'groups',
                name: 'Groups',
                icon: 'group',
                path: '/clients/groups',
                requiredPermissions: [permissions_1.PERMISSIONS.GROUPS_VIEW],
                order: 2,
            },
        ],
    },
    {
        id: 'applications',
        name: 'Applications',
        icon: 'file-text',
        path: '/applications',
        requiredPermissions: [permissions_1.PERMISSIONS.APPLICATIONS_VIEW],
        order: 30,
    },
    {
        id: 'tasks',
        name: 'Tasks',
        icon: 'check-square',
        path: '/tasks',
        requiredPermissions: [permissions_1.PERMISSIONS.TASKS_VIEW],
        order: 40,
        children: [
            {
                id: 'tasks-list',
                name: 'All Tasks',
                icon: 'list',
                path: '/tasks',
                requiredPermissions: [permissions_1.PERMISSIONS.TASKS_VIEW],
                order: 0,
            },
            {
                id: 'tasks-kanban',
                name: 'Kanban Board',
                icon: 'kanban',
                path: '/tasks/kanban',
                requiredPermissions: [permissions_1.PERMISSIONS.TASKS_VIEW],
                order: 1,
            },
        ],
    },
    {
        id: 'projects',
        name: 'Projects',
        icon: 'folder',
        path: '/projects',
        requiredPermissions: [permissions_1.PERMISSIONS.PROJECTS_VIEW],
        order: 50,
    },
    {
        id: 'calendar',
        name: 'Calendar',
        icon: 'calendar',
        path: '/calendar',
        requiredPermissions: [permissions_1.PERMISSIONS.CALENDAR_VIEW],
        order: 60,
    },
    {
        id: 'files',
        name: 'File Manager',
        icon: 'hard-drive',
        path: '/files',
        requiredPermissions: [permissions_1.PERMISSIONS.FILES_VIEW],
        order: 70,
    },
    {
        id: 'finance',
        name: 'Finance',
        icon: 'dollar-sign',
        path: '/finance',
        requiredPermissions: [permissions_1.PERMISSIONS.INVOICES_VIEW, permissions_1.PERMISSIONS.EXPENSES_VIEW],
        order: 80,
        children: [
            {
                id: 'invoices',
                name: 'Invoices',
                icon: 'file-invoice',
                path: '/finance/invoices',
                requiredPermissions: [permissions_1.PERMISSIONS.INVOICES_VIEW],
                order: 0,
            },
            {
                id: 'expenses',
                name: 'Expenses',
                icon: 'receipt',
                path: '/finance/expenses',
                requiredPermissions: [permissions_1.PERMISSIONS.EXPENSES_VIEW],
                order: 1,
            },
        ],
    },
    {
        id: 'bookings',
        name: 'Bookings',
        icon: 'clock',
        path: '/bookings',
        requiredPermissions: [permissions_1.PERMISSIONS.BOOKINGS_VIEW],
        order: 90,
    },
    {
        id: 'ecommerce',
        name: 'E-Commerce',
        icon: 'shopping-cart',
        path: '/ecommerce',
        requiredPermissions: [permissions_1.PERMISSIONS.PRODUCTS_VIEW, permissions_1.PERMISSIONS.ORDERS_VIEW],
        order: 100,
        children: [
            {
                id: 'ecommerce-dashboard',
                name: 'Dashboard',
                icon: 'dashboard',
                path: '/ecommerce',
                requiredPermissions: [permissions_1.PERMISSIONS.PRODUCTS_VIEW, permissions_1.PERMISSIONS.ORDERS_VIEW],
                order: 0,
            },
            {
                id: 'products',
                name: 'Products',
                icon: 'box',
                path: '/ecommerce/products',
                requiredPermissions: [permissions_1.PERMISSIONS.PRODUCTS_VIEW],
                order: 1,
            },
            {
                id: 'categories',
                name: 'Categories',
                icon: 'tag',
                path: '/ecommerce/categories',
                requiredPermissions: [permissions_1.PERMISSIONS.CATEGORIES_VIEW],
                order: 2,
            },
            {
                id: 'orders',
                name: 'Orders',
                icon: 'shopping-bag',
                path: '/ecommerce/orders',
                requiredPermissions: [permissions_1.PERMISSIONS.ORDERS_VIEW],
                order: 3,
            },
        ],
    },
    {
        id: 'communication',
        name: 'Communication',
        icon: 'message-circle',
        path: '/communication',
        requiredPermissions: [permissions_1.PERMISSIONS.EMAILS_VIEW, permissions_1.PERMISSIONS.CHAT_VIEW],
        order: 110,
        children: [
            {
                id: 'emails',
                name: 'Letter Box',
                icon: 'mail',
                path: '/communication/emails',
                requiredPermissions: [permissions_1.PERMISSIONS.EMAILS_VIEW],
                order: 0,
            },
            {
                id: 'chat',
                name: 'Chat',
                icon: 'message-square',
                path: '/communication/chat',
                requiredPermissions: [permissions_1.PERMISSIONS.CHAT_VIEW],
                order: 1,
            },
        ],
    },
    {
        id: 'analytics',
        name: 'Analytics',
        icon: 'bar-chart-2',
        path: '/analytics',
        requiredPermissions: [permissions_1.PERMISSIONS.ANALYTICS_VIEW],
        order: 120,
    },
    {
        id: 'settings',
        name: 'Settings',
        icon: 'settings',
        path: '/settings',
        requiredPermissions: [permissions_1.PERMISSIONS.SETTINGS_VIEW],
        order: 130,
        children: [
            {
                id: 'settings-general',
                name: 'General',
                icon: 'sliders',
                path: '/settings/general',
                requiredPermissions: [permissions_1.PERMISSIONS.SETTINGS_VIEW],
                order: 0,
            },
            {
                id: 'settings-users',
                name: 'Users & Roles',
                icon: 'users',
                path: '/settings/users',
                requiredPermissions: [permissions_1.PERMISSIONS.USERS_VIEW, permissions_1.PERMISSIONS.ROLES_VIEW],
                order: 1,
            },
            {
                id: 'settings-integrations',
                name: 'Integrations',
                icon: 'plug',
                path: '/settings/integrations',
                requiredPermissions: [permissions_1.PERMISSIONS.SETTINGS_MANAGE_INTEGRATIONS],
                order: 2,
            },
        ],
    },
];
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Get modules accessible by given permissions
 * Returns flat list of module IDs
 */
function getModulesForPermissions(permissions) {
    const accessibleModules = [];
    function checkModule(module) {
        // Check if user has any of the required permissions
        const hasAccess = module.requiredPermissions.some((p) => permissions.includes(p));
        if (hasAccess) {
            accessibleModules.push(module.id);
        }
        // Check children
        if (module.children) {
            module.children.forEach((child) => checkModule(child));
        }
        return hasAccess;
    }
    exports.SIDEBAR_MODULES.forEach((module) => checkModule(module));
    return accessibleModules;
}
/**
 * Get full sidebar structure for given permissions
 * Returns hierarchical structure with only accessible modules
 */
function getSidebarForPermissions(permissions) {
    function filterModule(module) {
        // Check if user has any of the required permissions
        const hasAccess = module.requiredPermissions.some((p) => permissions.includes(p));
        if (!hasAccess) {
            return null;
        }
        // Filter children
        let filteredChildren;
        if (module.children) {
            filteredChildren = module.children
                .map((child) => filterModule(child))
                .filter((child) => child !== null);
            if (filteredChildren.length === 0) {
                filteredChildren = undefined;
            }
        }
        return {
            ...module,
            children: filteredChildren,
        };
    }
    return exports.SIDEBAR_MODULES
        .map((module) => filterModule(module))
        .filter((module) => module !== null)
        .sort((a, b) => a.order - b.order);
}
/**
 * Get module by ID
 */
function getModuleById(id) {
    function findModule(modules) {
        for (const module of modules) {
            if (module.id === id) {
                return module;
            }
            if (module.children) {
                const found = findModule(module.children);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }
    return findModule(exports.SIDEBAR_MODULES);
}
/**
 * Get parent module for a child module
 */
function getParentModule(childId) {
    for (const module of exports.SIDEBAR_MODULES) {
        if (module.children) {
            const found = module.children.find((child) => child.id === childId);
            if (found) {
                return module;
            }
        }
    }
    return undefined;
}
/**
 * Get breadcrumb path for a module
 */
function getModuleBreadcrumb(moduleId) {
    const breadcrumb = [];
    function findPath(modules, path) {
        for (const module of modules) {
            const currentPath = [...path, module];
            if (module.id === moduleId) {
                breadcrumb.push(...currentPath);
                return true;
            }
            if (module.children) {
                if (findPath(module.children, currentPath)) {
                    return true;
                }
            }
        }
        return false;
    }
    findPath(exports.SIDEBAR_MODULES, []);
    return breadcrumb;
}
/**
 * Get all module IDs (flat list)
 */
function getAllModuleIds() {
    const ids = [];
    function collectIds(modules) {
        for (const module of modules) {
            ids.push(module.id);
            if (module.children) {
                collectIds(module.children);
            }
        }
    }
    collectIds(exports.SIDEBAR_MODULES);
    return ids;
}
/**
 * Check if a module exists
 */
function moduleExists(moduleId) {
    return getModuleById(moduleId) !== undefined;
}
/**
 * Get all top-level modules
 */
function getTopLevelModules() {
    return exports.SIDEBAR_MODULES.sort((a, b) => a.order - b.order);
}
/**
 * Get required permissions for accessing a module
 */
function getModulePermissions(moduleId) {
    const module = getModuleById(moduleId);
    return module?.requiredPermissions || [];
}
/**
 * Check if user can access a specific module
 */
function canAccessModule(moduleId, permissions) {
    const modulePerms = getModulePermissions(moduleId);
    return modulePerms.some((p) => permissions.includes(p));
}
//# sourceMappingURL=modules.js.map