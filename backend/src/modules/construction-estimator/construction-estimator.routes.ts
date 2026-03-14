import { Router } from 'express';
import { loadEmployee } from '../../common/middleware/auth.middleware';
import { constructionEstimatorController } from './construction-estimator.controller';

const router = Router();

// All routes require authentication (handled by protectedRouter in routes/index.ts)
// Add loadEmployee for employee context
router.use(loadEmployee);

// ── CRUD ──
router.post('/', constructionEstimatorController.create.bind(constructionEstimatorController));
router.get('/', constructionEstimatorController.getMany.bind(constructionEstimatorController));
router.get('/:id', constructionEstimatorController.getById.bind(constructionEstimatorController));
router.put('/:id', constructionEstimatorController.update.bind(constructionEstimatorController));
router.delete('/:id', constructionEstimatorController.remove.bind(constructionEstimatorController));

// ── Actions ──
router.post('/:id/calculate', constructionEstimatorController.recalculate.bind(constructionEstimatorController));
router.post('/:id/measurements', constructionEstimatorController.saveMeasurements.bind(constructionEstimatorController));

export default router;
