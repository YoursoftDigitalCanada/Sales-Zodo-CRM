import cors, { CorsOptions, CorsOptionsDelegate } from 'cors';
import { Request } from 'express';
import { config } from '../../config';
import { logger } from '../utils/logger';

// ============================================================================
// ALLOWED ORIGINS CONFIGURATION
// ============================================================================

/**
 * List of allowed origins
 * In production, this should be strictly controlled
 */
const getAllowedOrigins = (): string[] => {
  const origins: string[] = [];

  // Add frontend URL from config
  if (config.frontend.url) {
    origins.push(config.frontend.url);
  }

  // Add additional origins based on environment
  if (config.app.isDevelopment) {
    origins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite default
      'http://localhost:5174',
      'http://localhost:8080', // Vite alternate port
      'http://localhost:4200', // Angular default
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
    );
  }

  // Production portals
  origins.push(
    'https://admin.zodo.ca',
    'https://crm.zodo.ca',
    'https://crew.zodo.ca',
  );

  // Parse additional origins from environment variable if provided
  const additionalOrigins = process.env.ADDITIONAL_CORS_ORIGINS;
  if (additionalOrigins) {
    const parsed = additionalOrigins.split(',').map((o) => o.trim()).filter(Boolean);
    origins.push(...parsed);
  }

  return origins;
};

// ============================================================================
// CORS OPTIONS
// ============================================================================

/**
 * Dynamic origin validation function
 */
const originValidator = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void => {
  const allowedOrigins = getAllowedOrigins();

  // Allow requests with no origin (mobile apps, Postman, curl, etc.)
  if (!origin) {
    // In production, you might want to be more strict
    if (config.app.isProduction) {
      logger.debug('CORS: Request with no origin in production');
    }
    return callback(null, true);
  }

  // Check if origin is allowed
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  // Check for wildcard subdomains (e.g., *.example.com)
  const isSubdomainAllowed = allowedOrigins.some((allowed) => {
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain) || origin.endsWith(`.${domain}`);
    }
    return false;
  });

  if (isSubdomainAllowed) {
    return callback(null, true);
  }

  // In development, log blocked origins for debugging
  if (config.app.isDevelopment) {
    logger.warn(`CORS: Blocked origin - ${origin}`);
    logger.debug(`CORS: Allowed origins - ${allowedOrigins.join(', ')}`);
  }

  // Reject the request
  callback(new Error(`Origin ${origin} not allowed by CORS policy`));
};

/**
 * Default CORS options
 */
export const corsOptions: CorsOptions = {
  origin: originValidator,

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],

  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Request-ID',
    'X-Tenant-ID',
    'X-API-Key',
    'X-User-Timezone',
    'X-User-Locale',
    'Cache-Control',
    'Pragma',
  ],

  // Headers exposed to the client
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Content-Disposition',
    'Content-Length',
  ],

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Preflight cache duration (in seconds)
  maxAge: 86400, // 24 hours

  // Pass preflight response to next handler
  preflightContinue: false,

  // Return 204 for OPTIONS requests
  optionsSuccessStatus: 204,
};

/**
 * Strict CORS options for sensitive endpoints
 */
export const strictCorsOptions: CorsOptions = {
  ...corsOptions,
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Don't allow requests without origin in strict mode
    if (!origin) {
      return callback(new Error('Origin header required'));
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error(`Origin ${origin} not allowed`));
  },
  credentials: true,
};

/**
 * Open CORS options for public APIs
 */
export const openCorsOptions: CorsOptions = {
  origin: '*',
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  exposedHeaders: ['Content-Length'],
  credentials: false,
  maxAge: 86400,
};

// ============================================================================
// CORS MIDDLEWARE EXPORTS
// ============================================================================

/**
 * Default CORS middleware
 */
export const corsMiddleware = cors(corsOptions);

/**
 * Strict CORS middleware for sensitive endpoints
 */
export const strictCorsMiddleware = cors(strictCorsOptions);

/**
 * Open CORS middleware for public endpoints
 */
export const openCorsMiddleware = cors(openCorsOptions);

/**
 * Dynamic CORS middleware factory
 * Creates CORS middleware with custom options
 */
export function createCorsMiddleware(options: Partial<CorsOptions> = {}) {
  return cors({
    ...corsOptions,
    ...options,
  });
}

/**
 * Per-route CORS configuration
 * Allows different CORS settings for different routes
 */
export const dynamicCorsMiddleware = (
  req: Request,
  callback: (err: Error | null, options?: CorsOptions) => void
) => {
  let options: CorsOptions;

  // Determine CORS options based on route or other factors
  const path = req.path.toLowerCase();

  if (path.startsWith('/api/public') || path.startsWith('/api/webhook')) {
    // Public endpoints - more permissive
    options = openCorsOptions;
  } else if (path.startsWith('/api/auth') || path.startsWith('/api/admin')) {
    // Sensitive endpoints - more strict
    options = strictCorsOptions;
  } else {
    // Default options
    options = corsOptions;
  }

  callback(null, options);
};

/**
 * Tenant-specific CORS middleware
 * Allows tenant-specific origin configuration
 */
export async function tenantCorsMiddleware(
  req: Request,
  callback: (err: Error | null, options?: CorsOptions) => void
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      // No tenant context, use default options
      return callback(null, corsOptions);
    }

    // In a real implementation, you might fetch tenant-specific CORS settings
    // from the database or cache
    // const tenantSettings = await getTenantCorsSettings(tenantId);

    // For now, use default options
    callback(null, corsOptions);
  } catch (error) {
    logger.error('Error in tenant CORS middleware', { error });
    callback(null, corsOptions);
  }
}

// ============================================================================
// CORS UTILITIES
// ============================================================================

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string): boolean {
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check wildcard subdomains
  return allowedOrigins.some((allowed) => {
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain) || origin.endsWith(`.${domain}`);
    }
    return false;
  });
}

/**
 * Get all currently allowed origins
 */
export function listAllowedOrigins(): string[] {
  return getAllowedOrigins();
}

/**
 * Add a dynamic origin at runtime
 * Useful for adding tenant-specific domains
 */
const dynamicOrigins: Set<string> = new Set();

export function addDynamicOrigin(origin: string): void {
  dynamicOrigins.add(origin);
  logger.info(`CORS: Added dynamic origin - ${origin}`);
}

export function removeDynamicOrigin(origin: string): void {
  dynamicOrigins.delete(origin);
  logger.info(`CORS: Removed dynamic origin - ${origin}`);
}

export function getDynamicOrigins(): string[] {
  return Array.from(dynamicOrigins);
}

// ============================================================================
// CORS ERROR HANDLER
// ============================================================================

/**
 * CORS error handler middleware
 * Provides better error messages for CORS failures
 */
export function corsErrorHandler(
  err: Error,
  req: Request,
  res: any,
  next: any
): void {
  if (err.message.includes('CORS') || err.message.includes('Origin')) {
    logger.warn('CORS error', {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      error: err.message,
    });

    res.status(403).json({
      success: false,
      message: 'Cross-Origin Request Blocked',
      code: 'CORS_ERROR',
      details: config.app.isDevelopment ? err.message : undefined,
    });
    return;
  }

  next(err);
}

// ============================================================================
// PREFLIGHT HANDLER
// ============================================================================

/**
 * Handle preflight requests explicitly
 * Useful when you need custom preflight logic
 */
export function handlePreflight(req: Request, res: any, next: any): void {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;

    if (origin && isOriginAllowed(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', (corsOptions.methods as string[])?.join(', '));
      res.header('Access-Control-Allow-Headers', (corsOptions.allowedHeaders as string[])?.join(', '));
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', String(corsOptions.maxAge));
      res.status(204).end();
      return;
    }

    res.status(403).json({
      success: false,
      message: 'CORS preflight check failed',
      code: 'CORS_PREFLIGHT_FAILED',
    });
    return;
  }

  next();
}
