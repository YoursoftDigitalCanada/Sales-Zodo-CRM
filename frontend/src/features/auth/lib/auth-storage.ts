interface AuthUser {
  firstName?: string;
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
}
