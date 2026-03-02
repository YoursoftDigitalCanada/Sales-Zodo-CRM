import { Router } from 'express';
import { roofEstimatorController } from './roof-estimator.controller';
import {
    authenticate,
    loadEmployee,
} from '../../common/middleware/auth.middleware';
import { requireAnyPermission, requirePermission } from '../../common/middleware/permission.middleware';
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
    // New schemas
    manualEntrySchema,
    calculateAreaSchema,
    calculateLaborSchema,
    calculateTotalSchema,
    generateTakeoffSchema,
    generateScenariosSchema,
    createMaterialSchema,
    updateMaterialSchema,
    materialIdSchema,
    createLaborRateSchema,
    updateLaborRateSchema,
    laborRateIdSchema,
    takeoffsByEstimateSchema,
    takeoffIdSchema,
    // Nearmap schemas
    nearmapExtractSchema,
    roofDataByClientSchema,
} from './roof-estimator.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

// ── Address autocomplete ──────────────────────────────────────────────────
router.get(
    '/autocomplete',
    requireAnyPermission([PERMISSIONS.ROOF_ESTIMATOR_VIEW, PERMISSIONS.ROOF_ESTIMATOR_CREATE]),
    roofEstimatorController.autocomplete.bind(roofEstimatorController)
);

// ── Satellite & AI detection ──────────────────────────────────────────────
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

// ── Nearmap AI Extraction ─────────────────────────────────────────────────
router.post(
    '/nearmap-extract',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_CREATE),
    validate(nearmapExtractSchema),
    roofEstimatorController.nearmapExtract.bind(roofEstimatorController)
);

router.get(
    '/roof-data/:clientId',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
    validate(roofDataByClientSchema),
    roofEstimatorController.getRoofData.bind(roofEstimatorController)
);

// ── F3: Manual entry ──────────────────────────────────────────────────────
router.post(
    '/manual-entry',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_CREATE),
    validate(manualEntrySchema),
    roofEstimatorController.manualEntry.bind(roofEstimatorController)
);

// ── F4: Pitch-adjusted area calculator ────────────────────────────────────
router.post(
    '/calculate-area',
    requireAnyPermission([PERMISSIONS.ROOF_ESTIMATOR_VIEW, PERMISSIONS.ROOF_ESTIMATOR_CREATE]),
    validate(calculateAreaSchema),
    roofEstimatorController.calculateArea.bind(roofEstimatorController)
);

// ── F7: Labor calculator ──────────────────────────────────────────────────
router.post(
    '/calculate-labor',
    requireAnyPermission([PERMISSIONS.ROOF_ESTIMATOR_VIEW, PERMISSIONS.ROOF_ESTIMATOR_CREATE]),
    validate(calculateLaborSchema),
    roofEstimatorController.calculateLabor.bind(roofEstimatorController)
);

// ── F10: Total + markup calculator ────────────────────────────────────────
router.post(
    '/calculate-total',
    requireAnyPermission([PERMISSIONS.ROOF_ESTIMATOR_VIEW, PERMISSIONS.ROOF_ESTIMATOR_CREATE]),
    validate(calculateTotalSchema),
    roofEstimatorController.calculateTotal.bind(roofEstimatorController)
);

// ── F5 & F9: Material takeoff ─────────────────────────────────────────────
router.post(
    '/takeoff',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_CREATE),
    validate(generateTakeoffSchema),
    roofEstimatorController.generateTakeoff.bind(roofEstimatorController)
);

router.post(
    '/takeoff/scenarios',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_CREATE),
    validate(generateScenariosSchema),
    roofEstimatorController.generateScenarios.bind(roofEstimatorController)
);

router.get(
    '/takeoff/estimate/:estimateId',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
    validate(takeoffsByEstimateSchema),
    roofEstimatorController.getTakeoffsByEstimate.bind(roofEstimatorController)
);

router.delete(
    '/takeoff/:id',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_DELETE),
    validate(takeoffIdSchema),
    roofEstimatorController.deleteTakeoff.bind(roofEstimatorController)
);

// ── F8: Supplier pricing (materials CRUD) ─────────────────────────────────
router.get(
    '/materials',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
    roofEstimatorController.getMaterials.bind(roofEstimatorController)
);

router.post(
    '/materials',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_SETTINGS),
    validate(createMaterialSchema),
    roofEstimatorController.createMaterial.bind(roofEstimatorController)
);

router.put(
    '/materials/:id',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_SETTINGS),
    validate(materialIdSchema),
    validate(updateMaterialSchema),
    roofEstimatorController.updateMaterial.bind(roofEstimatorController)
);

router.delete(
    '/materials/:id',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_SETTINGS),
    validate(materialIdSchema),
    roofEstimatorController.deleteMaterial.bind(roofEstimatorController)
);

// ── F7: Labor rates CRUD ──────────────────────────────────────────────────
router.get(
    '/labor-rates',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
    roofEstimatorController.getLaborRates.bind(roofEstimatorController)
);

router.post(
    '/labor-rates',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_SETTINGS),
    validate(createLaborRateSchema),
    roofEstimatorController.createLaborRate.bind(roofEstimatorController)
);

router.put(
    '/labor-rates/:id',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_SETTINGS),
    validate(laborRateIdSchema),
    validate(updateLaborRateSchema),
    roofEstimatorController.updateLaborRate.bind(roofEstimatorController)
);

router.delete(
    '/labor-rates/:id',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_SETTINGS),
    validate(laborRateIdSchema),
    roofEstimatorController.deleteLaborRate.bind(roofEstimatorController)
);

// ── OpenAI cost estimate generation ───────────────────────────────────────
router.post(
    '/generate-estimate',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_CREATE),
    validate(generateEstimateSchema),
    roofEstimatorController.generateEstimate.bind(roofEstimatorController)
);

// ── AI health check ───────────────────────────────────────────────────────
router.get(
    '/ai-health',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
    roofEstimatorController.checkAiHealth.bind(roofEstimatorController)
);

// ── Statistics ─────────────────────────────────────────────────────────────
router.get(
    '/statistics',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_VIEW),
    roofEstimatorController.getStatistics.bind(roofEstimatorController)
);

// ── Settings ──────────────────────────────────────────────────────────────
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

// ── CRUD for estimates ────────────────────────────────────────────────────
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
