import { Router } from 'express';
import { z } from 'zod';
import { loadEmployee } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { requireAnyPermission, requirePermission } from '../../common/middleware/permission.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { salesAIController } from './sales-ai.controller';

const router = Router();
const bodySchema = z.object({ body: z.object({}).passthrough() }).passthrough();

router.use(loadEmployee);

router.post('/sales-chat', requireAnyPermission([PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.LEADS_VIEW, PERMISSIONS.PROJECTS_VIEW]), validate(bodySchema), salesAIController.salesChat.bind(salesAIController));
router.post('/score-lead', requireAnyPermission([PERMISSIONS.LEADS_VIEW, PERMISSIONS.LEADS_UPDATE]), validate(bodySchema), salesAIController.scoreLead.bind(salesAIController));
router.post('/generate-email', requireAnyPermission([PERMISSIONS.EMAILS_SEND, PERMISSIONS.EMAILS_CREATE, PERMISSIONS.EMAILS_VIEW]), validate(bodySchema), salesAIController.generateEmail.bind(salesAIController));
router.post('/deal-insights', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(bodySchema), salesAIController.dealInsights.bind(salesAIController));
router.post('/summarize-activity', requireAnyPermission([PERMISSIONS.LEADS_VIEW, PERMISSIONS.PROJECTS_VIEW, PERMISSIONS.CLIENTS_VIEW, PERMISSIONS.CONTACTS_VIEW]), validate(bodySchema), salesAIController.summarizeActivity.bind(salesAIController));
router.post('/follow-up-suggestions', requireAnyPermission([PERMISSIONS.LEADS_VIEW, PERMISSIONS.PROJECTS_VIEW]), validate(bodySchema), salesAIController.followUpSuggestions.bind(salesAIController));
router.post('/query-crm', requireAnyPermission([PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.LEADS_VIEW, PERMISSIONS.PROJECTS_VIEW]), validate(bodySchema), salesAIController.queryCRM.bind(salesAIController));

export default router;
