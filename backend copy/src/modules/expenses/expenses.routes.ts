import { Router } from 'express';
import { expensesController } from './expenses.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createExpenseSchema, updateExpenseSchema, expenseQuerySchema, expenseIdSchema } from './expenses.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.EXPENSES_VIEW), validate(expenseQuerySchema), expensesController.getMany.bind(expensesController));
router.post('/', requirePermission(PERMISSIONS.EXPENSES_CREATE), validate(createExpenseSchema), expensesController.create.bind(expensesController));
router.get('/:id', requirePermission(PERMISSIONS.EXPENSES_VIEW), validate(expenseIdSchema), expensesController.getById.bind(expensesController));
router.put('/:id', requirePermission(PERMISSIONS.EXPENSES_UPDATE), validate(expenseIdSchema), validate(updateExpenseSchema), expensesController.update.bind(expensesController));
router.patch('/:id/approve', requirePermission(PERMISSIONS.EXPENSES_APPROVE), validate(expenseIdSchema), expensesController.approve.bind(expensesController));
router.delete('/:id', requirePermission(PERMISSIONS.EXPENSES_DELETE), validate(expenseIdSchema), expensesController.delete.bind(expensesController));

export default router;
