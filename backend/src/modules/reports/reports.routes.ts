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
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  reportsController.getSalesSummary.bind(reportsController),
);

router.get(
  '/sales-rep-performance',
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  reportsController.getSalesRepPerformance.bind(reportsController),
);

router.get(
  '/revenue-over-time',
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  reportsController.getRevenueOverTime.bind(reportsController),
);

router.get(
  '/sales-reps',
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  reportsController.getSalesReps.bind(reportsController),
);

router.get(
  '/export-csv',
  requirePermission(PERMISSIONS.REPORTS_EXPORT),
  reportsController.exportCsv.bind(reportsController),
);

export default router;
