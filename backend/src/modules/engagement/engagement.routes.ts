import { Router } from 'express';
import { z } from 'zod';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { engagementController } from './engagement.controller';

const router = Router();
const idSchema = z.object({ params: z.object({ id: z.string().uuid() }) }).passthrough();
const bodySchema = z.object({ body: z.object({}).passthrough() }).passthrough();

router.use(authenticate);
router.use(loadEmployee);

router.get('/email-templates', requirePermission(PERMISSIONS.EMAILS_VIEW), engagementController.listTemplates.bind(engagementController));
router.post('/email-templates', requirePermission(PERMISSIONS.EMAILS_SEND), validate(bodySchema), engagementController.createTemplate.bind(engagementController));
router.put('/email-templates/:id', requirePermission(PERMISSIONS.EMAILS_SEND), validate(idSchema), validate(bodySchema), engagementController.updateTemplate.bind(engagementController));

router.get('/sequences', requirePermission(PERMISSIONS.EMAILS_VIEW), engagementController.listSequences.bind(engagementController));
router.post('/sequences', requirePermission(PERMISSIONS.EMAILS_SEND), validate(bodySchema), engagementController.createSequence.bind(engagementController));
router.put('/sequences/:id', requirePermission(PERMISSIONS.EMAILS_SEND), validate(idSchema), validate(bodySchema), engagementController.updateSequence.bind(engagementController));
router.post('/sequences/:id/start', requirePermission(PERMISSIONS.EMAILS_SEND), validate(idSchema), validate(bodySchema), engagementController.startSequence.bind(engagementController));
router.post('/sequences/:id/stop', requirePermission(PERMISSIONS.EMAILS_SEND), validate(idSchema), validate(bodySchema), engagementController.stopSequence.bind(engagementController));

router.get('/calls', requirePermission(PERMISSIONS.TASKS_VIEW), engagementController.listCalls.bind(engagementController));
router.post('/calls', requirePermission(PERMISSIONS.TASKS_CREATE), validate(bodySchema), engagementController.logCall.bind(engagementController));
router.put('/calls/:id', requirePermission(PERMISSIONS.TASKS_UPDATE), validate(idSchema), validate(bodySchema), engagementController.updateCall.bind(engagementController));

router.post('/meetings', requirePermission(PERMISSIONS.CALENDAR_CREATE), validate(bodySchema), engagementController.scheduleMeeting.bind(engagementController));
router.patch('/meetings/:id/complete', requirePermission(PERMISSIONS.CALENDAR_UPDATE), validate(idSchema), validate(bodySchema), engagementController.completeMeeting.bind(engagementController));
router.post('/notes', requirePermission(PERMISSIONS.TASKS_CREATE), validate(bodySchema), engagementController.logNote.bind(engagementController));

export default router;
