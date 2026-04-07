import { useEffect, useMemo, useState } from "react";
import { getStoredEmployee, isStoredEmployeeAdmin } from "@/features/auth/lib/auth-storage";
import {
  type PermissionAction,
  getStoredPermissions,
  hasAnyPermissionCode,
  hasModulePermission,
  hasPermissionCode,
  subscribeToPermissionChanges,
} from "@/lib/access-control";

function readPermissionSnapshot() {
  const employee = getStoredEmployee();
  return {
    permissions: getStoredPermissions(),
    isOwnerOrAdmin: isStoredEmployeeAdmin(employee),
  };
}

export function usePermissionSnapshot() {
  const [snapshot, setSnapshot] = useState(readPermissionSnapshot);

  useEffect(() => subscribeToPermissionChanges(() => {
    setSnapshot(readPermissionSnapshot());
  }), []);

  return snapshot;
}

export function useCanPerformAction(permissionModule: string | undefined, action: PermissionAction = "view"): boolean {
  const { permissions, isOwnerOrAdmin } = usePermissionSnapshot();

  return useMemo(
    () => hasModulePermission(permissionModule, permissions, isOwnerOrAdmin, action),
    [action, isOwnerOrAdmin, permissionModule, permissions],
  );
}

export function useHasPermission(permissionCode: string | undefined): boolean {
  const { permissions, isOwnerOrAdmin } = usePermissionSnapshot();

  return useMemo(
    () => hasPermissionCode(permissionCode, permissions, isOwnerOrAdmin),
    [isOwnerOrAdmin, permissionCode, permissions],
  );
}

export function useHasAnyPermission(permissionCodes: Array<string | undefined>): boolean {
  const { permissions, isOwnerOrAdmin } = usePermissionSnapshot();

  return useMemo(
    () => hasAnyPermissionCode(permissionCodes, permissions, isOwnerOrAdmin),
    [isOwnerOrAdmin, permissionCodes, permissions],
  );
}
