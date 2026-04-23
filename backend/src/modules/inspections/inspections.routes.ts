import { Router } from 'express';
import {
    authenticate,
    loadEmployee,
} from '../../common/middleware/auth.middleware';
import { loadDataAccess } from '../../common/middleware/data-access.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { inspectionsController } from '../leads/inspections.controller';
import {
    createInspectionSchema,
    inspectionIdSchema,
    inspectionListSchema,
    updateInspectionSchema,
} from '../leads/inspections.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);
router.use(loadDataAccess);

router.get(
    '/',
    requirePermission(PERMISSIONS.LEADS_VIEW),
    validate(inspectionListSchema),
    inspectionsController.getAll.bind(inspectionsController),
);

router.post(
    '/',
    requirePermission(PERMISSIONS.LEADS_UPDATE),
    validate(createInspectionSchema),
    inspectionsController.create.bind(inspectionsController),
);

router.get(
    '/:inspectionId',
    requirePermission(PERMISSIONS.LEADS_VIEW),
    validate(inspectionIdSchema),
    inspectionsController.getById.bind(inspectionsController),
);

router.put(
    '/:inspectionId',
    requirePermission(PERMISSIONS.LEADS_UPDATE),
    validate(updateInspectionSchema),
    inspectionsController.update.bind(inspectionsController),
);

router.delete(
    '/:inspectionId',
    requirePermission(PERMISSIONS.LEADS_DELETE),
    validate(inspectionIdSchema),
    inspectionsController.delete.bind(inspectionsController),
);

export default router;
