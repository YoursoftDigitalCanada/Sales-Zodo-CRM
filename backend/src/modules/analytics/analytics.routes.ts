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

const salesAnalyticsEndpoints = [
    ['summary', analyticsController.getSalesSummary],
    ['leads', analyticsController.getSalesLeads],
    ['deals', analyticsController.getSalesDeals],
    ['revenue', analyticsController.getSalesRevenue],
    ['subscriptions', analyticsController.getSalesSubscriptions],
    ['reps', analyticsController.getSalesReps],
    ['sources', analyticsController.getSalesSources],
    ['forecast', analyticsController.getSalesForecast],
] as const;

salesAnalyticsEndpoints.forEach(([path, handler]) => {
    router.get(`/${path}`,
        requirePermission(PERMISSIONS.ANALYTICS_VIEW),
        validate(analyticsQuerySchema),
        handler.bind(analyticsController),
    );
});

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

// ── SMB Insights — Lifecycle, retention, CLV ────────────────────────────
router.get('/smb-insights',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    analyticsController.getSMBInsights.bind(analyticsController),
);

// ── AI Business Overview — Human-readable AI summary for dashboards ─────
router.get('/business-overview',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    analyticsController.getBusinessOverview.bind(analyticsController),
);

// ── Overview KPIs — Deal-equivalent metrics from Projects ───────────────
router.get('/overview-kpis',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    analyticsController.getOverviewKPIs.bind(analyticsController),
);

// ── Revenue vs Target — Monthly comparison ──────────────────────────────
router.get('/revenue-vs-target',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    analyticsController.getRevenueVsTarget.bind(analyticsController),
);

// ── Activity Metrics — Emails, tasks, proposals, meetings by period ─────
router.get('/activity-metrics',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    analyticsController.getActivityMetrics.bind(analyticsController),
);

// ── Team Performance — Per-rep breakdown from Projects ───────────────────
router.get('/team-performance',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    analyticsController.getTeamPerformance.bind(analyticsController),
);

export default router;
