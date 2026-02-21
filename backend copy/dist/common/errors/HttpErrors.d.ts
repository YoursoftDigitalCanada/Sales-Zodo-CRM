import { AppError } from './AppError';
export declare class BadRequestError extends AppError {
    constructor(message?: string, code?: string, details?: Record<string, any>);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class ConflictError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class ValidationError extends AppError {
    constructor(message?: string, details?: Record<string, any>);
}
export declare class TooManyRequestsError extends AppError {
    constructor(message?: string);
}
export declare class InternalServerError extends AppError {
    constructor(message?: string);
}
export declare class ServiceUnavailableError extends AppError {
    constructor(message?: string);
}
//# sourceMappingURL=HttpErrors.d.ts.map