import { Router } from 'express';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { sessionsController } from './sessions.controller';
import { sessionIdSchema } from './sessions.validators';
import { PERMISSIONS } from '../../common/constants/permissions';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.SETTINGS_VIEW), sessionsController.getMany.bind(sessionsController));
router.get('/current-status', sessionsController.getCurrentStatus.bind(sessionsController));
router.delete('/:id', requirePermission(PERMISSIONS.SETTINGS_UPDATE), validate(sessionIdSchema), sessionsController.revoke.bind(sessionsController));

export default router;
