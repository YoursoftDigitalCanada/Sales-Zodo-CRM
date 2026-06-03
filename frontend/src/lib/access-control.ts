import {
  AUTH_ACCESS_UPDATED_EVENT,
  AUTH_STORAGE_KEYS,
  getStoredEmployee,
  isStoredEmployeeAdmin,
} from "@/features/auth/lib/auth-storage";
import { FeatureId, getEnabledFeatures } from "@/lib/enabled-features";
import { hasPermissionWithAliases } from "@/lib/permission-aliases";

export type PermissionAction = "view" | "create" | "update" | "delete" | string;

const DASHBOARD_ROUTE_CANDIDATES: Array<{
  path: string;
  featureId?: FeatureId;
  permissionModule?: string;
}> = [
  { path: "/dashboard", permissionModule: "dashboard" },
  { path: "/leads", featureId: "leads", permissionModule: "leads" },
  { path: "/client-list", featureId: "clients", permissionModule: "clients" },
  { path: "/projects", featureId: "projects", permissionModule: "projects" },
  { path: "/contracts", featureId: "finance", permissionModule: "contracts" },
  { path: "/tasks", featureId: "tasks", permissionModule: "tasks" },
  { path: "/calendar", featureId: "calendar", permissionModule: "calendar" },
  { path: "/meetings", featureId: "calendar", permissionModule: "meetings" },
  { path: "/calls", featureId: "tasks", permissionModule: "calls" },
  { path: "/invoice", featureId: "finance", permissionModule: "invoices" },
  { path: "/payments", featureId: "finance", permissionModule: "payments" },
  { path: "/bookkeeping", featureId: "finance", permissionModule: "bookkeeping" },
  { path: "/letterbox", featureId: "letterbox", permissionModule: "emails" },
  { path: "/sequences", featureId: "letterbox", permissionModule: "sequences" },
  { path: "/email-templates", featureId: "letterbox", permissionModule: "email_templates" },
  { path: "/support/tickets", featureId: "support", permissionModule: "support" },
  { path: "/files", featureId: "files", permissionModule: "files" },
  { path: "/employees/attendance", featureId: "team" },
  { path: "/chats", featureId: "chat", permissionModule: "chat" },
  { path: "/roof-estimator", featureId: "roofEstimator", permissionModule: "roof-estimator" },
  { path: "/analytics", featureId: "analytics", permissionModule: "analytics" },
  { path: "/reports", featureId: "reports", permissionModule: "reports" },
  { path: "/forecast", featureId: "analytics", permissionModule: "forecast" },
  { path: "/website-analytics", featureId: "analytics", permissionModule: "website_analytics" },
];

export function getStoredPermissions(): string[] | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.permissions);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : null;
  } catch {
    return null;
  }
}

export function normalizePermissionAction(action: PermissionAction = "view"): string {
  const normalized = String(action || "view").trim().toLowerCase();

  if (normalized === "edit") {
    return "update";
  }

  return normalized || "view";
}

export function getPermissionCode(
  permissionModule: string | undefined,
  action: PermissionAction = "view",
): string | undefined {
  if (!permissionModule) {
    return undefined;
  }

  return `${permissionModule}.${normalizePermissionAction(action)}`;
}

export function hasPermissionCode(
  permissionCode: string | undefined,
  permissions: string[] | null,
  isOwnerOrAdmin: boolean,
): boolean {
  if (!permissionCode) {
    return true;
  }

  if (isOwnerOrAdmin) {
    return true;
  }

  if (!permissions) {
    return false;
  }

  return hasPermissionWithAliases(permissions, permissionCode);
}

export function hasAnyPermissionCode(
  permissionCodes: Array<string | undefined>,
  permissions: string[] | null,
  isOwnerOrAdmin: boolean,
): boolean {
  if (permissionCodes.length === 0) {
    return true;
  }

  return permissionCodes.some((permissionCode) =>
    hasPermissionCode(permissionCode, permissions, isOwnerOrAdmin)
  );
}

export function hasModulePermission(
  permissionModule: string | string[] | undefined,
  permissions: string[] | null,
  isOwnerOrAdmin: boolean,
  action: PermissionAction = "view",
): boolean {
  if (!permissionModule) {
    return true;
  }

  if (Array.isArray(permissionModule)) {
    return permissionModule.some((moduleId) =>
      hasModulePermission(moduleId, permissions, isOwnerOrAdmin, action)
    );
  }

  return hasPermissionCode(
    getPermissionCode(permissionModule, action),
    permissions,
    isOwnerOrAdmin,
  );
}

export function hasFeatureAccess(featureId: FeatureId | undefined, enabledFeatures: FeatureId[]): boolean {
  if (!featureId) {
    return true;
  }

  return enabledFeatures.includes(featureId);
}

export function canAccessModule(permissionModule?: string): boolean {
  return canPerformAction(permissionModule, "view");
}

export function canPerformAction(permissionModule: string | undefined, action: PermissionAction): boolean {
  const employee = getStoredEmployee();
  const isAdmin = isStoredEmployeeAdmin(employee);
  const permissions = getStoredPermissions();
  return hasModulePermission(permissionModule, permissions, isAdmin, action);
}

export function canAccessPermission(permissionCode?: string): boolean {
  const employee = getStoredEmployee();
  const isAdmin = isStoredEmployeeAdmin(employee);
  const permissions = getStoredPermissions();
  return hasPermissionCode(permissionCode, permissions, isAdmin);
}

export function canAccessAnyPermission(permissionCodes: Array<string | undefined>): boolean {
  const employee = getStoredEmployee();
  const isAdmin = isStoredEmployeeAdmin(employee);
  const permissions = getStoredPermissions();
  return hasAnyPermissionCode(permissionCodes, permissions, isAdmin);
}

export function subscribeToPermissionChanges(listener: () => void): () => void {
  const handleChange = () => listener();
  window.addEventListener(AUTH_ACCESS_UPDATED_EVENT, handleChange);
  window.addEventListener("storage", handleChange);
  return () => {
    window.removeEventListener(AUTH_ACCESS_UPDATED_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

export function canAccessFeature(featureId?: FeatureId): boolean {
  return hasFeatureAccess(featureId, getEnabledFeatures());
}

export function getDefaultAuthorizedRoute(): string {
  const employee = getStoredEmployee();
  const isAdmin = isStoredEmployeeAdmin(employee);
  const permissions = getStoredPermissions();
  const features = getEnabledFeatures();

  const firstAllowed = DASHBOARD_ROUTE_CANDIDATES.find((route) => (
    hasFeatureAccess(route.featureId, features)
    && hasModulePermission(route.permissionModule, permissions, isAdmin, "view")
  ));

  return firstAllowed?.path || "/login";
}
