// src/common/middleware/sanitize-body.middleware.ts
// ============================================================================
// GLOBAL REQUEST BODY SANITIZATION
//
// Automatically strips `tenantId` (and other server-owned fields) from req.body
// on every incoming request, regardless of which controller handles it.
//
// This is the SAFETY NET — even if a controller forgets to call sanitizeBody(),
// the tenantId field cannot be spoofed from the client.
// ============================================================================

import { Request, Response, NextFunction } from 'express';

/**
 * Fields that must NEVER be accepted from client-supplied request bodies.
 * They are always injected server-side from JWT or auto-generated.
 */
const FORBIDDEN_BODY_FIELDS = ['tenantId'] as const;

/**
 * Global middleware that strips tenantId from req.body on every request.
 *
 * Mount early in the middleware chain (after body parsing, before routes).
 * This prevents tenant spoofing even if individual controllers forget to
 * call sanitizeBody().
 */
export function stripTenantFromBody(req: Request, _res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === 'object') {
        for (const field of FORBIDDEN_BODY_FIELDS) {
            delete req.body[field];
        }
    }
    next();
}
