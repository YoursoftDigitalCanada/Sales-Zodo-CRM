import { Router, Request, Response, NextFunction } from 'express';
import { adminAuthenticate } from './admin.middleware';
import { adminAuthService } from './admin-auth.service';
import { adminDashboardService } from './admin-dashboard.service';
import { adminTenantsService } from './admin-tenants.service';
import { adminSystemService } from './admin-system.service';
import { validate } from '../../common/middleware/validate.middleware';
import { supportTicketsRealtimeService } from '../support-tickets/support-tickets.realtime';
import { supportTicketsService } from '../support-tickets/support-tickets.service';
import {
    addSupportTicketMessageSchema,
    assignSupportTicketSchema,
    supportTicketIdSchema,
    supportTicketQuerySchema,
    updateSupportTicketStatusSchema,
} from '../support-tickets/support-tickets.validators';
import rateLimit from 'express-rate-limit';

const router = Router();

// ── Rate limiting for admin login ──────────────────────────────────────
const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { success: false, message: 'Too many login attempts, try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Helper ─────────────────────────────────────────────────────────────
function sendSuccess(res: Response, data: any, message?: string) {
    res.json({ success: true, data, message: message || 'OK' });
}

async function getAdminActor(adminId: string): Promise<string> {
    const admin = await adminAuthService.getProfile(adminId);
    const fullName = `${admin.firstName} ${admin.lastName}`.trim();
    return fullName || admin.email;
}

async function streamSupportTickets(req: Request, res: Response, next: NextFunction) {
    try {
        const disconnect = supportTicketsRealtimeService.subscribeAdmin(res);
        req.on('close', disconnect);
    } catch (error) {
        next(error);
    }
}

async function listSupportTickets(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await supportTicketsService.getAdminTickets(req.query as any);
        sendSuccess(res, result, `Found ${result.meta.total} tickets`);
    } catch (error) {
        next(error);
    }
}

async function getSupportTicket(req: Request, res: Response, next: NextFunction) {
    try {
        const ticket = await supportTicketsService.getAdminTicketById(req.params.id);
        sendSuccess(res, ticket);
    } catch (error) {
        next(error);
    }
}

async function updateSupportTicketStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const actor = await getAdminActor(req.admin!.adminId);
        const ticket = await supportTicketsService.updateAdminStatus(req.params.id, req.body.status, actor);
        await adminAuthService.logAction(req.admin!.adminId, 'SUPPORT_TICKET_STATUS_UPDATED', 'SupportTicket', req.params.id, {
            status: req.body.status,
        });
        sendSuccess(res, ticket, `Ticket status updated to ${req.body.status}`);
    } catch (error) {
        next(error);
    }
}

async function assignSupportTicket(req: Request, res: Response, next: NextFunction) {
    try {
        const actor = await getAdminActor(req.admin!.adminId);
        const assignee = req.body.assignee?.trim() ? req.body.assignee.trim().toLowerCase() : null;
        const ticket = await supportTicketsService.assignAdminTicket(req.params.id, assignee, actor);
        await adminAuthService.logAction(req.admin!.adminId, 'SUPPORT_TICKET_ASSIGNED', 'SupportTicket', req.params.id, {
            assignee,
        });
        sendSuccess(res, ticket, assignee ? `Ticket assigned to ${assignee}` : 'Ticket assignment cleared');
    } catch (error) {
        next(error);
    }
}

async function addSupportTicketMessage(req: Request, res: Response, next: NextFunction) {
    try {
        const actor = await getAdminActor(req.admin!.adminId);
        const ticket = await supportTicketsService.addAdminMessage(
            req.params.id,
            actor,
            req.body.message,
            Boolean(req.body.isInternal)
        );
        await adminAuthService.logAction(req.admin!.adminId, 'SUPPORT_TICKET_MESSAGE_ADDED', 'SupportTicket', req.params.id, {
            isInternal: Boolean(req.body.isInternal),
        });
        sendSuccess(res, ticket, req.body.isInternal ? 'Internal note added' : 'Reply sent');
    } catch (error) {
        next(error);
    }
}

async function deleteSupportTicket(req: Request, res: Response, next: NextFunction) {
    try {
        await supportTicketsService.deleteAdminTicket(req.params.id);
        await adminAuthService.logAction(req.admin!.adminId, 'SUPPORT_TICKET_DELETED', 'SupportTicket', req.params.id);
        sendSuccess(res, null, 'Ticket deleted');
    } catch (error) {
        next(error);
    }
}

// ========================================================================
// AUTH ROUTES (public — no admin middleware)
// ========================================================================

router.post('/auth/login', adminLoginLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email and password required' });
            return;
        }
        const result = await adminAuthService.login(email, password, req.ip);
        sendSuccess(res, result, 'Login successful');
    } catch (error: any) {
        res.status(401).json({ success: false, message: error.message || 'Authentication failed' });
    }
});

// ========================================================================
// PROTECTED ROUTES (require admin JWT)
// ========================================================================

router.use(adminAuthenticate);

// ── Auth ────────────────────────────────────────────────────────────────

router.get('/auth/profile', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const profile = await adminAuthService.getProfile(req.admin!.adminId);
        sendSuccess(res, profile);
    } catch (error: any) {
        res.status(404).json({ success: false, message: error.message });
    }
});

// ── Dashboard Metrics ───────────────────────────────────────────────────

router.get('/dashboard-metrics', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const metrics = await adminDashboardService.getDashboardMetrics();
        sendSuccess(res, metrics, 'Dashboard metrics loaded');
    } catch (error) {
        next(error);
    }
});

// ── Revenue Analytics ───────────────────────────────────────────────────

router.get('/revenue', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await adminDashboardService.getRevenueAnalytics();
        sendSuccess(res, data, 'Revenue analytics loaded');
    } catch (error) {
        next(error);
    }
});

// ── Subscription Analytics ──────────────────────────────────────────────

router.get('/subscriptions', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await adminDashboardService.getSubscriptionAnalytics();
        sendSuccess(res, data, 'Subscription analytics loaded');
    } catch (error) {
        next(error);
    }
});

// ── Tenant Management ───────────────────────────────────────────────────

router.get('/tenants', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query = {
            page: req.query.page ? Number(req.query.page) : 1,
            limit: req.query.limit ? Number(req.query.limit) : 20,
            search: req.query.search as string | undefined,
            status: req.query.status as string | undefined,
            planType: req.query.planType as string | undefined,
            billingCycle: req.query.billingCycle as string | undefined,
            sortBy: (req.query.sortBy as string) || 'createdAt',
            sortOrder: (req.query.sortOrder as string) || 'desc',
        };
        const result = await adminTenantsService.listTenants(query);
        sendSuccess(res, result, `Found ${result.total} tenants`);
    } catch (error) {
        next(error);
    }
});

router.get('/tenants/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const detail = await adminTenantsService.getTenantDetail(req.params.id);
        sendSuccess(res, detail);
    } catch (error: any) {
        res.status(404).json({ success: false, message: error.message });
    }
});

router.put('/tenants/:id/suspend', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await adminTenantsService.suspendTenant(req.params.id, req.admin!.adminId);
        sendSuccess(res, result, 'Tenant suspended');
    } catch (error) {
        next(error);
    }
});

router.put('/tenants/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await adminTenantsService.activateTenant(req.params.id, req.admin!.adminId);
        sendSuccess(res, result, 'Tenant activated');
    } catch (error) {
        next(error);
    }
});

router.put('/tenants/:id/upgrade', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { planType, billingCycle, monthlyRate } = req.body;
        if (!planType || !billingCycle) {
            res.status(400).json({ success: false, message: 'planType and billingCycle required' });
            return;
        }
        const result = await adminTenantsService.upgradePlan(
            req.params.id,
            planType,
            billingCycle,
            Number(monthlyRate) || 0,
            req.admin!.adminId
        );
        sendSuccess(res, result, 'Plan upgraded');
    } catch (error) {
        next(error);
    }
});

router.put('/tenants/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await adminTenantsService.cancelSubscription(req.params.id, req.admin!.adminId);
        sendSuccess(res, result, 'Subscription cancelled');
    } catch (error) {
        next(error);
    }
});

router.delete('/tenants/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await adminTenantsService.deleteTenant(req.params.id, req.admin!.adminId);
        sendSuccess(res, result, 'Tenant deleted');
    } catch (error) {
        next(error);
    }
});

// ── System Health ───────────────────────────────────────────────────────

router.get('/system-health', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const health = await adminSystemService.getSystemHealth();
        sendSuccess(res, health, 'System health loaded');
    } catch (error) {
        next(error);
    }
});

// ── Audit Logs ──────────────────────────────────────────────────────────

router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('../../config/database');
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50;

        const [logs, total] = await Promise.all([
            prisma.adminAuditLog.findMany({
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.adminAuditLog.count(),
        ]);

        sendSuccess(res, { data: logs, total, page, limit });
    } catch (error) {
        next(error);
    }
});

// ── Support Tickets (cross-tenant) ──────────────────────────────────────

router.get('/support-team', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const team = await supportTicketsService.getSupportTeam();
        sendSuccess(res, team, 'Support team loaded');
    } catch (error) {
        next(error);
    }
});

router.get('/support-tickets/stream', streamSupportTickets);
router.get('/tickets/stream', streamSupportTickets);

router.get('/support-tickets', validate(supportTicketQuerySchema), listSupportTickets);
router.get('/tickets', validate(supportTicketQuerySchema), listSupportTickets);

router.get('/support-tickets/:id', validate(supportTicketIdSchema), getSupportTicket);
router.get('/tickets/:id', validate(supportTicketIdSchema), getSupportTicket);

router.patch(
    '/support-tickets/:id/status',
    validate(supportTicketIdSchema),
    validate(updateSupportTicketStatusSchema),
    updateSupportTicketStatus
);
router.patch(
    '/tickets/:id/status',
    validate(supportTicketIdSchema),
    validate(updateSupportTicketStatusSchema),
    updateSupportTicketStatus
);

router.patch(
    '/support-tickets/:id/assign',
    validate(supportTicketIdSchema),
    validate(assignSupportTicketSchema),
    assignSupportTicket
);
router.patch(
    '/tickets/:id/assign',
    validate(supportTicketIdSchema),
    validate(assignSupportTicketSchema),
    assignSupportTicket
);

router.post(
    '/support-tickets/:id/messages',
    validate(supportTicketIdSchema),
    validate(addSupportTicketMessageSchema),
    addSupportTicketMessage
);
router.post(
    '/tickets/:id/messages',
    validate(supportTicketIdSchema),
    validate(addSupportTicketMessageSchema),
    addSupportTicketMessage
);

router.delete('/support-tickets/:id', validate(supportTicketIdSchema), deleteSupportTicket);
router.delete('/tickets/:id', validate(supportTicketIdSchema), deleteSupportTicket);

export default router;
