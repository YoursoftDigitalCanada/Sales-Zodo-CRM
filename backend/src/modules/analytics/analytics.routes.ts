import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { analyticsQuerySchema } from './analytics.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

// ── Dashboard KPIs ──────────────────────────────────────────────────────
router.get('/dashboard',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    analyticsController.getDashboard.bind(analyticsController),
);

// ── Lead Reports ────────────────────────────────────────────────────────
router.get('/leads',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    validate(analyticsQuerySchema),
    analyticsController.getLeadsReport.bind(analyticsController),
);

// ── Lead Source Breakdown ───────────────────────────────────────────────
router.get('/lead-sources',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    analyticsController.getLeadSources.bind(analyticsController),
);

// ── Pipeline Health ─────────────────────────────────────────────────────
router.get('/pipeline',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    analyticsController.getPipelineHealth.bind(analyticsController),
);

// ── Revenue ─────────────────────────────────────────────────────────────
router.get('/revenue',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    analyticsController.getRevenueReport.bind(analyticsController),
);

// ── Revenue Trend (6-month) ─────────────────────────────────────────────
router.get('/revenue-trend',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    analyticsController.getRevenueTrend.bind(analyticsController),
);

// ── Booking Stats ───────────────────────────────────────────────────────
router.get('/bookings',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    analyticsController.getBookingStats.bind(analyticsController),
);

// ── AI Context — Unified intelligence for all AI features ───────────────
router.get('/ai-context',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    analyticsController.getAIContext.bind(analyticsController),
);

export default router;
