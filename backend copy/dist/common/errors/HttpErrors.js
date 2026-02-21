"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUnavailableError = exports.InternalServerError = exports.TooManyRequestsError = exports.ValidationError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = void 0;
const AppError_1 = require("./AppError");
class BadRequestError extends AppError_1.AppError {
    constructor(message = 'Bad Request', code = 'BAD_REQUEST', details) {
        super(message, 400, code, true, details);
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends AppError_1.AppError {
    constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
        super(message, 401, code, true);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError_1.AppError {
    constructor(message = 'Forbidden', code = 'FORBIDDEN') {
        super(message, 403, code, true);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError_1.AppError {
    constructor(message = 'Not Found', code = 'NOT_FOUND') {
        super(message, 404, code, true);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError_1.AppError {
    constructor(message = 'Conflict', code = 'CONFLICT') {
        super(message, 409, code, true);
    }
}
exports.ConflictError = ConflictError;
class ValidationError extends AppError_1.AppError {
    constructor(message = 'Validation Error', details) {
        super(message, 422, 'VALIDATION_ERROR', true, details);
    }
}
exports.ValidationError = ValidationError;
class TooManyRequestsError extends AppError_1.AppError {
    constructor(message = 'Too Many Requests') {
        super(message, 429, 'TOO_MANY_REQUESTS', true);
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
class InternalServerError extends AppError_1.AppError {
    constructor(message = 'Internal Server Error') {
        super(message, 500, 'INTERNAL_SERVER_ERROR', false);
    }
}
exports.InternalServerError = InternalServerError;
class ServiceUnavailableError extends AppError_1.AppError {
    constructor(message = 'Service Unavailable') {
        super(message, 503, 'SERVICE_UNAVAILABLE', true);
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
//# sourceMappingURL=HttpErrors.js.map