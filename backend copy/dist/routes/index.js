"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const express_1 = require("express");
const config_1 = require("../config");
// Core module routes
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const leads_routes_1 = __importDefault(require("../modules/leads/leads.routes"));
const lead_sources_routes_1 = __importDefault(require("../modules/lead-sources/lead-sources.routes"));
const tags_routes_1 = __importDefault(require("../modules/tags/tags.routes"));
const notifications_routes_1 = __importDefault(require("../modules/notifications/notifications.routes"));
// CRM modules
const clients_routes_1 = __importDefault(require("../modules/clients/clients.routes"));
const contacts_routes_1 = __importDefault(require("../modules/contacts/contacts.routes"));
const groups_routes_1 = __importDefault(require("../modules/groups/groups.routes"));
// User & Access modules
const users_routes_1 = __importDefault(require("../modules/users/users.routes"));
const employees_routes_1 = __importDefault(require("../modules/employees/employees.routes"));
const roles_routes_1 = __importDefault(require("../modules/roles/roles.routes"));
const tenants_routes_1 = __importDefault(require("../modules/tenants/tenants.routes"));
// Operations modules
const tasks_routes_1 = __importDefault(require("../modules/tasks/tasks.routes"));
const projects_routes_1 = __importDefault(require("../modules/projects/projects.routes"));
const calendar_routes_1 = __importDefault(require("../modules/calendar/calendar.routes"));
// Finance modules
const invoices_routes_1 = __importDefault(require("../modules/invoices/invoices.routes"));
const expenses_routes_1 = __importDefault(require("../modules/expenses/expenses.routes"));
const bookings_routes_1 = __importDefault(require("../modules/bookings/bookings.routes"));
// File management modules
const files_routes_1 = __importDefault(require("../modules/files/files.routes"));
const folders_routes_1 = __importDefault(require("../modules/folders/folders.routes"));
// Communication modules
const emails_routes_1 = __importDefault(require("../modules/emails/emails.routes"));
const chat_routes_1 = __importDefault(require("../modules/chat/chat.routes"));
// System modules
const settings_routes_1 = __importDefault(require("../modules/settings/settings.routes"));
const analytics_routes_1 = __importDefault(require("../modules/analytics/analytics.routes"));
/**
 * Register all API routes
 */
function registerRoutes(app) {
    const apiRouter = (0, express_1.Router)();
    const apiPrefix = `/api/${config_1.config.app.apiVersion}`;
    // =========================================================================
    // PUBLIC ROUTES (No authentication required)
    // =========================================================================
    apiRouter.use('/auth', auth_routes_1.default);
    // =========================================================================
    // PROTECTED ROUTES (Authentication required)
    // =========================================================================
    // CRM - Leads
    apiRouter.use('/leads', leads_routes_1.default);
    apiRouter.use('/lead-sources', lead_sources_routes_1.default);
    // CRM - Clients & Contacts
    apiRouter.use('/clients', clients_routes_1.default);
    apiRouter.use('/contacts', contacts_routes_1.default);
    apiRouter.use('/groups', groups_routes_1.default);
    // User & Employee Management
    apiRouter.use('/users', users_routes_1.default);
    apiRouter.use('/employees', employees_routes_1.default);
    apiRouter.use('/roles', roles_routes_1.default);
    apiRouter.use('/tenants', tenants_routes_1.default);
    // Projects & Tasks
    apiRouter.use('/projects', projects_routes_1.default);
    apiRouter.use('/tasks', tasks_routes_1.default);
    apiRouter.use('/calendar', calendar_routes_1.default);
    // Finance
    apiRouter.use('/invoices', invoices_routes_1.default);
    apiRouter.use('/expenses', expenses_routes_1.default);
    apiRouter.use('/bookings', bookings_routes_1.default);
    // File Management
    apiRouter.use('/files', files_routes_1.default);
    apiRouter.use('/folders', folders_routes_1.default);
    // Communication
    apiRouter.use('/emails', emails_routes_1.default);
    apiRouter.use('/chat', chat_routes_1.default);
    // System
    apiRouter.use('/settings', settings_routes_1.default);
    apiRouter.use('/analytics', analytics_routes_1.default);
    // Tags & Notifications (shared)
    apiRouter.use('/tags', tags_routes_1.default);
    apiRouter.use('/notifications', notifications_routes_1.default);
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
            version: config_1.config.app.apiVersion,
            documentation: !config_1.config.app.isProduction ? '/api-docs' : undefined,
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
            },
        });
    });
}
//# sourceMappingURL=index.js.map