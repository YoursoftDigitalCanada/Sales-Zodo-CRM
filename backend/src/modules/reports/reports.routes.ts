import { Router } from 'express';
import { reportsController } from './reports.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get(
  '/sales-summary',
  requirePermission(PERMISSIONS.ANALYTICS_VIEW),
  reportsController.getSalesSummary.bind(reportsController),
);

router.get(
  '/sales-rep-performance',
  requirePermission(PERMISSIONS.ANALYTICS_VIEW),
  reportsController.getSalesRepPerformance.bind(reportsController),
);

router.get(
  '/revenue-over-time',
  requirePermission(PERMISSIONS.ANALYTICS_VIEW),
  reportsController.getRevenueOverTime.bind(reportsController),
);

router.get(
  '/sales-reps',
  requirePermission(PERMISSIONS.ANALYTICS_VIEW),
  reportsController.getSalesReps.bind(reportsController),
);

router.get(
  '/export-csv',
  requirePermission(PERMISSIONS.ANALYTICS_EXPORT),
  reportsController.exportCsv.bind(reportsController),
);

export default router;
