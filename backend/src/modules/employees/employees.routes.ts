import { Router, Request, Response, NextFunction } from 'express';
import { employeesController } from './employees.controller';
import { employeesService } from './employees.service';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requireOwnershipOrPermission, requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import {
    createEmployeeSchema,
    updateEmployeeSchema,
    employeeQuerySchema,
    employeeIdSchema,
    createDepartmentSchema,
    updateDepartmentSchema,
    departmentIdSchema,
    createPortalAccessSchema,
    attendanceQuerySchema,
    attendanceIdSchema,
    checkInAttendanceSchema,
    checkOutAttendanceSchema,
    updateAttendanceSchema,
} from './employees.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/attendance/my', validate(attendanceQuerySchema), employeesController.getMyAttendance.bind(employeesController));
router.get('/attendance/summary/my', validate(attendanceQuerySchema), employeesController.getMyAttendanceSummary.bind(employeesController));
router.get('/', requirePermission(PERMISSIONS.EMPLOYEES_VIEW), validate(employeeQuerySchema), employeesController.getMany.bind(employeesController));
router.post('/', requirePermission(PERMISSIONS.EMPLOYEES_CREATE), validate(createEmployeeSchema), employeesController.create.bind(employeesController));
router.get('/attendance', requirePermission(PERMISSIONS.EMPLOYEES_VIEW), validate(attendanceQuerySchema), employeesController.getAttendance.bind(employeesController));
router.get('/attendance/summary', requirePermission(PERMISSIONS.EMPLOYEES_VIEW), validate(attendanceQuerySchema), employeesController.getAttendanceSummary.bind(employeesController));
router.get('/attendance/current', employeesController.getCurrentAttendance.bind(employeesController));
router.post('/attendance/check-in', validate(checkInAttendanceSchema), employeesController.checkInAttendance.bind(employeesController));
router.post('/attendance/check-out', validate(checkOutAttendanceSchema), employeesController.checkOutAttendance.bind(employeesController));
router.post('/attendance/break/start', employeesController.startAttendanceBreak.bind(employeesController));
router.post('/attendance/break/end', employeesController.endAttendanceBreak.bind(employeesController));
router.put(
    '/attendance/:attendanceId',
    validate(attendanceIdSchema),
    validate(updateAttendanceSchema),
    requireOwnershipOrPermission(PERMISSIONS.EMPLOYEES_UPDATE, async (req: Request) =>
        employeesService.getAttendanceOwnerId(req.params.attendanceId, req.context.tenantId)),
    employeesController.updateAttendance.bind(employeesController),
);
router.get('/departments', requirePermission(PERMISSIONS.EMPLOYEES_VIEW), employeesController.getDepartments.bind(employeesController));
router.post('/departments', requirePermission(PERMISSIONS.EMPLOYEES_CREATE), validate(createDepartmentSchema), employeesController.createDepartment.bind(employeesController));
router.put('/departments/:departmentId', requirePermission(PERMISSIONS.EMPLOYEES_UPDATE), validate(departmentIdSchema), validate(updateDepartmentSchema), employeesController.updateDepartment.bind(employeesController));
router.delete('/departments/:departmentId', requirePermission(PERMISSIONS.EMPLOYEES_DELETE), validate(departmentIdSchema), employeesController.deleteDepartment.bind(employeesController));

// Create crew portal access (User + Employee in same tenant)
router.post('/create-portal-access', requirePermission(PERMISSIONS.EMPLOYEES_CREATE), validate(createPortalAccessSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = (req as any).context?.tenantId;
        const {
            email,
            password,
            firstName,
            lastName,
            phone,
            position,
            department,
            hireDate,
            salary,
            employmentStatus,
            employmentType,
            skills,
            address,
            emergencyContact,
        } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ success: false, message: 'email, password, firstName, and lastName are required' });
        }

        const result = await employeesService.createPortalAccess(tenantId, {
            email,
            password,
            firstName,
            lastName,
            phone,
            position,
            department,
            hireDate,
            salary,
            employmentStatus,
            employmentType,
            skills,
            address,
            emergencyContact,
        });

        return res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

router.get('/:id', requirePermission(PERMISSIONS.EMPLOYEES_VIEW), validate(employeeIdSchema), employeesController.getById.bind(employeesController));
router.put('/:id', requirePermission(PERMISSIONS.EMPLOYEES_UPDATE), validate(employeeIdSchema), validate(updateEmployeeSchema), employeesController.update.bind(employeesController));
router.delete('/:id', requirePermission(PERMISSIONS.EMPLOYEES_DELETE), validate(employeeIdSchema), employeesController.delete.bind(employeesController));

// Data-level access management
router.get('/:id/access', requirePermission(PERMISSIONS.EMPLOYEES_VIEW), validate(employeeIdSchema), employeesController.getAccess.bind(employeesController));
router.put('/:id/access', requirePermission(PERMISSIONS.EMPLOYEES_UPDATE), validate(employeeIdSchema), employeesController.setAccess.bind(employeesController));

export default router;
