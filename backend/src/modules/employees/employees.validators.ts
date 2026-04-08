import { z } from 'zod';
import {
    CANADIAN_PHONE_VALIDATION_MESSAGE,
    CANADIAN_POSTAL_CODE_VALIDATION_MESSAGE,
    EMAIL_VALIDATION_MESSAGE,
    PERSON_NAME_VALIDATION_MESSAGE,
    isValidCanadianPhoneNumber,
    isValidCanadianPostalCode,
    isValidEmailAddress,
    isValidPersonName,
} from '@contracts/contact';

const employmentStatusSchema = z.enum(['active', 'inactive', 'on-leave', 'probation']);
const employmentTypeSchema = z.enum(['full-time', 'part-time', 'contract', 'intern']);

const employeeAddressSchema = z.object({
    street: z.string().max(200).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    zipCode: z.string().trim().max(30).refine(isValidCanadianPostalCode, CANADIAN_POSTAL_CODE_VALIDATION_MESSAGE).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
});

const emergencyContactSchema = z.object({
    name: z.string().trim().max(100).refine(isValidPersonName, `Emergency contact name ${PERSON_NAME_VALIDATION_MESSAGE}`).optional().nullable(),
    relationship: z.string().max(100).optional().nullable(),
    phone: z.string().trim().max(50).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
});

export const createEmployeeSchema = z.object({
    body: z.object({
        userId: z.string().uuid(),
        employeeCode: z.string().max(50).optional(),
        employeeNumber: z.string().max(50).optional(),
        department: z.string().max(100).optional().nullable(),
        position: z.string().max(100).optional().nullable(),
        hireDate: z.string().datetime().optional().nullable(),
        phone: z.string().trim().max(50).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        salary: z.coerce.number().min(0).optional().nullable(),
        employmentStatus: employmentStatusSchema.optional(),
        employmentType: employmentTypeSchema.optional(),
        skills: z.array(z.string().max(100)).optional(),
        address: employeeAddressSchema.optional().nullable(),
        emergencyContact: emergencyContactSchema.optional().nullable(),
        isActive: z.boolean().default(true),
    }),
});

export const updateEmployeeSchema = z.object({
    body: z.object({
        firstName: z.string().trim().min(1).max(100).refine(isValidPersonName, `First name ${PERSON_NAME_VALIDATION_MESSAGE}`).optional(),
        lastName: z.string().trim().min(1).max(100).refine(isValidPersonName, `Last name ${PERSON_NAME_VALIDATION_MESSAGE}`).optional(),
        email: z.string().trim().refine(isValidEmailAddress, EMAIL_VALIDATION_MESSAGE).optional(),
        phone: z.string().trim().max(50).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        roleId: z.string().uuid().optional(),
        employeeCode: z.string().max(50).optional(),
        employeeNumber: z.string().max(50).optional(),
        department: z.string().max(100).optional().nullable(),
        position: z.string().max(100).optional().nullable(),
        hireDate: z.string().datetime().optional().nullable(),
        salary: z.coerce.number().min(0).optional().nullable(),
        employmentStatus: employmentStatusSchema.optional(),
        employmentType: employmentTypeSchema.optional(),
        skills: z.array(z.string().max(100)).optional(),
        address: employeeAddressSchema.optional().nullable(),
        emergencyContact: emergencyContactSchema.optional().nullable(),
        isActive: z.boolean().optional(),
    }),
});

export const createPortalAccessSchema = z.object({
    body: z.object({
        email: z.string().trim().refine(isValidEmailAddress, EMAIL_VALIDATION_MESSAGE).refine((value) => value.endsWith('@zodo.ca'), {
            message: 'Portal email must end with @zodo.ca',
        }),
        password: z.string().min(8).max(128),
        firstName: z.string().trim().min(1).max(100).refine(isValidPersonName, `First name ${PERSON_NAME_VALIDATION_MESSAGE}`),
        lastName: z.string().trim().min(1).max(100).refine(isValidPersonName, `Last name ${PERSON_NAME_VALIDATION_MESSAGE}`),
        phone: z.string().trim().max(50).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        position: z.string().max(100).optional().nullable(),
        department: z.string().max(100).optional().nullable(),
        hireDate: z.string().datetime().optional().nullable(),
        salary: z.coerce.number().min(0).optional().nullable(),
        employmentStatus: employmentStatusSchema.optional(),
        employmentType: employmentTypeSchema.optional(),
        skills: z.array(z.string().max(100)).optional(),
        address: employeeAddressSchema.optional().nullable(),
        emergencyContact: emergencyContactSchema.optional().nullable(),
    }),
});

export const employeeQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(200).default(20),
        search: z.string().optional(),
        isActive: z.coerce.boolean().optional(),
        department: z.string().optional(),
        sortBy: z.enum(['createdAt', 'hireDate', 'position']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const employeeIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});

const departmentBodySchema = z.object({
    name: z.string().trim().min(2).max(100),
    code: z.string().trim().min(2).max(5).transform((value) => value.toUpperCase()),
    description: z.string().trim().min(10).max(500),
    headId: z.string().optional().nullable(),
    budget: z.coerce.number().min(0),
    color: z.string().trim().min(1).max(20),
    isActive: z.boolean().optional(),
});

export const createDepartmentSchema = z.object({
    body: departmentBodySchema,
});

export const updateDepartmentSchema = z.object({
    body: departmentBodySchema.partial(),
});

export const departmentIdSchema = z.object({
    params: z.object({ departmentId: z.string().min(1) }),
});

const isoDateString = z.string().datetime();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date in YYYY-MM-DD format');
const leaveTypeSchema = z.enum(['annual', 'sick', 'personal', 'unpaid']);

export const attendanceQuerySchema = z.object({
    query: z.object({
        dateFrom: isoDateString.optional(),
        dateTo: isoDateString.optional(),
        employeeId: z.string().uuid().optional(),
    }),
});

export const attendanceIdSchema = z.object({
    params: z.object({ attendanceId: z.string().uuid() }),
});

export const checkInAttendanceSchema = z.object({
    body: z.object({
        isRemote: z.boolean().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        accuracy: z.number().nonnegative().max(5000).optional(),
        capturedAt: isoDateString.optional(),
    }).optional().default({}),
});

export const checkOutAttendanceSchema = z.object({
    body: z.object({
        lat: z.number().optional(),
        lng: z.number().optional(),
        accuracy: z.number().nonnegative().max(5000).optional(),
        capturedAt: isoDateString.optional(),
        notes: z.string().max(2000).optional().nullable(),
    }).optional().default({}),
});

export const attendanceLocationSyncSchema = z.object({
    body: z.object({
        lat: z.number(),
        lng: z.number(),
        accuracy: z.number().nonnegative().max(5000).optional(),
        capturedAt: isoDateString.optional(),
    }),
});

export const updateAttendanceSchema = z.object({
    body: z.object({
        startTime: isoDateString.optional(),
        endTime: isoDateString.optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
        isRemote: z.boolean().optional(),
    }).refine(
        (value) => Object.keys(value).length > 0,
        'At least one attendance field is required',
    ),
});

export const leaveRequestIdSchema = z.object({
    params: z.object({ leaveRequestId: z.string().uuid() }),
});

export const createLeaveRequestSchema = z.object({
    body: z.object({
        leaveType: leaveTypeSchema,
        startDate: dateString,
        endDate: dateString,
        reason: z.string().trim().min(10).max(2000),
    }),
});

export const reviewLeaveRequestSchema = z.object({
    body: z.object({
        status: z.enum(['approved', 'rejected']),
        reviewNote: z.string().trim().max(2000).optional().nullable(),
    }),
});
