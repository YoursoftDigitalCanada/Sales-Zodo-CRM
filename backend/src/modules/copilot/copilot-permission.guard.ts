// src/modules/copilot/copilot-permission.guard.ts
// ============================================================================
// COPILOT PERMISSION GUARD — Module-Level RBAC for AI Context Resolution
//
// Validates that the user has VIEW permission for the module they're
// requesting AI assistance on. This prevents the copilot from becoming
// a data-access bypass tool.
//
// Called BEFORE ContextResolverService so no entity data is fetched
// for unauthorized modules.
// ============================================================================

import { ForbiddenError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { PERMISSIONS } from '../../common/constants/permissions';

// ── Module → Required Permission Mapping ────────────────────────────────

const MODULE_PERMISSION_MAP: Record<string, string> = {
    leads: PERMISSIONS.LEADS_VIEW,
    clients: PERMISSIONS.CLIENTS_VIEW,
    projects: PERMISSIONS.PROJECTS_VIEW,
    tasks: PERMISSIONS.TASKS_VIEW,
    finance: PERMISSIONS.INVOICES_VIEW,
    bookings: PERMISSIONS.BOOKINGS_VIEW,
    analytics: PERMISSIONS.ANALYTICS_VIEW,
    dashboard: PERMISSIONS.DASHBOARD_VIEW,
    hr: PERMISSIONS.EMPLOYEES_VIEW,
    communication: PERMISSIONS.EMAILS_VIEW,
    files: PERMISSIONS.FILES_VIEW,
    ecommerce: PERMISSIONS.PRODUCTS_VIEW,
    settings: PERMISSIONS.SETTINGS_VIEW,
};

// ── Guard ───────────────────────────────────────────────────────────────

class CopilotPermissionGuard {

    /**
     * Validate that the user has VIEW permission for the requested module.
     *
     * @param permissions - User's permission codes from req.permissions
     * @param module      - The copilot context module (e.g., 'leads', 'clients')
     *
     * If no specific permission is mapped (e.g., 'general' context),
     * the guard allows access and the response falls back to high-level
     * assistant behavior without forcing unrelated module permissions.
     */
    validateModuleAccess(permissions: string[], module?: string): void {
        if (!module) return; // No specific module → general context, allowed

        const requiredPermission = MODULE_PERMISSION_MAP[module];
        if (!requiredPermission) return; // Unknown module → no restriction

        if (!permissions.includes(requiredPermission)) {
            throw new ForbiddenError(
                `You do not have permission to access ${module} data via AI Copilot. Required: ${requiredPermission}`,
                ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS,
            );
        }
    }
}

export const copilotPermissionGuard = new CopilotPermissionGuard();
