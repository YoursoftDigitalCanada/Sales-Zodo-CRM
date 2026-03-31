import { Router } from 'express';
import { emailsController } from './emails.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requireAnyPermission, requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import {
    sendEmailSchema,
    saveDraftSchema,
    emailQuerySchema,
    emailIdSchema,
    updateMailboxSettingsSchema,
    updateEmailReadSchema,
    updateEmailImportantSchema,
    updateEmailLabelsSchema,
    snoozeEmailSchema,
    createEmailLabelSchema,
} from './emails.validators';
import { uploadEmailAttachments } from './emails-upload.middleware';
import { cleanupUploadedEmailFilesOnError, normalizeSendEmailBody } from './emails-send.middleware';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get(
    '/config-status',
    requireAnyPermission([PERMISSIONS.EMAILS_VIEW, PERMISSIONS.EMAILS_SEND]),
    emailsController.getConfigStatus.bind(emailsController),
);
router.get(
    '/mailbox/settings',
    requireAnyPermission([PERMISSIONS.EMAILS_VIEW, PERMISSIONS.EMAILS_SEND]),
    emailsController.getMailboxSettings.bind(emailsController),
);
router.put(
    '/mailbox/settings',
    requireAnyPermission([PERMISSIONS.EMAILS_VIEW, PERMISSIONS.EMAILS_SEND]),
    validate(updateMailboxSettingsSchema),
    emailsController.updateMailboxSettings.bind(emailsController),
);
router.get('/labels', requirePermission(PERMISSIONS.EMAILS_VIEW), emailsController.getLabels.bind(emailsController));
router.post('/labels', requirePermission(PERMISSIONS.EMAILS_VIEW), validate(createEmailLabelSchema), emailsController.createLabel.bind(emailsController));
router.get('/', requirePermission(PERMISSIONS.EMAILS_VIEW), validate(emailQuerySchema), emailsController.getEmails.bind(emailsController));
router.post(
    '/send',
    requirePermission(PERMISSIONS.EMAILS_SEND),
    uploadEmailAttachments,
    normalizeSendEmailBody,
    validate(sendEmailSchema),
    emailsController.sendEmail.bind(emailsController),
);
router.post(
    '/drafts',
    requirePermission(PERMISSIONS.EMAILS_SEND),
    uploadEmailAttachments,
    normalizeSendEmailBody,
    validate(saveDraftSchema),
    emailsController.saveDraft.bind(emailsController),
);
router.post('/fetch-now', requirePermission(PERMISSIONS.EMAILS_VIEW), emailsController.fetchNow.bind(emailsController));
router.get('/:id', requirePermission(PERMISSIONS.EMAILS_VIEW), validate(emailIdSchema), emailsController.getEmailById.bind(emailsController));
router.patch('/:id/read', requirePermission(PERMISSIONS.EMAILS_VIEW), validate(updateEmailReadSchema), emailsController.markAsRead.bind(emailsController));
router.patch('/:id/star', requirePermission(PERMISSIONS.EMAILS_VIEW), validate(emailIdSchema), emailsController.toggleStar.bind(emailsController));
router.patch('/:id/important', requirePermission(PERMISSIONS.EMAILS_VIEW), validate(updateEmailImportantSchema), emailsController.toggleImportant.bind(emailsController));
router.patch('/:id/labels', requirePermission(PERMISSIONS.EMAILS_VIEW), validate(updateEmailLabelsSchema), emailsController.setLabels.bind(emailsController));
router.patch('/:id/snooze', requirePermission(PERMISSIONS.EMAILS_VIEW), validate(snoozeEmailSchema), emailsController.snooze.bind(emailsController));
router.patch('/:id/folder', requirePermission(PERMISSIONS.EMAILS_VIEW), validate(emailIdSchema), emailsController.moveToFolder.bind(emailsController));
router.delete('/:id', requirePermission(PERMISSIONS.EMAILS_DELETE), validate(emailIdSchema), emailsController.deleteEmail.bind(emailsController));
router.use(cleanupUploadedEmailFilesOnError);

export default router;
