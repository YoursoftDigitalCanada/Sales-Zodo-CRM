import { Router } from 'express';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { loadDataAccess } from '../../common/middleware/data-access.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { dashboardController } from './dashboard.controller';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);
router.use(loadDataAccess);

router.get(
  '/summary',
  requirePermission(PERMISSIONS.DASHBOARD_VIEW),
  dashboardController.getSummary.bind(dashboardController),
);

export default router;
