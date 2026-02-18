import { Application, Router } from 'express';
import { config } from '../config';

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
import expensesRoutes from '../modules/expenses/expenses.routes';
import bookingsRoutes from '../modules/bookings/bookings.routes';

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

/**
 * Register all API routes
 */
export function registerRoutes(app: Application): void {
  const apiRouter = Router();
  const apiPrefix = `/api/${config.app.apiVersion}`;

  // =========================================================================
  // PUBLIC ROUTES (No authentication required)
  // =========================================================================

  apiRouter.use('/auth', authRoutes);

  // =========================================================================
  // PROTECTED ROUTES (Authentication required)
  // =========================================================================

  // CRM - Leads
  apiRouter.use('/leads', leadsRoutes);
  apiRouter.use('/lead-sources', leadSourcesRoutes);

  // CRM - Clients & Contacts
  apiRouter.use('/clients', clientsRoutes);
  apiRouter.use('/contacts', contactsRoutes);
  apiRouter.use('/groups', groupsRoutes);

  // User & Employee Management
  apiRouter.use('/users', usersRoutes);
  apiRouter.use('/employees', employeesRoutes);
  apiRouter.use('/roles', rolesRoutes);
  apiRouter.use('/tenants', tenantsRoutes);

  // Projects & Tasks
  apiRouter.use('/projects', projectsRoutes);
  apiRouter.use('/tasks', tasksRoutes);
  apiRouter.use('/calendar', calendarRoutes);

  // Finance
  apiRouter.use('/invoices', invoicesRoutes);
  apiRouter.use('/expenses', expensesRoutes);
  apiRouter.use('/bookings', bookingsRoutes);

  // File Management
  apiRouter.use('/files', filesRoutes);
  apiRouter.use('/folders', foldersRoutes);

  // Communication
  apiRouter.use('/emails', emailsRoutes);
  apiRouter.use('/chat', chatRoutes);

  // System
  apiRouter.use('/settings', settingsRoutes);
  apiRouter.use('/analytics', analyticsRoutes);

  // Tags & Notifications (shared)
  apiRouter.use('/tags', tagsRoutes);
  apiRouter.use('/notifications', notificationsRoutes);

  // Applications
  apiRouter.use('/applications', applicationsRoutes);

  // Permissions
  apiRouter.use('/permissions', permissionsRoutes);

  // E-commerce
  apiRouter.use('/ecommerce', ecommerceRoutes);

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
      },
    });
  });
}