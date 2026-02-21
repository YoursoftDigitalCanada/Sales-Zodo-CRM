// src/common/utils/sanitize-body.ts
// ============================================================================
// REQUEST BODY SANITIZATION — TENANT WRITE ENFORCEMENT
//
// Strips server-owned fields (tenantId, id, createdAt, updatedAt) from request
// bodies before passing to services/repositories. This prevents frontend
// spoofing attacks where a malicious client sends a tenantId in the request
// body to inject data into another tenant's namespace.
//
// Usage:
//   const data = sanitizeBody<CreateLeadDto>(req.body);
//   // tenantId, id, createdAt, updatedAt are guaranteed stripped
// ============================================================================

/**
 * Server-owned fields that must NEVER be accepted from client request bodies.
 * These are always injected server-side from JWT context or auto-generated.
 */
const SERVER_OWNED_FIELDS = [
    'tenantId',
    'id',
    'createdAt',
    'updatedAt',
    'deletedAt',
] as const;

/**
 * Strips server-owned fields from a request body object.
 *
 * SECURITY: Prevents tenant spoofing, ID injection, and timestamp manipulation.
 * Always use this before passing req.body to services.
 *
 * @param body - The raw request body (req.body)
 * @returns A new object with server-owned fields removed
 *
 * @example
 *   // In a controller:
 *   const data = sanitizeBody<CreateLeadDto>(req.body);
 *   const lead = await leadsService.create(tenantId, data);
 */
export function sanitizeBody<T extends Record<string, any>>(body: T): T {
    const sanitized = { ...body };

    for (const field of SERVER_OWNED_FIELDS) {
        delete (sanitized as any)[field];
    }

    return sanitized;
}

/**
 * Strips specific fields from a request body object.
 * Use when you need to strip additional module-specific fields.
 *
 * @param body - The raw request body
 * @param fields - Additional field names to strip
 * @returns A new object with specified fields removed
 *
 * @example
 *   const data = stripFields(req.body, ['tenantId', 'createdById', 'ownerId']);
 */
export function stripFields<T extends Record<string, any>>(
    body: T,
    fields: string[]
): T {
    const sanitized = { ...body };

    for (const field of fields) {
        delete (sanitized as any)[field];
    }

    return sanitized;
}
