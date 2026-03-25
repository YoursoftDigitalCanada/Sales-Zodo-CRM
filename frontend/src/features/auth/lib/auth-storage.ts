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

export const AUTH_STORAGE_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  legacyToken: "token",
  user: "user",
  employee: "employee",
  tenant: "tenant",
  permissions: "permissions",
} as const;

export function getAccessToken(): string | null {
  return (
    localStorage.getItem(AUTH_STORAGE_KEYS.accessToken) ||
    localStorage.getItem(AUTH_STORAGE_KEYS.legacyToken)
  );
}

export function setAuthSession(session: AuthSessionInput): void {
  localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, session.accessToken);
  localStorage.setItem(AUTH_STORAGE_KEYS.legacyToken, session.accessToken);

  if (session.refreshToken) {
    localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, session.refreshToken);
  }
  if (session.user) {
    localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(session.user));
  }
  if (session.employee) {
    localStorage.setItem(AUTH_STORAGE_KEYS.employee, JSON.stringify(session.employee));
  }
  if (session.tenant) {
    localStorage.setItem(AUTH_STORAGE_KEYS.tenant, JSON.stringify(session.tenant));
  }
  if (session.permissions) {
    localStorage.setItem(AUTH_STORAGE_KEYS.permissions, JSON.stringify(session.permissions));
  }
}

export function clearAuthSession(): void {
  Object.values(AUTH_STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  [
    "enabledFeatures",
    "availableFeatures",
    "onboardingCompleted",
    "onboardingData",
  ].forEach((key) => localStorage.removeItem(key));
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
    return true;
  }

  const roleName = getStoredEmployeeRoleName(employee);
  return /^(owner|admin|super admin|super_admin)$/i.test(roleName);
}
