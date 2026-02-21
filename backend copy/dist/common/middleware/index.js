"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsErrorHandler = exports.removeDynamicOrigin = exports.addDynamicOrigin = exports.listAllowedOrigins = exports.isOriginAllowed = exports.openCorsOptions = exports.strictCorsOptions = exports.corsOptions = exports.tenantCorsMiddleware = exports.dynamicCorsMiddleware = exports.createCorsMiddleware = exports.openCorsMiddleware = exports.strictCorsMiddleware = exports.corsMiddleware = exports.requestTiming = exports.requestId = exports.requestLogger = exports.uploadRateLimiter = exports.apiRateLimiter = exports.strictRateLimiter = exports.rateLimiter = exports.defaultRateLimiter = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = exports.searchSchema = exports.idParamSchema = exports.paginationSchema = exports.validateParams = exports.validateQuery = exports.validateBody = exports.validate = exports.requireOwnershipOrPermission = exports.hasPermission = exports.requireOwner = exports.requireAdmin = exports.requireAnyRole = exports.requireRole = exports.requireAllPermissions = exports.requireAnyPermission = exports.requirePermission = exports.createTenantScope = exports.withTenantScope = exports.validateTenantAccess = exports.tenantFromSlug = exports.tenantContext = exports.authenticateWithEmployee = exports.loadEmployee = exports.optionalAuthenticate = exports.authenticate = void 0;
exports.handlePreflight = void 0;
// Authentication
var auth_middleware_1 = require("./auth.middleware");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return auth_middleware_1.authenticate; } });
Object.defineProperty(exports, "optionalAuthenticate", { enumerable: true, get: function () { return auth_middleware_1.optionalAuthenticate; } });
Object.defineProperty(exports, "loadEmployee", { enumerable: true, get: function () { return auth_middleware_1.loadEmployee; } });
Object.defineProperty(exports, "authenticateWithEmployee", { enumerable: true, get: function () { return auth_middleware_1.authenticateWithEmployee; } });
// Tenant
var tenant_middleware_1 = require("./tenant.middleware");
Object.defineProperty(exports, "tenantContext", { enumerable: true, get: function () { return tenant_middleware_1.tenantContext; } });
Object.defineProperty(exports, "tenantFromSlug", { enumerable: true, get: function () { return tenant_middleware_1.tenantFromSlug; } });
Object.defineProperty(exports, "validateTenantAccess", { enumerable: true, get: function () { return tenant_middleware_1.validateTenantAccess; } });
Object.defineProperty(exports, "withTenantScope", { enumerable: true, get: function () { return tenant_middleware_1.withTenantScope; } });
Object.defineProperty(exports, "createTenantScope", { enumerable: true, get: function () { return tenant_middleware_1.createTenantScope; } });
// Permissions
var permission_middleware_1 = require("./permission.middleware");
Object.defineProperty(exports, "requirePermission", { enumerable: true, get: function () { return permission_middleware_1.requirePermission; } });
Object.defineProperty(exports, "requireAnyPermission", { enumerable: true, get: function () { return permission_middleware_1.requireAnyPermission; } });
Object.defineProperty(exports, "requireAllPermissions", { enumerable: true, get: function () { return permission_middleware_1.requireAllPermissions; } });
Object.defineProperty(exports, "requireRole", { enumerable: true, get: function () { return permission_middleware_1.requireRole; } });
Object.defineProperty(exports, "requireAnyRole", { enumerable: true, get: function () { return permission_middleware_1.requireAnyRole; } });
Object.defineProperty(exports, "requireAdmin", { enumerable: true, get: function () { return permission_middleware_1.requireAdmin; } });
Object.defineProperty(exports, "requireOwner", { enumerable: true, get: function () { return permission_middleware_1.requireOwner; } });
Object.defineProperty(exports, "hasPermission", { enumerable: true, get: function () { return permission_middleware_1.hasPermission; } });
Object.defineProperty(exports, "requireOwnershipOrPermission", { enumerable: true, get: function () { return permission_middleware_1.requireOwnershipOrPermission; } });
// Validation
var validate_middleware_1 = require("./validate.middleware");
Object.defineProperty(exports, "validate", { enumerable: true, get: function () { return validate_middleware_1.validate; } });
Object.defineProperty(exports, "validateBody", { enumerable: true, get: function () { return validate_middleware_1.validateBody; } });
Object.defineProperty(exports, "validateQuery", { enumerable: true, get: function () { return validate_middleware_1.validateQuery; } });
Object.defineProperty(exports, "validateParams", { enumerable: true, get: function () { return validate_middleware_1.validateParams; } });
Object.defineProperty(exports, "paginationSchema", { enumerable: true, get: function () { return validate_middleware_1.paginationSchema; } });
Object.defineProperty(exports, "idParamSchema", { enumerable: true, get: function () { return validate_middleware_1.idParamSchema; } });
Object.defineProperty(exports, "searchSchema", { enumerable: true, get: function () { return validate_middleware_1.searchSchema; } });
// Error Handling
var errorHandler_middleware_1 = require("./errorHandler.middleware");
Object.defineProperty(exports, "errorHandler", { enumerable: true, get: function () { return errorHandler_middleware_1.errorHandler; } });
Object.defineProperty(exports, "notFoundHandler", { enumerable: true, get: function () { return errorHandler_middleware_1.notFoundHandler; } });
Object.defineProperty(exports, "asyncHandler", { enumerable: true, get: function () { return errorHandler_middleware_1.asyncHandler; } });
// Rate Limiting
var rateLimiter_middleware_1 = require("./rateLimiter.middleware");
Object.defineProperty(exports, "defaultRateLimiter", { enumerable: true, get: function () { return rateLimiter_middleware_1.defaultRateLimiter; } });
Object.defineProperty(exports, "rateLimiter", { enumerable: true, get: function () { return rateLimiter_middleware_1.rateLimiter; } });
Object.defineProperty(exports, "strictRateLimiter", { enumerable: true, get: function () { return rateLimiter_middleware_1.strictRateLimiter; } });
Object.defineProperty(exports, "apiRateLimiter", { enumerable: true, get: function () { return rateLimiter_middleware_1.apiRateLimiter; } });
Object.defineProperty(exports, "uploadRateLimiter", { enumerable: true, get: function () { return rateLimiter_middleware_1.uploadRateLimiter; } });
// Request Logging
var requestLogger_middleware_1 = require("./requestLogger.middleware");
Object.defineProperty(exports, "requestLogger", { enumerable: true, get: function () { return requestLogger_middleware_1.requestLogger; } });
Object.defineProperty(exports, "requestId", { enumerable: true, get: function () { return requestLogger_middleware_1.requestId; } });
Object.defineProperty(exports, "requestTiming", { enumerable: true, get: function () { return requestLogger_middleware_1.requestTiming; } });
// Note: Upload middleware exports removed - functions not implemented yet
// TODO: Implement file upload middleware when needed
// CORS
var cors_middleware_1 = require("./cors.middleware");
Object.defineProperty(exports, "corsMiddleware", { enumerable: true, get: function () { return cors_middleware_1.corsMiddleware; } });
Object.defineProperty(exports, "strictCorsMiddleware", { enumerable: true, get: function () { return cors_middleware_1.strictCorsMiddleware; } });
Object.defineProperty(exports, "openCorsMiddleware", { enumerable: true, get: function () { return cors_middleware_1.openCorsMiddleware; } });
Object.defineProperty(exports, "createCorsMiddleware", { enumerable: true, get: function () { return cors_middleware_1.createCorsMiddleware; } });
Object.defineProperty(exports, "dynamicCorsMiddleware", { enumerable: true, get: function () { return cors_middleware_1.dynamicCorsMiddleware; } });
Object.defineProperty(exports, "tenantCorsMiddleware", { enumerable: true, get: function () { return cors_middleware_1.tenantCorsMiddleware; } });
Object.defineProperty(exports, "corsOptions", { enumerable: true, get: function () { return cors_middleware_1.corsOptions; } });
Object.defineProperty(exports, "strictCorsOptions", { enumerable: true, get: function () { return cors_middleware_1.strictCorsOptions; } });
Object.defineProperty(exports, "openCorsOptions", { enumerable: true, get: function () { return cors_middleware_1.openCorsOptions; } });
Object.defineProperty(exports, "isOriginAllowed", { enumerable: true, get: function () { return cors_middleware_1.isOriginAllowed; } });
Object.defineProperty(exports, "listAllowedOrigins", { enumerable: true, get: function () { return cors_middleware_1.listAllowedOrigins; } });
Object.defineProperty(exports, "addDynamicOrigin", { enumerable: true, get: function () { return cors_middleware_1.addDynamicOrigin; } });
Object.defineProperty(exports, "removeDynamicOrigin", { enumerable: true, get: function () { return cors_middleware_1.removeDynamicOrigin; } });
Object.defineProperty(exports, "corsErrorHandler", { enumerable: true, get: function () { return cors_middleware_1.corsErrorHandler; } });
Object.defineProperty(exports, "handlePreflight", { enumerable: true, get: function () { return cors_middleware_1.handlePreflight; } });
//# sourceMappingURL=index.js.map