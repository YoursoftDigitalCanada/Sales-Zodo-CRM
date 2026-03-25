import type { FeatureId } from "@/lib/enabled-features";
import { getEnabledFeatures } from "@/lib/enabled-features";
import { getDefaultAuthorizedRoute } from "@/lib/access-control";
import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";

export function FeatureGuard({
  featureId,
  fallbackTo,
  children,
}: PropsWithChildren<{
  featureId: FeatureId | FeatureId[];
  fallbackTo?: string;
}>) {
  const location = useLocation();
  const enabled = getEnabledFeatures();
  const enabledSet = new Set(enabled);
  const required = Array.isArray(featureId) ? featureId : [featureId];

  const allowed = required.some((f) => enabledSet.has(f));
  if (!allowed) {
    const nextFallback = fallbackTo || getDefaultAuthorizedRoute();
    return (
      <Navigate to={nextFallback} replace state={{ from: location.pathname }} />
    );
  }

  return children;
}
