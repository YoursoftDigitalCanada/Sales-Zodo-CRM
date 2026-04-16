import { Router } from 'express';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requireAnyPermission, requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { settingsController } from './settings.controller';
import { uploadCompanyLogo } from './settings-upload.middleware';
import {
  sendTestEmailSchema,
  updateBillingSchema,
  updateCompanySchema,
  updateEmailTemplatesSchema,
  updateGeneralSchema,
  updateImapSettingsSchema,
  updateNotificationSettingsSchema,
  updateSecuritySettingsSchema,
  updateSettingsSchema,
  updateSmtpSettingsSchema,
} from './settings.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.SETTINGS_VIEW), settingsController.get.bind(settingsController));
router.put('/', requirePermission(PERMISSIONS.SETTINGS_UPDATE), validate(updateSettingsSchema), settingsController.update.bind(settingsController));

router.get('/general', requirePermission(PERMISSIONS.SETTINGS_VIEW), settingsController.getGeneral.bind(settingsController));
router.put('/general', requirePermission(PERMISSIONS.SETTINGS_UPDATE), validate(updateGeneralSchema), settingsController.updateGeneral.bind(settingsController));

router.get('/company/branding', settingsController.getCompanyBranding.bind(settingsController));
router.get('/company', requirePermission(PERMISSIONS.SETTINGS_VIEW), settingsController.getCompany.bind(settingsController));
router.put('/company', requirePermission(PERMISSIONS.SETTINGS_UPDATE), validate(updateCompanySchema), settingsController.updateCompany.bind(settingsController));
router.post('/company/logo', requirePermission(PERMISSIONS.SETTINGS_UPDATE), uploadCompanyLogo, settingsController.uploadCompanyLogo.bind(settingsController));

router.get('/billing', requirePermission(PERMISSIONS.SETTINGS_VIEW), settingsController.getBilling.bind(settingsController));
router.put('/billing', requirePermission(PERMISSIONS.SETTINGS_UPDATE), validate(updateBillingSchema), settingsController.updateBilling.bind(settingsController));
router.post('/billing/cancel', requirePermission(PERMISSIONS.SETTINGS_UPDATE), settingsController.cancelBilling.bind(settingsController));
router.post('/billing/reactivate', requirePermission(PERMISSIONS.SETTINGS_UPDATE), settingsController.reactivateBilling.bind(settingsController));
router.get('/invoices', requirePermission(PERMISSIONS.SETTINGS_VIEW), settingsController.getBillingInvoices.bind(settingsController));

router.get(
  '/email',
  requireAnyPermission([PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_MANAGE_INTEGRATIONS, PERMISSIONS.EMAILS_VIEW, PERMISSIONS.EMAILS_SEND]),
  settingsController.getEmail.bind(settingsController),
);
router.post(
  '/email/smtp',
  requireAnyPermission([PERMISSIONS.SETTINGS_MANAGE_INTEGRATIONS, PERMISSIONS.EMAILS_VIEW, PERMISSIONS.EMAILS_SEND]),
  validate(updateSmtpSettingsSchema),
  settingsController.updateSmtp.bind(settingsController),
);
router.post(
  '/email/imap',
  requireAnyPermission([PERMISSIONS.SETTINGS_MANAGE_INTEGRATIONS, PERMISSIONS.EMAILS_VIEW, PERMISSIONS.EMAILS_SEND]),
  validate(updateImapSettingsSchema),
  settingsController.updateImap.bind(settingsController),
);
router.put('/email/templates', requirePermission(PERMISSIONS.SETTINGS_MANAGE_INTEGRATIONS), validate(updateEmailTemplatesSchema), settingsController.updateTemplates.bind(settingsController));
router.post(
  '/email/test',
  requireAnyPermission([PERMISSIONS.SETTINGS_MANAGE_INTEGRATIONS, PERMISSIONS.EMAILS_VIEW, PERMISSIONS.EMAILS_SEND]),
  validate(sendTestEmailSchema),
  settingsController.sendTestEmail.bind(settingsController),
);

router.get('/notifications', requirePermission(PERMISSIONS.NOTIFICATIONS_VIEW), settingsController.getNotifications.bind(settingsController));
router.put('/notifications', requirePermission(PERMISSIONS.NOTIFICATIONS_MANAGE), validate(updateNotificationSettingsSchema), settingsController.updateNotifications.bind(settingsController));

router.get('/security', requirePermission(PERMISSIONS.SETTINGS_VIEW), settingsController.getSecurity.bind(settingsController));
router.put('/security', requirePermission(PERMISSIONS.SETTINGS_UPDATE), validate(updateSecuritySettingsSchema), settingsController.updateSecurity.bind(settingsController));

export default router;
