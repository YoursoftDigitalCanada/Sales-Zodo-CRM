import { Router } from 'express';
import { employeesController } from './employees.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createEmployeeSchema, updateEmployeeSchema, employeeQuerySchema, employeeIdSchema } from './employees.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.EMPLOYEES_VIEW), validate(employeeQuerySchema), employeesController.getMany.bind(employeesController));
router.post('/', requirePermission(PERMISSIONS.EMPLOYEES_CREATE), validate(createEmployeeSchema), employeesController.create.bind(employeesController));
router.get('/:id', requirePermission(PERMISSIONS.EMPLOYEES_VIEW), validate(employeeIdSchema), employeesController.getById.bind(employeesController));
router.put('/:id', requirePermission(PERMISSIONS.EMPLOYEES_UPDATE), validate(employeeIdSchema), validate(updateEmployeeSchema), employeesController.update.bind(employeesController));
router.delete('/:id', requirePermission(PERMISSIONS.EMPLOYEES_DELETE), validate(employeeIdSchema), employeesController.delete.bind(employeesController));

export default router;
