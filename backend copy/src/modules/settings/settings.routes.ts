import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { updateSettingsSchema } from './settings.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.SETTINGS_VIEW), settingsController.get.bind(settingsController));
router.put('/', requirePermission(PERMISSIONS.SETTINGS_UPDATE), validate(updateSettingsSchema), settingsController.update.bind(settingsController));

export default router;
