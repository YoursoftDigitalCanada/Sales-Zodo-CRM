import { Router } from 'express';
import { emailsController } from './emails.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { sendEmailSchema, emailQuerySchema, emailIdSchema } from './emails.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/config-status', emailsController.getConfigStatus.bind(emailsController));
router.get('/', requirePermission(PERMISSIONS.EMAILS_VIEW), validate(emailQuerySchema), emailsController.getEmails.bind(emailsController));
router.post('/send', requirePermission(PERMISSIONS.EMAILS_SEND), validate(sendEmailSchema), emailsController.sendEmail.bind(emailsController));
router.post('/fetch-now', requirePermission(PERMISSIONS.EMAILS_VIEW), emailsController.fetchNow.bind(emailsController));
router.get('/:id', requirePermission(PERMISSIONS.EMAILS_VIEW), validate(emailIdSchema), emailsController.getEmailById.bind(emailsController));
router.patch('/:id/read', requirePermission(PERMISSIONS.EMAILS_VIEW), validate(emailIdSchema), emailsController.markAsRead.bind(emailsController));
router.patch('/:id/star', requirePermission(PERMISSIONS.EMAILS_VIEW), validate(emailIdSchema), emailsController.toggleStar.bind(emailsController));
router.patch('/:id/folder', requirePermission(PERMISSIONS.EMAILS_VIEW), validate(emailIdSchema), emailsController.moveToFolder.bind(emailsController));
router.delete('/:id', requirePermission(PERMISSIONS.EMAILS_DELETE), validate(emailIdSchema), emailsController.deleteEmail.bind(emailsController));

export default router;
