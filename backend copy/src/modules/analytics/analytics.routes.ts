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

router.get('/dashboard', requirePermission(PERMISSIONS.ANALYTICS_VIEW), analyticsController.getDashboard.bind(analyticsController));
router.get('/leads', requirePermission(PERMISSIONS.ANALYTICS_VIEW), validate(analyticsQuerySchema), analyticsController.getLeadsReport.bind(analyticsController));
router.get('/revenue', requirePermission(PERMISSIONS.ANALYTICS_VIEW), analyticsController.getRevenueReport.bind(analyticsController));

export default router;
