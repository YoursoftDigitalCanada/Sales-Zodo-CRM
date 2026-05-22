import { Application, Router } from 'express';
import { config } from '../config';
import { authenticate, loadEmployee } from '../common/middleware/auth.middleware';
import { tenantContext } from '../common/middleware/tenant.middleware';
import { moduleGuard } from '../common/middleware/module.middleware';
import { stripTenantFromBody } from '../common/middleware/sanitize-body.middleware';
import { requestContextStore } from '../common/services/request-context.store';

// Core module routes
import authRoutes from '../modules/auth/auth.routes';
import leadsRoutes from '../modules/leads/leads.routes';
import leadSourcesRoutes from '../modules/lead-sources/lead-sources.routes';
import leadSourceWebhooksRoutes from '../modules/lead-sources/lead-source-webhooks.routes';
import inspectionsRoutes from '../modules/inspections/inspections.routes';
import tagsRoutes from '../modules/tags/tags.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';

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
import pipelineRoutes from '../modules/pipeline/pipeline.routes';

// Finance modules
import invoicesRoutes from '../modules/invoices/invoices.routes';
import billingRoutes from '../modules/billing/billing.routes';
import quotesRoutes from '../modules/quotes/quotes.routes';
import quotesPublicRoutes from '../modules/quotes/quotes.public-routes';
import expensesRoutes from '../modules/expenses/expenses.routes';
import bookkeepingRoutes from '../modules/bookkeeping/bookkeeping.routes';
// DRAFT — re-enable next year
// import bookingsRoutes from '../modules/bookings/bookings.routes';
import servicesRoutes from '../modules/services/services.routes';
import contractsRoutes from '../modules/contracts/contracts.routes';

// Proposals module
import proposalsRoutes from '../modules/proposals/proposals.routes';
import proposalsPublicRoutes from '../modules/proposals/proposals.public-routes';

// File management modules
import filesRoutes from '../modules/files/files.routes';
import { filesController } from '../modules/files/files.controller';
import foldersRoutes from '../modules/folders/folders.routes';
import documentsRoutes from '../modules/documents/documents.routes';

// Communication modules
import emailsRoutes from '../modules/emails/emails.routes';
import engagementRoutes from '../modules/engagement/engagement.routes';
import chatRoutes from '../modules/chat/chat.routes';

// System modules
import settingsRoutes from '../modules/settings/settings.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import websiteAnalyticsRoutes, { websiteAnalyticsPublicRoutes } from '../modules/website-analytics/website-analytics.routes';
import auditRoutes from '../modules/audit/audit.routes';
import sessionsRoutes from '../modules/sessions/sessions.routes';
import reportsRoutes from '../modules/reports/reports.routes';

// Applications module
import applicationsRoutes from '../modules/applications/applications.routes';

// Permissions module
import permissionsRoutes from '../modules/permissions/permissions.routes';

// DRAFT — re-enable next year
// import ecommerceRoutes from '../modules/ecommerce/ecommerce.routes';

// AI modules
import roofEstimatorRoutes from '../modules/roof-estimator/roof-estimator.routes';
import copilotRoutes from '../modules/copilot/copilot.routes';
import salesAIRoutes from '../modules/sales-ai/sales-ai.routes';
import eagleViewRoutes from '../modules/eagleview/eagleview.routes';
import { eagleViewWebhookRouter } from '../modules/eagleview/eagleview.routes';
import constructionEstimatorRoutes from '../modules/construction-estimator/construction-estimator.routes';

// Wallet module
import walletRoutes from '../modules/wallet/wallet.routes';

// Timeline module
import timelineRoutes from '../modules/timeline/timeline.routes';

// Super Admin module
import adminRoutes from '../modules/super-admin/admin.routes';
import { adminAuthService } from '../modules/super-admin/admin-auth.service';

// Crew Portal module
import crewRoutes from '../modules/crew/crew.routes';

// Support Tickets module
import supportTicketsRoutes from '../modules/support-tickets/support-tickets.routes';

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
  apiRouter.use('/public', (req, _res, next) => requestContextStore.run(req, next));
  apiRouter.use('/public', quotesPublicRoutes);
  apiRouter.use('/public', proposalsPublicRoutes);
  apiRouter.use('/public/website-analytics', websiteAnalyticsPublicRoutes);
  apiRouter.get('/public/files/:shareLink/download', filesController.downloadByShareLink.bind(filesController));
  apiRouter.use('/webhooks/leads', leadSourceWebhooksRoutes);
  apiRouter.use('/webhooks', eagleViewWebhookRouter);

  // =========================================================================
  // SUPER ADMIN ROUTES (separate auth — NOT behind CRM middleware)
  // Must be registered BEFORE the CRM protected router.
  // =========================================================================

  apiRouter.use('/admin', adminRoutes);

  // Seed super admin on startup (no-op if already exists)
  adminAuthService.seedSuperAdmin().catch(() => { });

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
  protectedRouter.use((req, _res, next) => requestContextStore.run(req, next));
  protectedRouter.use(moduleGuard);

  // CRM - Leads
  protectedRouter.use('/dashboard', dashboardRoutes);
  protectedRouter.use('/leads', leadsRoutes);
  protectedRouter.use('/inspections', inspectionsRoutes);
  protectedRouter.use('/lead-sources', leadSourcesRoutes);

  // CRM - Clients & Contacts
  protectedRouter.use('/clients', clientsRoutes);
  protectedRouter.use('/organizations', clientsRoutes);
  protectedRouter.use('/contacts', contactsRoutes);
  protectedRouter.use('/groups', groupsRoutes);

  // User & Employee Management
  protectedRouter.use('/users', usersRoutes);
  protectedRouter.use('/employees', employeesRoutes);
  protectedRouter.use('/roles', rolesRoutes);
  protectedRouter.use('/tenants', tenantsRoutes);

  // Projects & Tasks
  protectedRouter.use('/projects', projectsRoutes);
  protectedRouter.use('/pipeline', pipelineRoutes);
  protectedRouter.use('/tasks', tasksRoutes);
  protectedRouter.use('/calendar', calendarRoutes);

  // Finance
  protectedRouter.use('/invoices', invoicesRoutes);
  protectedRouter.use('/billing', billingRoutes);
  protectedRouter.use('/quotes', quotesRoutes);
  protectedRouter.use('/expenses', expensesRoutes);
  protectedRouter.use('/bookkeeping', bookkeepingRoutes);
  // DRAFT — re-enable next year
  // protectedRouter.use('/bookings', bookingsRoutes);
  protectedRouter.use('/services', servicesRoutes);
  protectedRouter.use('/contracts', contractsRoutes);
  protectedRouter.use('/proposals', proposalsRoutes);

  // File Management
  protectedRouter.use('/files', filesRoutes);
  protectedRouter.use('/folders', foldersRoutes);
  protectedRouter.use('/documents', documentsRoutes);

  // Communication
  protectedRouter.use('/emails', emailsRoutes);
  protectedRouter.use('/engagement', engagementRoutes);
  protectedRouter.use('/chat', chatRoutes);

  // System
  protectedRouter.use('/settings', settingsRoutes);
  protectedRouter.use('/analytics', analyticsRoutes);
  protectedRouter.use('/website-analytics', websiteAnalyticsRoutes);
  protectedRouter.use('/audit-logs', auditRoutes);
  protectedRouter.use('/sessions', sessionsRoutes);
  protectedRouter.use('/reports', reportsRoutes);

  // Tags & Notifications (shared)
  protectedRouter.use('/tags', tagsRoutes);
  protectedRouter.use('/notifications', notificationsRoutes);

  // Applications
  protectedRouter.use('/applications', applicationsRoutes);

  // Permissions
  protectedRouter.use('/permissions', permissionsRoutes);

  // DRAFT — re-enable next year
  // protectedRouter.use('/ecommerce', ecommerceRoutes);

  // AI Modules
  protectedRouter.use('/roof-estimator', roofEstimatorRoutes);
  protectedRouter.use('/copilot', copilotRoutes);
  protectedRouter.use('/ai', salesAIRoutes);
  protectedRouter.use('/eagleview', eagleViewRoutes);
  protectedRouter.use('/construction-estimator', constructionEstimatorRoutes);

  // Wallet
  protectedRouter.use('/wallet', walletRoutes);

  // Timeline
  protectedRouter.use('/timeline', timelineRoutes);

  // Crew Portal
  protectedRouter.use('/crew', crewRoutes);

  // Support Tickets
  protectedRouter.use('/support-tickets', supportTicketsRoutes);
  protectedRouter.use('/tickets', supportTicketsRoutes);

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
        inspections: `${apiPrefix}/inspections`,
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
        pipeline: `${apiPrefix}/pipeline`,
        tasks: `${apiPrefix}/tasks`,
        calendar: `${apiPrefix}/calendar`,
        // Finance
        invoices: `${apiPrefix}/invoices`,
        // DRAFT — re-enable next year
        // expenses: `${apiPrefix}/expenses`,
        // bookings: `${apiPrefix}/bookings`,
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
        websiteAnalytics: `${apiPrefix}/website-analytics`,
        auditLogs: `${apiPrefix}/audit-logs`,
        sessions: `${apiPrefix}/sessions`,
        tags: `${apiPrefix}/tags`,
        notifications: `${apiPrefix}/notifications`,
        // Applications
        applications: `${apiPrefix}/applications`,
        // Permissions
        permissions: `${apiPrefix}/permissions`,
        // DRAFT — re-enable next year
        // ecommerce: `${apiPrefix}/ecommerce`,
        // AI Modules
        roofEstimator: `${apiPrefix}/roof-estimator`,
        copilot: `${apiPrefix}/copilot`,
        eagleview: `${apiPrefix}/eagleview`,
        contracts: `${apiPrefix}/contracts`,
        proposals: `${apiPrefix}/proposals`,
        supportTickets: `${apiPrefix}/support-tickets`,
        tickets: `${apiPrefix}/tickets`,
        wallet: `${apiPrefix}/wallet`,
      },
    });
  });
}
