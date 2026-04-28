import { Request, Response, NextFunction } from 'express';
import { employeesService } from './employees.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import { BadRequestError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class EmployeesController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const emp = await employeesService.create(req.context.tenantId, sanitizeBody(req.body));
            sendCreated(res, emp, 'Employee created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await employeesService.getMany(req.context.tenantId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const emp = await employeesService.getById(req.params.id, req.context.tenantId);
            sendSuccess(res, emp);
        } catch (e) { next(e); }
    }

    async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const employeeId = req.context.employeeId || req.user?.employeeId;
            if (!employeeId) {
                throw new BadRequestError(
                    'Your user account is not linked to an employee profile',
                    ErrorCodes.EMPLOYEE_NOT_FOUND,
                );
            }

            const emp = await employeesService.getById(employeeId, req.context.tenantId);
            sendSuccess(res, emp);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const emp = await employeesService.update(req.params.id, req.context.tenantId, sanitizeBody(req.body));
            sendSuccess(res, emp, 'Employee updated');
        } catch (e) { next(e); }
    }

    async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const file = (req as Request & { file?: Express.Multer.File }).file;
            if (!file) {
                throw new BadRequestError('Employee photo is required', ErrorCodes.INVALID_INPUT);
            }

            const publicPath = `/uploads/${req.context.tenantId}/employees/${file.filename}`;
            const employee = await employeesService.updateAvatar(req.params.id, req.context.tenantId, publicPath);
            sendSuccess(res, { employee, avatarUrl: publicPath }, 'Employee photo uploaded');
        } catch (e) { next(e); }
    }

    async uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const file = (req as Request & { file?: Express.Multer.File }).file;
            if (!file) {
                throw new BadRequestError('Employee document is required', ErrorCodes.INVALID_INPUT);
            }

            const publicPath = `/uploads/${req.context.tenantId}/employees/documents/${file.filename}`;
            const document = await employeesService.uploadDocument(req.params.id, req.context.tenantId, {
                name: String(req.body?.name || file.originalname).trim() || file.originalname,
                type: req.body?.type,
                expiryDate: req.body?.expiryDate || null,
                fileUrl: publicPath,
            });

            sendSuccess(res, { document, fileUrl: publicPath }, 'Employee document uploaded');
        } catch (e) { next(e); }
    }

    async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const employeeId = req.context.employeeId || req.user?.employeeId;
            if (!employeeId) {
                throw new BadRequestError(
                    'Your user account is not linked to an employee profile',
                    ErrorCodes.EMPLOYEE_NOT_FOUND,
                );
            }

            const emp = await employeesService.update(employeeId, req.context.tenantId, sanitizeBody(req.body));
            sendSuccess(res, emp, 'Profile updated');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await employeesService.delete(req.params.id, req.context.tenantId);
            sendNoContent(res);
        } catch (e) { next(e); }
    }

    async getAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const access = await employeesService.getAccess(req.params.id, req.context.tenantId);
            sendSuccess(res, access);
        } catch (e) { next(e); }
    }

    async setAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const access = await employeesService.setAccess(req.params.id, req.context.tenantId, sanitizeBody(req.body));
            sendSuccess(res, access, 'Data access updated');
        } catch (e) { next(e); }
    }

    async getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const departments = await employeesService.getDepartments(req.context.tenantId);
            sendSuccess(res, departments);
        } catch (e) { next(e); }
    }

    async getMyDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const departments = await employeesService.getDepartments(req.context.tenantId);
            sendSuccess(res, departments);
        } catch (e) { next(e); }
    }

    async createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const department = await employeesService.createDepartment(req.context.tenantId, sanitizeBody(req.body));
            sendCreated(res, department, 'Department created');
        } catch (e) { next(e); }
    }

    async updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const department = await employeesService.updateDepartment(
                req.params.departmentId,
                req.context.tenantId,
                sanitizeBody(req.body),
            );
            sendSuccess(res, department, 'Department updated');
        } catch (e) { next(e); }
    }

    async deleteDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await employeesService.deleteDepartment(req.params.departmentId, req.context.tenantId);
            sendNoContent(res);
        } catch (e) { next(e); }
    }

    async getAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const records = await employeesService.getAttendance(req.context.tenantId, req.query as any);
            sendSuccess(res, records);
        } catch (e) { next(e); }
    }

    async getMyAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const employeeId = req.context.employeeId || req.user?.employeeId;
            if (!employeeId) {
                sendSuccess(res, []);
                return;
            }

            const records = await employeesService.getAttendance(req.context.tenantId, {
                ...(req.query as any),
                employeeId,
            });
            sendSuccess(res, records);
        } catch (e) { next(e); }
    }

    async getAttendanceSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const summary = await employeesService.getAttendanceSummary(req.context.tenantId, req.query as any);
            sendSuccess(res, summary);
        } catch (e) { next(e); }
    }

    async getMyAttendanceSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const employeeId = req.context.employeeId || req.user?.employeeId;
            if (!employeeId) {
                sendSuccess(res, {
                    totalEmployees: 0,
                    presentCount: 0,
                    absentCount: 0,
                    lateCount: 0,
                    halfDayCount: 0,
                    onLeaveCount: 0,
                    totalWorkingDays: 0,
                    averageCheckIn: null,
                    averageWorkHours: 0,
                    overtimeHours: 0,
                });
                return;
            }

            const summary = await employeesService.getAttendanceSummary(req.context.tenantId, {
                ...(req.query as any),
                employeeId,
            });
            sendSuccess(res, summary);
        } catch (e) { next(e); }
    }

    async getCurrentAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const employeeId = req.context.employeeId || req.user?.employeeId;
            if (!employeeId) {
                sendSuccess(res, {
                    isCheckedIn: false,
                    isOnBreak: false,
                    breakMinutes: 0,
                    activeEntry: null,
                });
                return;
            }

            const status = await employeesService.getCurrentAttendanceStatus(employeeId, req.context.tenantId);
            sendSuccess(res, status);
        } catch (e) { next(e); }
    }

    async checkInAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const employeeId = req.context.employeeId || req.user?.employeeId;
            if (!employeeId) {
                throw new BadRequestError(
                    'Your user account is not linked to an employee profile',
                    ErrorCodes.EMPLOYEE_NOT_FOUND,
                );
            }

            const status = await employeesService.checkInAttendance(employeeId, req.context.tenantId, sanitizeBody(req.body));
            sendSuccess(res, status, 'Checked in successfully');
        } catch (e) { next(e); }
    }

    async checkOutAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const employeeId = req.context.employeeId || req.user?.employeeId;
            if (!employeeId) {
                throw new BadRequestError(
                    'Your user account is not linked to an employee profile',
                    ErrorCodes.EMPLOYEE_NOT_FOUND,
                );
            }

            const status = await employeesService.checkOutAttendance(employeeId, req.context.tenantId, sanitizeBody(req.body));
            sendSuccess(res, status, 'Checked out successfully');
        } catch (e) { next(e); }
    }

    async syncAttendanceLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const employeeId = req.context.employeeId || req.user?.employeeId;
            if (!employeeId) {
                throw new BadRequestError(
                    'Your user account is not linked to an employee profile',
                    ErrorCodes.EMPLOYEE_NOT_FOUND,
                );
            }

            const status = await employeesService.syncAttendanceLocation(employeeId, req.context.tenantId, sanitizeBody(req.body));
            sendSuccess(res, status, 'Attendance location synced successfully');
        } catch (e) { next(e); }
    }

    async startAttendanceBreak(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const employeeId = req.context.employeeId || req.user?.employeeId;
            if (!employeeId) {
                throw new BadRequestError(
                    'Your user account is not linked to an employee profile',
                    ErrorCodes.EMPLOYEE_NOT_FOUND,
                );
            }

            const status = await employeesService.startAttendanceBreak(employeeId, req.context.tenantId);
            sendSuccess(res, status, 'Break started');
        } catch (e) { next(e); }
    }

    async endAttendanceBreak(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const employeeId = req.context.employeeId || req.user?.employeeId;
            if (!employeeId) {
                throw new BadRequestError(
                    'Your user account is not linked to an employee profile',
                    ErrorCodes.EMPLOYEE_NOT_FOUND,
                );
            }

            const status = await employeesService.endAttendanceBreak(employeeId, req.context.tenantId);
            sendSuccess(res, status, 'Break ended');
        } catch (e) { next(e); }
    }

    async updateAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const updated = await employeesService.updateAttendanceRecord(
                req.params.attendanceId,
                req.context.tenantId,
                sanitizeBody(req.body),
            );
            sendSuccess(res, updated, 'Attendance record updated');
        } catch (e) { next(e); }
    }

    async getLeaveRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const requests = await employeesService.getLeaveRequests(req.context.tenantId);
            sendSuccess(res, requests);
        } catch (e) { next(e); }
    }

    async getMyLeaveRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const employeeId = req.context.employeeId || req.user?.employeeId;
            if (!employeeId) {
                sendSuccess(res, []);
                return;
            }

            const requests = await employeesService.getMyLeaveRequests(employeeId, req.context.tenantId);
            sendSuccess(res, requests);
        } catch (e) { next(e); }
    }

    async createLeaveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const employeeId = req.context.employeeId || req.user?.employeeId;
            if (!employeeId) {
                throw new BadRequestError(
                    'Your user account is not linked to an employee profile',
                    ErrorCodes.EMPLOYEE_NOT_FOUND,
                );
            }

            const request = await employeesService.createLeaveRequest(employeeId, req.context.tenantId, sanitizeBody(req.body));
            sendCreated(res, request, 'Leave request submitted');
        } catch (e) { next(e); }
    }

    async reviewLeaveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const reviewerEmployeeId = req.context.employeeId || req.user?.employeeId || null;
            const request = await employeesService.reviewLeaveRequest(
                req.params.leaveRequestId,
                req.context.tenantId,
                reviewerEmployeeId,
                sanitizeBody(req.body),
            );
            sendSuccess(res, request, 'Leave request updated');
        } catch (e) { next(e); }
    }
}

export const employeesController = new EmployeesController();
