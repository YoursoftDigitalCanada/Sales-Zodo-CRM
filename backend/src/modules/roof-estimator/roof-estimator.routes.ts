import { Router } from 'express';
import { roofEstimatorController } from './roof-estimator.controller';
import {
    authenticate,
    loadEmployee,
} from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import {
    satelliteRequestSchema,
    detectRoofSchema,
    createEstimateSchema,
    updateEstimateSchema,
    estimateIdSchema,
    estimateQuerySchema,
    updateSettingsSchema,
    generateEstimateSchema,
} from './roof-estimator.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

// Address autocomplete
router.get(
    '/autocomplete',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
    roofEstimatorController.autocomplete.bind(roofEstimatorController)
);

// Satellite & AI detection
router.post(
    '/satellite',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_CREATE),
    validate(satelliteRequestSchema),
    roofEstimatorController.getSatellite.bind(roofEstimatorController)
);

router.post(
    '/detect',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_CREATE),
    validate(detectRoofSchema),
    roofEstimatorController.detectRoof.bind(roofEstimatorController)
);

// OpenAI cost estimate generation
router.post(
    '/generate-estimate',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_CREATE),
    validate(generateEstimateSchema),
    roofEstimatorController.generateEstimate.bind(roofEstimatorController)
);

// AI health check
router.get(
    '/ai-health',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
    roofEstimatorController.checkAiHealth.bind(roofEstimatorController)
);

// Statistics
router.get(
    '/statistics',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
    roofEstimatorController.getStatistics.bind(roofEstimatorController)
);

// Settings
router.get(
    '/settings',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
    roofEstimatorController.getSettings.bind(roofEstimatorController)
);

router.put(
    '/settings',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_SETTINGS),
    validate(updateSettingsSchema),
    roofEstimatorController.updateSettings.bind(roofEstimatorController)
);

// CRUD for estimates
router.get(
    '/',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
    validate(estimateQuerySchema),
    roofEstimatorController.getMany.bind(roofEstimatorController)
);

router.post(
    '/',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_CREATE),
    validate(createEstimateSchema),
    roofEstimatorController.create.bind(roofEstimatorController)
);

router.get(
    '/:id',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
    validate(estimateIdSchema),
    roofEstimatorController.getById.bind(roofEstimatorController)
);

router.put(
    '/:id',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_CREATE),
    validate(estimateIdSchema),
    validate(updateEstimateSchema),
    roofEstimatorController.update.bind(roofEstimatorController)
);

router.delete(
    '/:id',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_DELETE),
    validate(estimateIdSchema),
    roofEstimatorController.delete.bind(roofEstimatorController)
);

export default router;
