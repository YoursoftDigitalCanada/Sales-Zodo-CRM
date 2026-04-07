import { Router } from 'express';
import { loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { constructionEstimatorController } from './construction-estimator.controller';

const router = Router();

// All routes require authentication (handled by protectedRouter in routes/index.ts)
// Add loadEmployee for employee context
router.use(loadEmployee);

// ── CRUD ──
router.post(
  '/',
  requirePermission(PERMISSIONS.ROOF_ESTIMATOR_CREATE),
  constructionEstimatorController.create.bind(constructionEstimatorController)
);
router.get(
  '/',
  requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
  constructionEstimatorController.getMany.bind(constructionEstimatorController)
);
router.get(
  '/:id',
  requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
  constructionEstimatorController.getById.bind(constructionEstimatorController)
);
router.put(
  '/:id',
  requirePermission(PERMISSIONS.ROOF_ESTIMATOR_UPDATE),
  constructionEstimatorController.update.bind(constructionEstimatorController)
);
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.ROOF_ESTIMATOR_DELETE),
  constructionEstimatorController.remove.bind(constructionEstimatorController)
);

// ── Actions ──
router.post(
  '/:id/calculate',
  requirePermission(PERMISSIONS.ROOF_ESTIMATOR_UPDATE),
  constructionEstimatorController.recalculate.bind(constructionEstimatorController)
);
router.post(
  '/:id/measurements',
  requirePermission(PERMISSIONS.ROOF_ESTIMATOR_UPDATE),
  constructionEstimatorController.saveMeasurements.bind(constructionEstimatorController)
);

export default router;
