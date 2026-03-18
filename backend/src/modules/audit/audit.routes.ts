import { Router } from 'express';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { auditController } from './audit.controller';
import { auditLogQuerySchema } from './audit.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.AUDIT_VIEW), validate(auditLogQuerySchema), auditController.getMany.bind(auditController));
router.get('/export', requirePermission(PERMISSIONS.AUDIT_EXPORT), validate(auditLogQuerySchema), auditController.exportCsv.bind(auditController));

export default router;
