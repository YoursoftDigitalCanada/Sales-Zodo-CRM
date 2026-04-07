import type { FeatureId } from "@/lib/enabled-features";
import { getEnabledFeatures } from "@/lib/enabled-features";
import {
  canAccessAnyPermission,
  canAccessPermission,
  canPerformAction,
  getDefaultAuthorizedRoute,
} from "@/lib/access-control";
import type { PermissionAction } from "@/lib/access-control";
import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";

export function AccessGuard({
  featureId,
  permission,
  anyOf,
  permissionModule,
  action = "view",
  fallbackTo,
  children,
}: PropsWithChildren<{
  featureId?: FeatureId | FeatureId[];
  permission?: string;
  anyOf?: string[];
  permissionModule?: string;
  action?: PermissionAction;
  fallbackTo?: string;
}>) {
  const location = useLocation();
  const enabled = new Set(getEnabledFeatures());
  const requiredFeatures = featureId ? (Array.isArray(featureId) ? featureId : [featureId]) : [];

  const hasFeatureAccess = requiredFeatures.length === 0
    || requiredFeatures.some((feature) => enabled.has(feature));

  const hasPermissionAccess = permission
    ? canAccessPermission(permission)
    : anyOf && anyOf.length > 0
      ? canAccessAnyPermission(anyOf)
      : permissionModule
        ? canPerformAction(permissionModule, action)
        : true;

  if (!hasFeatureAccess || !hasPermissionAccess) {
    const nextFallback = fallbackTo || getDefaultAuthorizedRoute();
    return <Navigate to={nextFallback} replace state={{ from: location.pathname }} />;
  }

  return children;
}
