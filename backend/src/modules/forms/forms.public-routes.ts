import { Router } from 'express';
import { validate } from '../../common/middleware/validate.middleware';
import { formsController } from './forms.controller';
import { publicFormIdSchema, publicSubmissionSchema } from './forms.validators';

const router = Router();

router.get('/:publicId', validate(publicFormIdSchema), formsController.publicForm.bind(formsController));
router.post('/:publicId/submit', validate(publicFormIdSchema), validate(publicSubmissionSchema), formsController.publicSubmit.bind(formsController));
router.post('/:publicId/view', validate(publicFormIdSchema), formsController.publicView.bind(formsController));
router.get('/:publicId/embed.js', validate(publicFormIdSchema), formsController.embedJs.bind(formsController));

export default router;
