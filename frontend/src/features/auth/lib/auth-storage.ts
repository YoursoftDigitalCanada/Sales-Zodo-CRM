interface AuthUser {
  firstName?: string;
  [key: string]: unknown;
}

interface AuthEmployee {
  id?: string;
  role?: {
    name?: string;
    [key: string]: unknown;
  } | null;
  roleName?: string;
  [key: string]: unknown;
}

interface AuthSessionInput {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
  employee?: unknown;
  tenant?: unknown;
  permissions?: unknown;
}

interface StoredAccessContext {
  user?: unknown;
  employee?: unknown;
  tenant?: unknown;
  permissions?: unknown;
}

export const AUTH_STORAGE_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  legacyToken: "token",
  user: "user",
  employee: "employee",
  tenant: "tenant",
  permissions: "permissions",
} as const;

export const AUTH_ACCESS_UPDATED_EVENT = "zodo:auth-access-updated";

function dispatchAccessUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_ACCESS_UPDATED_EVENT));
  }
}

function writeStoredValue(key: string, value: unknown): void {
  if (value === undefined) {
    return;
  }

  if (value === null) {
    localStorage.removeItem(key);
    return;
  }

  if (typeof value === "string") {
    localStorage.setItem(key, value);
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

export function getAccessToken(): string | null {
  return (
    localStorage.getItem(AUTH_STORAGE_KEYS.accessToken) ||
    localStorage.getItem(AUTH_STORAGE_KEYS.legacyToken)
  );
}

export function setAuthSession(session: AuthSessionInput): void {
  localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, session.accessToken);
  localStorage.setItem(AUTH_STORAGE_KEYS.legacyToken, session.accessToken);

  if ("refreshToken" in session && session.refreshToken) {
    localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, session.refreshToken);
  }
  writeStoredValue(AUTH_STORAGE_KEYS.user, session.user);
  writeStoredValue(AUTH_STORAGE_KEYS.employee, session.employee);
  writeStoredValue(AUTH_STORAGE_KEYS.tenant, session.tenant);
  writeStoredValue(AUTH_STORAGE_KEYS.permissions, session.permissions);
  dispatchAccessUpdated();
}

export function updateStoredAccessContext(context: StoredAccessContext): void {
  writeStoredValue(AUTH_STORAGE_KEYS.user, context.user);
  writeStoredValue(AUTH_STORAGE_KEYS.employee, context.employee);
  writeStoredValue(AUTH_STORAGE_KEYS.tenant, context.tenant);
  writeStoredValue(AUTH_STORAGE_KEYS.permissions, context.permissions);
  dispatchAccessUpdated();
}

export function clearAuthSession(): void {
  Object.values(AUTH_STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  [
    "enabledFeatures",
    "availableFeatures",
    "onboardingCompleted",
    "onboardingData",
    "workspaceBranding",
  ].forEach((key) => localStorage.removeItem(key));
  dispatchAccessUpdated();
}

export function getStoredEmployee(): AuthEmployee | null {
  const rawEmployee = localStorage.getItem(AUTH_STORAGE_KEYS.employee);
  if (!rawEmployee) {
    return null;
  }

  try {
    return JSON.parse(rawEmployee) as AuthEmployee;
  } catch {
    return null;
  }
}

export function getStoredEmployeeRoleName(employee?: AuthEmployee | null): string {
  const roleValue = employee?.role?.name;
  if (typeof roleValue === "string" && roleValue.trim()) {
    return roleValue.trim();
  }

  if (typeof employee?.roleName === "string" && employee.roleName.trim()) {
    return employee.roleName.trim();
  }

  return "";
}

export function isStoredEmployeeAdmin(employee?: AuthEmployee | null): boolean {
  if (!employee) {
    return false;
  }

  const roleName = getStoredEmployeeRoleName(employee);
  return /^(owner|admin|super admin|super_admin)$/i.test(roleName);
}
