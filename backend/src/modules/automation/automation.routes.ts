import { Router } from 'express';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { automationController } from './automation.controller';
import { automationIdSchema, automationRuleSchema, testTriggerSchema } from './automation.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

router.get('/rules', requirePermission(PERMISSIONS.AUTOMATION_VIEW), automationController.listRules.bind(automationController));
router.post('/rules', requirePermission(PERMISSIONS.AUTOMATION_CREATE), validate(automationRuleSchema), automationController.createRule.bind(automationController));
router.get('/rules/:id', requirePermission(PERMISSIONS.AUTOMATION_VIEW), validate(automationIdSchema), automationController.getRule.bind(automationController));
router.put('/rules/:id', requirePermission(PERMISSIONS.AUTOMATION_UPDATE), validate(automationIdSchema), validate(automationRuleSchema), automationController.updateRule.bind(automationController));
router.delete('/rules/:id', requirePermission(PERMISSIONS.AUTOMATION_DELETE), validate(automationIdSchema), automationController.deleteRule.bind(automationController));
router.post('/rules/:id/enable', requirePermission(PERMISSIONS.AUTOMATION_UPDATE), validate(automationIdSchema), automationController.enableRule.bind(automationController));
router.post('/rules/:id/disable', requirePermission(PERMISSIONS.AUTOMATION_UPDATE), validate(automationIdSchema), automationController.disableRule.bind(automationController));

router.get('/runs', requirePermission(PERMISSIONS.AUTOMATION_VIEW), automationController.listRuns.bind(automationController));
router.post('/runs/:id/retry', requirePermission(PERMISSIONS.AUTOMATION_RUN), validate(automationIdSchema), automationController.retryRun.bind(automationController));
router.get('/reminders', requirePermission(PERMISSIONS.AUTOMATION_VIEW), automationController.listReminders.bind(automationController));
router.post('/reminders/:id/cancel', requirePermission(PERMISSIONS.AUTOMATION_UPDATE), validate(automationIdSchema), automationController.cancelReminder.bind(automationController));
router.post('/seed-defaults', requirePermission(PERMISSIONS.AUTOMATION_RUN), automationController.seedDefaults.bind(automationController));
router.post('/test-trigger', requirePermission(PERMISSIONS.AUTOMATION_RUN), validate(testTriggerSchema), automationController.testTrigger.bind(automationController));

export default router;
