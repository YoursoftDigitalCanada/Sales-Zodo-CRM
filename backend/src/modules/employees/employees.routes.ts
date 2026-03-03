import { Router, Request, Response, NextFunction } from 'express';
import { employeesController } from './employees.controller';
import { employeesService } from './employees.service';
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

// Create crew portal access (User + Employee in same tenant)
router.post('/create-portal-access', requirePermission(PERMISSIONS.EMPLOYEES_CREATE), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = (req as any).tenantId;
        const { email, password, firstName, lastName, position, department } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ success: false, message: 'email, password, firstName, and lastName are required' });
        }

        const result = await employeesService.createPortalAccess(tenantId, {
            email, password, firstName, lastName, position, department,
        });

        return res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

router.get('/:id', requirePermission(PERMISSIONS.EMPLOYEES_VIEW), validate(employeeIdSchema), employeesController.getById.bind(employeesController));
router.put('/:id', requirePermission(PERMISSIONS.EMPLOYEES_UPDATE), validate(employeeIdSchema), validate(updateEmployeeSchema), employeesController.update.bind(employeesController));
router.delete('/:id', requirePermission(PERMISSIONS.EMPLOYEES_DELETE), validate(employeeIdSchema), employeesController.delete.bind(employeesController));

export default router;
