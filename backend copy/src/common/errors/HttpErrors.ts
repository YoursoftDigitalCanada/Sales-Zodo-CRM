import { AppError } from './AppError';

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', code: string = 'BAD_REQUEST', details?: Record<string, any>) {
    super(message, 400, code, true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    super(message, 401, code, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code: string = 'FORBIDDEN') {
    super(message, 403, code, true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found', code: string = 'NOT_FOUND') {
    super(message, 404, code, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', code: string = 'CONFLICT') {
    super(message, 409, code, true);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation Error', details?: Record<string, any>) {
    super(message, 422, 'VALIDATION_ERROR', true, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too Many Requests') {
    super(message, 429, 'TOO_MANY_REQUESTS', true);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR', false);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service Unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE', true);
  }
}