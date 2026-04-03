import { Router } from 'express';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { sessionsController } from './sessions.controller';
import { sessionIdSchema } from './sessions.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

router.get('/', sessionsController.getMany.bind(sessionsController));
router.get('/current-status', sessionsController.getCurrentStatus.bind(sessionsController));
router.delete('/:id', validate(sessionIdSchema), sessionsController.revoke.bind(sessionsController));

export default router;
