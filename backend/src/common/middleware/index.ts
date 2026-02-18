// Authentication
export {
  authenticate,
  optionalAuthenticate,
  loadEmployee,
  authenticateWithEmployee,
} from './auth.middleware';

// Tenant
export {
  tenantContext,
  tenantFromSlug,
  validateTenantAccess,
  withTenantScope,
  createTenantScope,
} from './tenant.middleware';

// Permissions
export {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireAnyRole,
  requireAdmin,
  requireOwner,
  hasPermission,
  requireOwnershipOrPermission,
} from './permission.middleware';

// Validation
export {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  paginationSchema,
  idParamSchema,
  searchSchema,
} from './validate.middleware';

// Error Handling
export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
} from './errorHandler.middleware';

// Rate Limiting
export {
  defaultRateLimiter,
  rateLimiter,
  strictRateLimiter,
  apiRateLimiter,
  uploadRateLimiter,
} from './rateLimiter.middleware';

// Request Logging
export {
  requestLogger,
  requestId,
  requestTiming,
} from './requestLogger.middleware';

// Note: Upload middleware exports removed - functions not implemented yet
// TODO: Implement file upload middleware when needed


// CORS
export {
  corsMiddleware,
  strictCorsMiddleware,
  openCorsMiddleware,
  createCorsMiddleware,
  dynamicCorsMiddleware,
  tenantCorsMiddleware,
  corsOptions,
  strictCorsOptions,
  openCorsOptions,
  isOriginAllowed,
  listAllowedOrigins,
  addDynamicOrigin,
  removeDynamicOrigin,
  corsErrorHandler,
  handlePreflight,
} from './cors.middleware';