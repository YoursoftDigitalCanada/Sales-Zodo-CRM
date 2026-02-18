import { Router } from 'express';
import { applicationsController } from './applications.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import {
    createApplicationSchema,
    updateApplicationSchema,
    applicationQuerySchema,
    applicationIdSchema,
} from './applications.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.APPLICATIONS_VIEW), validate(applicationQuerySchema), applicationsController.getMany.bind(applicationsController));
router.post('/', requirePermission(PERMISSIONS.APPLICATIONS_CREATE), validate(createApplicationSchema), applicationsController.create.bind(applicationsController));
router.get('/:id', requirePermission(PERMISSIONS.APPLICATIONS_VIEW), validate(applicationIdSchema), applicationsController.getById.bind(applicationsController));
router.put('/:id', requirePermission(PERMISSIONS.APPLICATIONS_UPDATE), validate(applicationIdSchema), validate(updateApplicationSchema), applicationsController.update.bind(applicationsController));
router.delete('/:id', requirePermission(PERMISSIONS.APPLICATIONS_DELETE), validate(applicationIdSchema), applicationsController.delete.bind(applicationsController));

export default router;
