import { Router } from 'express';
import { quotesController } from './quotes.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validateQuery, validateBody } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createQuoteSchema, updateQuoteSchema, quoteQuerySchema } from './quotes.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.QUOTES_VIEW), validateQuery(quoteQuerySchema), quotesController.getMany.bind(quotesController));
router.post('/', requirePermission(PERMISSIONS.QUOTES_CREATE), validateBody(createQuoteSchema), quotesController.create.bind(quotesController));
router.get('/:id', requirePermission(PERMISSIONS.QUOTES_VIEW), quotesController.getById.bind(quotesController));
router.put('/:id', requirePermission(PERMISSIONS.QUOTES_UPDATE), validateBody(updateQuoteSchema), quotesController.update.bind(quotesController));
router.delete('/:id', requirePermission(PERMISSIONS.QUOTES_DELETE), quotesController.delete.bind(quotesController));
router.patch('/:id/status', requirePermission(PERMISSIONS.QUOTES_UPDATE), quotesController.updateStatus.bind(quotesController));

export default router;
