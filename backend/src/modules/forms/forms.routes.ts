import { Router } from 'express';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { formsController } from './forms.controller';
import {
  createFormSchema,
  formIdSchema,
  formQuerySchema,
  submissionIdSchema,
  submissionQuerySchema,
  updateFormSchema,
} from './forms.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

router.get('/analytics/summary', requirePermission(PERMISSIONS.FORMS_ANALYTICS_VIEW), formsController.summary.bind(formsController));
router.get('/', requirePermission(PERMISSIONS.FORMS_VIEW), validate(formQuerySchema), formsController.getMany.bind(formsController));
router.post('/', requirePermission(PERMISSIONS.FORMS_CREATE), validate(createFormSchema), formsController.create.bind(formsController));
router.get('/:id', requirePermission(PERMISSIONS.FORMS_VIEW), validate(formIdSchema), formsController.getById.bind(formsController));
router.patch('/:id', requirePermission(PERMISSIONS.FORMS_UPDATE), validate(formIdSchema), validate(updateFormSchema), formsController.update.bind(formsController));
router.post('/:id/duplicate', requirePermission(PERMISSIONS.FORMS_CREATE), validate(formIdSchema), formsController.duplicate.bind(formsController));
router.post('/:id/publish', requirePermission(PERMISSIONS.FORMS_PUBLISH), validate(formIdSchema), formsController.publish.bind(formsController));
router.post('/:id/archive', requirePermission(PERMISSIONS.FORMS_UPDATE), validate(formIdSchema), formsController.archive.bind(formsController));
router.delete('/:id', requirePermission(PERMISSIONS.FORMS_DELETE), validate(formIdSchema), formsController.delete.bind(formsController));
router.get('/:id/submissions', requirePermission(PERMISSIONS.FORMS_SUBMISSIONS_VIEW), validate(formIdSchema), validate(submissionQuerySchema), formsController.submissions.bind(formsController));
router.get('/:id/submissions/export', requirePermission(PERMISSIONS.FORMS_SUBMISSIONS_VIEW), validate(formIdSchema), formsController.exportSubmissions.bind(formsController));
router.get('/:id/submissions/:submissionId', requirePermission(PERMISSIONS.FORMS_SUBMISSIONS_VIEW), validate(submissionIdSchema), formsController.submission.bind(formsController));
router.delete('/:id/submissions/:submissionId', requirePermission(PERMISSIONS.FORMS_DELETE), validate(submissionIdSchema), formsController.deleteSubmission.bind(formsController));
router.get('/:id/analytics', requirePermission(PERMISSIONS.FORMS_ANALYTICS_VIEW), validate(formIdSchema), formsController.analytics.bind(formsController));

export default router;
