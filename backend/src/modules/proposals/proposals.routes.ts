import { Router } from 'express';
import { proposalsController } from './proposals.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validateQuery, validateBody } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createProposalSchema, updateProposalSchema, proposalQuerySchema } from './proposals.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

// CRUD
router.get('/', requirePermission(PERMISSIONS.QUOTES_VIEW), validateQuery(proposalQuerySchema), proposalsController.getMany.bind(proposalsController));
router.post('/', requirePermission(PERMISSIONS.QUOTES_CREATE), validateBody(createProposalSchema), proposalsController.create.bind(proposalsController));
router.get('/:id', requirePermission(PERMISSIONS.QUOTES_VIEW), proposalsController.getById.bind(proposalsController));
router.put('/:id', requirePermission(PERMISSIONS.QUOTES_UPDATE), validateBody(updateProposalSchema), proposalsController.update.bind(proposalsController));
router.delete('/:id', requirePermission(PERMISSIONS.QUOTES_DELETE), proposalsController.delete.bind(proposalsController));

// PDF operations
router.get('/:id/pdf', requirePermission(PERMISSIONS.QUOTES_VIEW), proposalsController.downloadPdf.bind(proposalsController));
router.post('/:id/regenerate', requirePermission(PERMISSIONS.QUOTES_UPDATE), proposalsController.regeneratePdf.bind(proposalsController));

// Stage 4: Send proposal to lead
router.post('/:id/send', requirePermission(PERMISSIONS.QUOTES_UPDATE), proposalsController.send.bind(proposalsController));

export default router;
