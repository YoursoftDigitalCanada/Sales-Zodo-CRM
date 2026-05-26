import { PERMISSIONS } from './permissions';

/**
 * Sidebar module definitions
 * Used to determine which modules to show in the sidebar based on permissions
 */

export interface SidebarModule {
  id: string;
  name: string;
  icon: string;
  path: string;
  requiredPermissions: string[]; // ANY of these permissions grants access
  children?: SidebarModule[];
  badge?: string;
  order: number;
}

export const SIDEBAR_MODULES: SidebarModule[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: 'dashboard',
    path: '/dashboard',
    requiredPermissions: [PERMISSIONS.DASHBOARD_VIEW],
    order: 0,
  },
  {
    id: 'leads',
    name: 'Leads',
    icon: 'users',
    path: '/leads',
    requiredPermissions: [PERMISSIONS.LEADS_VIEW],
    order: 10,
    children: [
      {
        id: 'leads-list',
        name: 'All Leads',
        icon: 'list',
        path: '/leads',
        requiredPermissions: [PERMISSIONS.LEADS_VIEW],
        order: 0,
      },
      {
        id: 'leads-pipeline',
        name: 'Pipeline',
        icon: 'kanban',
        path: '/leads/pipeline',
        requiredPermissions: [PERMISSIONS.LEADS_VIEW],
        order: 1,
      },
      {
        id: 'leads-sources',
        name: 'Lead Sources',
        icon: 'source',
        path: '/leads/sources',
        requiredPermissions: [PERMISSIONS.LEAD_SOURCES_VIEW],
        order: 2,
      },
    ],
  },
  {
    id: 'clients',
    name: 'Clients',
    icon: 'briefcase',
    path: '/clients',
    requiredPermissions: [PERMISSIONS.CLIENTS_VIEW],
    order: 20,
    children: [
      {
        id: 'clients-list',
        name: 'All Clients',
        icon: 'list',
        path: '/clients',
        requiredPermissions: [PERMISSIONS.CLIENTS_VIEW],
        order: 0,
      },
      {
        id: 'contacts',
        name: 'Contacts',
        icon: 'contact',
        path: '/clients/contacts',
        requiredPermissions: [PERMISSIONS.CONTACTS_VIEW],
        order: 1,
      },
      {
        id: 'groups',
        name: 'Groups',
        icon: 'group',
        path: '/clients/groups',
        requiredPermissions: [PERMISSIONS.GROUPS_VIEW],
        order: 2,
      },
    ],
  },
  {
    id: 'applications',
    name: 'Applications',
    icon: 'file-text',
    path: '/applications',
    requiredPermissions: [PERMISSIONS.APPLICATIONS_VIEW],
    order: 30,
  },
  {
    id: 'tasks',
    name: 'Tasks',
    icon: 'check-square',
    path: '/tasks',
    requiredPermissions: [PERMISSIONS.TASKS_VIEW],
    order: 40,
    children: [
      {
        id: 'tasks-list',
        name: 'All Tasks',
        icon: 'list',
        path: '/tasks',
        requiredPermissions: [PERMISSIONS.TASKS_VIEW],
        order: 0,
      },
      {
        id: 'tasks-kanban',
        name: 'Kanban Board',
        icon: 'kanban',
        path: '/tasks/kanban',
        requiredPermissions: [PERMISSIONS.TASKS_VIEW],
        order: 1,
      },
    ],
  },
  {
    id: 'projects',
    name: 'Deals',
    icon: 'folder',
    path: '/deals',
    requiredPermissions: [PERMISSIONS.PROJECTS_VIEW],
    order: 50,
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: 'calendar',
    path: '/calendar',
    requiredPermissions: [PERMISSIONS.CALENDAR_VIEW],
    order: 60,
  },
  {
    id: 'files',
    name: 'File Manager',
    icon: 'hard-drive',
    path: '/files',
    requiredPermissions: [PERMISSIONS.FILES_VIEW],
    order: 70,
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: 'dollar-sign',
    path: '/finance',
    requiredPermissions: [PERMISSIONS.INVOICES_VIEW],
    order: 80,
    children: [
      {
        id: 'invoices',
        name: 'Invoices',
        icon: 'file-invoice',
        path: '/finance/invoices',
        requiredPermissions: [PERMISSIONS.INVOICES_VIEW],
        order: 0,
      },
      {
        id: 'contracts',
        name: 'Contracts',
        icon: 'file-signature',
        path: '/finance/contracts',
        requiredPermissions: [PERMISSIONS.CONTRACTS_VIEW],
        order: 1,
      },
    ],
  },
  {
    id: 'bookings',
    name: 'Bookings',
    icon: 'clock',
    path: '/bookings',
    requiredPermissions: [PERMISSIONS.BOOKINGS_VIEW],
    order: 90,
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    icon: 'shopping-cart',
    path: '/ecommerce',
    requiredPermissions: [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.ORDERS_VIEW],
    order: 100,
    children: [
      {
        id: 'ecommerce-dashboard',
        name: 'Dashboard',
        icon: 'dashboard',
        path: '/ecommerce',
        requiredPermissions: [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.ORDERS_VIEW],
        order: 0,
      },
      {
        id: 'products',
        name: 'Products',
        icon: 'box',
        path: '/ecommerce/products',
        requiredPermissions: [PERMISSIONS.PRODUCTS_VIEW],
        order: 1,
      },
      {
        id: 'categories',
        name: 'Categories',
        icon: 'tag',
        path: '/ecommerce/categories',
        requiredPermissions: [PERMISSIONS.CATEGORIES_VIEW],
        order: 2,
      },
      {
        id: 'orders',
        name: 'Orders',
        icon: 'shopping-bag',
        path: '/ecommerce/orders',
        requiredPermissions: [PERMISSIONS.ORDERS_VIEW],
        order: 3,
      },
    ],
  },
  {
    id: 'communication',
    name: 'Communication',
    icon: 'message-circle',
    path: '/communication',
    requiredPermissions: [PERMISSIONS.EMAILS_VIEW, PERMISSIONS.CHAT_VIEW],
    order: 110,
    children: [
      {
        id: 'emails',
        name: 'Zodo Mail',
        icon: 'mail',
        path: '/communication/emails',
        requiredPermissions: [PERMISSIONS.EMAILS_VIEW],
        order: 0,
      },
      {
        id: 'chat',
        name: 'Chat',
        icon: 'message-square',
        path: '/communication/chat',
        requiredPermissions: [PERMISSIONS.CHAT_VIEW],
        order: 1,
      },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics',
    icon: 'bar-chart-2',
    path: '/analytics',
    requiredPermissions: [PERMISSIONS.ANALYTICS_VIEW],
    order: 120,
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: 'settings',
    path: '/settings',
    requiredPermissions: [PERMISSIONS.SETTINGS_VIEW],
    order: 130,
    children: [
      {
        id: 'settings-general',
        name: 'General',
        icon: 'sliders',
        path: '/settings/general',
        requiredPermissions: [PERMISSIONS.SETTINGS_VIEW],
        order: 0,
      },
      {
        id: 'settings-users',
        name: 'Users & Roles',
        icon: 'users',
        path: '/settings/users',
        requiredPermissions: [PERMISSIONS.USERS_VIEW, PERMISSIONS.ROLES_VIEW],
        order: 1,
      },
      {
        id: 'settings-integrations',
        name: 'Integrations',
        icon: 'plug',
        path: '/settings/integrations',
        requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE_INTEGRATIONS],
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
export function getModulesForPermissions(permissions: string[]): string[] {
  const accessibleModules: string[] = [];

  function checkModule(module: SidebarModule): boolean {
    // Check if user has any of the required permissions
    const hasAccess = module.requiredPermissions.some((p) =>
      permissions.includes(p)
    );

    if (hasAccess) {
      accessibleModules.push(module.id);
    }

    // Check children
    if (module.children) {
      module.children.forEach((child) => checkModule(child));
    }

    return hasAccess;
  }

  SIDEBAR_MODULES.forEach((module) => checkModule(module));

  return accessibleModules;
}

/**
 * Get full sidebar structure for given permissions
 * Returns hierarchical structure with only accessible modules
 */
export function getSidebarForPermissions(permissions: string[]): SidebarModule[] {
  function filterModule(module: SidebarModule): SidebarModule | null {
    // Check if user has any of the required permissions
    const hasAccess = module.requiredPermissions.some((p) =>
      permissions.includes(p)
    );

    if (!hasAccess) {
      return null;
    }

    // Filter children
    let filteredChildren: SidebarModule[] | undefined;

    if (module.children) {
      filteredChildren = module.children
        .map((child) => filterModule(child))
        .filter((child): child is SidebarModule => child !== null);

      if (filteredChildren.length === 0) {
        filteredChildren = undefined;
      }
    }

    return {
      ...module,
      children: filteredChildren,
    };
  }

  return SIDEBAR_MODULES
    .map((module) => filterModule(module))
    .filter((module): module is SidebarModule => module !== null)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get module by ID
 */
export function getModuleById(id: string): SidebarModule | undefined {
  function findModule(modules: SidebarModule[]): SidebarModule | undefined {
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

  return findModule(SIDEBAR_MODULES);
}

/**
 * Get parent module for a child module
 */
export function getParentModule(childId: string): SidebarModule | undefined {
  for (const module of SIDEBAR_MODULES) {
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
export function getModuleBreadcrumb(moduleId: string): SidebarModule[] {
  const breadcrumb: SidebarModule[] = [];

  function findPath(modules: SidebarModule[], path: SidebarModule[]): boolean {
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

  findPath(SIDEBAR_MODULES, []);
  return breadcrumb;
}

/**
 * Get all module IDs (flat list)
 */
export function getAllModuleIds(): string[] {
  const ids: string[] = [];

  function collectIds(modules: SidebarModule[]): void {
    for (const module of modules) {
      ids.push(module.id);
      if (module.children) {
        collectIds(module.children);
      }
    }
  }

  collectIds(SIDEBAR_MODULES);
  return ids;
}

/**
 * Check if a module exists
 */
export function moduleExists(moduleId: string): boolean {
  return getModuleById(moduleId) !== undefined;
}

/**
 * Get all top-level modules
 */
export function getTopLevelModules(): SidebarModule[] {
  return SIDEBAR_MODULES.sort((a, b) => a.order - b.order);
}

/**
 * Get required permissions for accessing a module
 */
export function getModulePermissions(moduleId: string): string[] {
  const module = getModuleById(moduleId);
  return module?.requiredPermissions || [];
}

/**
 * Check if user can access a specific module
 */
export function canAccessModule(moduleId: string, permissions: string[]): boolean {
  const modulePerms = getModulePermissions(moduleId);
  return modulePerms.some((p) => permissions.includes(p));
}
