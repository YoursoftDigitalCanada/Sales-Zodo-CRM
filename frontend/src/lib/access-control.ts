import { getStoredEmployee, isStoredEmployeeAdmin } from "@/features/auth/lib/auth-storage";
import { FeatureId, getEnabledFeatures } from "@/lib/enabled-features";

const DASHBOARD_ROUTE_CANDIDATES: Array<{
  path: string;
  featureId?: FeatureId;
  permissionModule?: string;
}> = [
  { path: "/dashboard", permissionModule: "dashboard" },
  { path: "/leads", featureId: "leads", permissionModule: "leads" },
  { path: "/client-list", featureId: "clients", permissionModule: "clients" },
  { path: "/projects", featureId: "projects", permissionModule: "projects" },
  { path: "/tasks", featureId: "tasks", permissionModule: "tasks" },
  { path: "/calendar", featureId: "calendar", permissionModule: "calendar" },
  { path: "/invoice", featureId: "finance", permissionModule: "invoices" },
  { path: "/letterbox", featureId: "letterbox", permissionModule: "emails" },
  { path: "/support/tickets", featureId: "support", permissionModule: "support" },
  { path: "/files", featureId: "files", permissionModule: "files" },
  { path: "/employees/attendance", featureId: "team" },
  { path: "/chats", featureId: "chat", permissionModule: "chat" },
  { path: "/roof-estimator", featureId: "roofEstimator", permissionModule: "roof-estimator" },
  { path: "/analytics", featureId: "analytics", permissionModule: "analytics" },
  { path: "/reports", featureId: "reports", permissionModule: "analytics" },
];

export function getStoredPermissions(): string[] | null {
  try {
    const raw = localStorage.getItem("permissions");
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

export function hasModulePermission(
  permissionModule: string | undefined,
  permissions: string[] | null,
  isOwnerOrAdmin: boolean,
): boolean {
  if (!permissionModule) {
    return true;
  }

  if (isOwnerOrAdmin) {
    return true;
  }

  if (!permissions) {
    return true;
  }

  return permissions.some((code) => {
    const dotIndex = code.lastIndexOf(".");
    if (dotIndex === -1) {
      return false;
    }

    return code.slice(0, dotIndex) === permissionModule;
  });
}

export function hasFeatureAccess(featureId: FeatureId | undefined, enabledFeatures: FeatureId[]): boolean {
  if (!featureId) {
    return true;
  }

  return enabledFeatures.includes(featureId);
}

export function canAccessModule(permissionModule?: string): boolean {
  const employee = getStoredEmployee();
  const isAdmin = isStoredEmployeeAdmin(employee);
  const permissions = getStoredPermissions();
  return hasModulePermission(permissionModule, permissions, isAdmin);
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
    && hasModulePermission(route.permissionModule, permissions, isAdmin)
  ));

  return firstAllowed?.path || "/login";
}
