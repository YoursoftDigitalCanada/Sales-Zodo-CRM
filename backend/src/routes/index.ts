import { Application, Router } from 'express';
import { config } from '../config';
import { authenticate, loadEmployee } from '../common/middleware/auth.middleware';
import { tenantContext } from '../common/middleware/tenant.middleware';
import { moduleGuard } from '../common/middleware/module.middleware';
import { stripTenantFromBody } from '../common/middleware/sanitize-body.middleware';

// Core module routes
import authRoutes from '../modules/auth/auth.routes';
import leadsRoutes from '../modules/leads/leads.routes';
import leadSourcesRoutes from '../modules/lead-sources/lead-sources.routes';
import tagsRoutes from '../modules/tags/tags.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';

// CRM modules
import clientsRoutes from '../modules/clients/clients.routes';
import contactsRoutes from '../modules/contacts/contacts.routes';
import groupsRoutes from '../modules/groups/groups.routes';

// User & Access modules
import usersRoutes from '../modules/users/users.routes';
import employeesRoutes from '../modules/employees/employees.routes';
import rolesRoutes from '../modules/roles/roles.routes';
import tenantsRoutes from '../modules/tenants/tenants.routes';

// Operations modules
import tasksRoutes from '../modules/tasks/tasks.routes';
import projectsRoutes from '../modules/projects/projects.routes';
import calendarRoutes from '../modules/calendar/calendar.routes';

// Finance modules
import invoicesRoutes from '../modules/invoices/invoices.routes';
import quotesRoutes from '../modules/quotes/quotes.routes';
import quotesPublicRoutes from '../modules/quotes/quotes.public-routes';
import expensesRoutes from '../modules/expenses/expenses.routes';
import bookingsRoutes from '../modules/bookings/bookings.routes';
import servicesRoutes from '../modules/services/services.routes';
import contractsRoutes from '../modules/contracts/contracts.routes';

// File management modules
import filesRoutes from '../modules/files/files.routes';
import foldersRoutes from '../modules/folders/folders.routes';

// Communication modules
import emailsRoutes from '../modules/emails/emails.routes';
import chatRoutes from '../modules/chat/chat.routes';

// System modules
import settingsRoutes from '../modules/settings/settings.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';

// Applications module
import applicationsRoutes from '../modules/applications/applications.routes';

// Permissions module
import permissionsRoutes from '../modules/permissions/permissions.routes';

// E-commerce modules
import ecommerceRoutes from '../modules/ecommerce/ecommerce.routes';

// AI modules
import roofEstimatorRoutes from '../modules/roof-estimator/roof-estimator.routes';
import copilotRoutes from '../modules/copilot/copilot.routes';

// Timeline module
import timelineRoutes from '../modules/timeline/timeline.routes';

/**
 * Register all API routes
 *
 * Route flow for protected endpoints:
 *   Request → Auth (JWT) → TenantContext → Module Controllers
 *
 * Auth/onboarding routes are exempt from tenant context.
 */
export function registerRoutes(app: Application): void {
  const apiRouter = Router();
  const apiPrefix = `/api/${config.app.apiVersion}`;

  // ── Global safety net: strip tenantId from ALL request bodies ──────
  apiRouter.use(stripTenantFromBody);

  // =========================================================================
  // PUBLIC ROUTES (No authentication or tenant context required)
  // =========================================================================

  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/public', quotesPublicRoutes);

  // =========================================================================
  // PROTECTED ROUTES
  // =========================================================================
  // Global middleware chain for ALL protected CRM modules:
  //   1. authenticate  → verifies JWT, attaches req.user (userId, tenantId, role)
  //   2. tenantContext  → validates tenantId, loads tenant from DB, blocks if missing
  //
  // Individual module routes still apply their own loadEmployee + permission
  // checks internally, so RBAC is not affected.
  // =========================================================================

  const protectedRouter = Router();
  protectedRouter.use(authenticate);
  protectedRouter.use(tenantContext);
  protectedRouter.use(moduleGuard);

  // CRM - Leads
  protectedRouter.use('/leads', leadsRoutes);
  protectedRouter.use('/lead-sources', leadSourcesRoutes);

  // CRM - Clients & Contacts
  protectedRouter.use('/clients', clientsRoutes);
  protectedRouter.use('/contacts', contactsRoutes);
  protectedRouter.use('/groups', groupsRoutes);

  // User & Employee Management
  protectedRouter.use('/users', usersRoutes);
  protectedRouter.use('/employees', employeesRoutes);
  protectedRouter.use('/roles', rolesRoutes);
  protectedRouter.use('/tenants', tenantsRoutes);

  // Projects & Tasks
  protectedRouter.use('/projects', projectsRoutes);
  protectedRouter.use('/tasks', tasksRoutes);
  protectedRouter.use('/calendar', calendarRoutes);

  // Finance
  protectedRouter.use('/invoices', invoicesRoutes);
  protectedRouter.use('/quotes', quotesRoutes);
  protectedRouter.use('/expenses', expensesRoutes);
  protectedRouter.use('/bookings', bookingsRoutes);
  protectedRouter.use('/services', servicesRoutes);
  protectedRouter.use('/contracts', contractsRoutes);

  // File Management
  protectedRouter.use('/files', filesRoutes);
  protectedRouter.use('/folders', foldersRoutes);

  // Communication
  protectedRouter.use('/emails', emailsRoutes);
  protectedRouter.use('/chat', chatRoutes);

  // System
  protectedRouter.use('/settings', settingsRoutes);
  protectedRouter.use('/analytics', analyticsRoutes);

  // Tags & Notifications (shared)
  protectedRouter.use('/tags', tagsRoutes);
  protectedRouter.use('/notifications', notificationsRoutes);

  // Applications
  protectedRouter.use('/applications', applicationsRoutes);

  // Permissions
  protectedRouter.use('/permissions', permissionsRoutes);

  // E-commerce
  protectedRouter.use('/ecommerce', ecommerceRoutes);

  // AI Modules
  protectedRouter.use('/roof-estimator', roofEstimatorRoutes);
  protectedRouter.use('/copilot', copilotRoutes);

  // Timeline
  protectedRouter.use('/timeline', timelineRoutes);

  // Mount protected router on the main API router
  apiRouter.use(protectedRouter);

  // =========================================================================
  // REGISTER API ROUTER
  // =========================================================================

  app.use(apiPrefix, apiRouter);

  // =========================================================================
  // API INFO ENDPOINT
  // =========================================================================

  app.get('/api', (req, res) => {
    res.json({
      success: true,
      message: 'SaaS CRM API',
      version: config.app.apiVersion,
      documentation: !config.app.isProduction ? '/api-docs' : undefined,
      endpoints: {
        health: '/health',
        api: apiPrefix,
        // Core
        auth: `${apiPrefix}/auth`,
        leads: `${apiPrefix}/leads`,
        leadSources: `${apiPrefix}/lead-sources`,
        // CRM
        clients: `${apiPrefix}/clients`,
        contacts: `${apiPrefix}/contacts`,
        groups: `${apiPrefix}/groups`,
        // Users & Access
        users: `${apiPrefix}/users`,
        employees: `${apiPrefix}/employees`,
        roles: `${apiPrefix}/roles`,
        tenants: `${apiPrefix}/tenants`,
        // Operations
        projects: `${apiPrefix}/projects`,
        tasks: `${apiPrefix}/tasks`,
        calendar: `${apiPrefix}/calendar`,
        // Finance
        invoices: `${apiPrefix}/invoices`,
        expenses: `${apiPrefix}/expenses`,
        bookings: `${apiPrefix}/bookings`,
        services: `${apiPrefix}/services`,
        // Files
        files: `${apiPrefix}/files`,
        folders: `${apiPrefix}/folders`,
        // Communication
        emails: `${apiPrefix}/emails`,
        chat: `${apiPrefix}/chat`,
        // System
        settings: `${apiPrefix}/settings`,
        analytics: `${apiPrefix}/analytics`,
        tags: `${apiPrefix}/tags`,
        notifications: `${apiPrefix}/notifications`,
        // Applications
        applications: `${apiPrefix}/applications`,
        // Permissions
        permissions: `${apiPrefix}/permissions`,
        // E-commerce
        ecommerce: `${apiPrefix}/ecommerce`,
        // AI Modules
        roofEstimator: `${apiPrefix}/roof-estimator`,
        copilot: `${apiPrefix}/copilot`,
        contracts: `${apiPrefix}/contracts`,
      },
    });
  });
}