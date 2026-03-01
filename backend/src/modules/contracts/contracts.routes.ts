import { Router } from 'express';
import { contractsController } from './contracts.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validateQuery, validateBody } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createContractSchema, updateContractSchema, contractQuerySchema, updateContractStatusSchema } from './contracts.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.CONTRACTS_VIEW), validateQuery(contractQuerySchema), contractsController.getMany.bind(contractsController));
router.post('/', requirePermission(PERMISSIONS.CONTRACTS_CREATE), validateBody(createContractSchema), contractsController.create.bind(contractsController));
router.get('/:id', requirePermission(PERMISSIONS.CONTRACTS_VIEW), contractsController.getById.bind(contractsController));
router.put('/:id', requirePermission(PERMISSIONS.CONTRACTS_UPDATE), validateBody(updateContractSchema), contractsController.update.bind(contractsController));
router.delete('/:id', requirePermission(PERMISSIONS.CONTRACTS_DELETE), contractsController.delete.bind(contractsController));
router.patch('/:id/status', requirePermission(PERMISSIONS.CONTRACTS_UPDATE), validateBody(updateContractStatusSchema), contractsController.updateStatus.bind(contractsController));

export default router;
