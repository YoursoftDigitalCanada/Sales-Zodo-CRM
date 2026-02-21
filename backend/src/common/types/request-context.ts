// src/common/types/request-context.ts
// ============================================================================
// GLOBAL REQUEST CONTEXT
// Single source of truth for authenticated request data across all modules.
// ============================================================================

/**
 * TenantContext — the dedicated, trusted namespace for tenant isolation.
 *
 * Set by `tenantContext` middleware AFTER JWT verification.
 * Controllers should read tenant data from `req.context` exclusively.
 *
 * This is the ONLY trusted source of tenantId — never from req.body/query/params.
 */
export interface TenantContext {
    /** Tenant (workspace) UUID — extracted from verified JWT payload */
    tenantId: string;

    /** Authenticated user's UUID — from JWT */
    userId: string;

    /** Employee UUID within the tenant (from JWT, if user is an employee) */
    employeeId?: string;

    /** Tenant name — cached from DB to avoid redundant lookups */
    tenantName?: string;

    /** Business type — cached from Tenant.settings for AI context */
    businessType?: string;
}

/**
 * RequestContext — attached to every authenticated Express request.
 *
 * All module controllers/services should read tenant isolation data from here
 * instead of accessing raw JWT fields or Prisma models directly.
 *
 * Populated by:
 *   - `authenticate` middleware  → userId, email, tenantId, employeeId
 *   - `loadEmployee` middleware  → role, permissions
 *   - `requestId` middleware     → requestId
 */
export interface RequestContext {
    /** Authenticated user's UUID (from JWT) */
    userId: string;

    /** Tenant (workspace) UUID — required for all data-scoped queries */
    tenantId: string;

    /** User's email address (from JWT) */
    email: string;

    /** Employee UUID within the tenant (from JWT, if user is an employee) */
    employeeId?: string;

    /** Role name resolved by loadEmployee middleware (e.g., "Owner", "Admin", "Member") */
    role?: string;

    /** Unique request trace ID (UUID v4) — for logging, debugging, audit trails */
    requestId: string;
}

/**
 * Minimal context set by the `authenticate` middleware before employee loading.
 * This is the shape available RIGHT AFTER JWT verification.
 */
export interface AuthContext {
    userId: string;
    email: string;
    tenantId?: string;
    employeeId?: string;
}

/**
 * Helper type guard — checks if context has a tenantId (i.e., user belongs to a workspace).
 * Use this in controllers instead of non-null assertions (`!`).
 */
export function hasTenantContext(
    ctx: AuthContext | RequestContext | undefined
): ctx is RequestContext & { tenantId: string } {
    return !!ctx && typeof ctx.tenantId === 'string' && ctx.tenantId.length > 0;
}

/**
 * Helper to extract a guaranteed RequestContext from an Express request.
 * Throws if tenantId is missing — use in tenant-scoped endpoints only.
 */
export function requireTenantContext(
    ctx: AuthContext | RequestContext | undefined
): RequestContext & { tenantId: string } {
    if (!hasTenantContext(ctx)) {
        throw new Error('Tenant context is required but not present on this request');
    }
    return ctx as RequestContext & { tenantId: string };
}
