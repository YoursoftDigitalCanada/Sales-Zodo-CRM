import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AUTH_STORAGE_KEYS, getAccessToken } from "@/features/auth/lib/auth-storage";
import { getCompanyProfile, type CompanyProfile } from "@/features/settings/services/settings-service";
import { API_ORIGIN } from "@/services/api/config";

type WorkspaceBrandingContextValue = {
  branding: CompanyProfile | null;
  refreshBranding: () => Promise<CompanyProfile | null>;
  updateBranding: (nextBranding: Partial<CompanyProfile> | CompanyProfile | null) => CompanyProfile | null;
};

const WORKSPACE_BRANDING_STORAGE_KEY = "workspaceBranding";
const WORKSPACE_BRANDING_EVENT = "workspace-branding-updated";

const WorkspaceBrandingContext = createContext<WorkspaceBrandingContextValue | null>(null);

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeLogoUrl(logoUrl: string | null | undefined): string | null {
  const value = String(logoUrl || "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}${value}`;
}

function toLogoStorageValue(logoUrl: string | null | undefined): string | null {
  const value = String(logoUrl || "").trim();
  if (!value) return null;
  if (value.startsWith(API_ORIGIN)) {
    return value.slice(API_ORIGIN.length) || null;
  }
  return value;
}

function getCurrentTenantId(): string {
  const storedTenant = parseJson<{ id?: string }>(localStorage.getItem(AUTH_STORAGE_KEYS.tenant));
  return String(storedTenant?.id || "").trim();
}

function normalizeBranding(value: Partial<CompanyProfile> | null | undefined): CompanyProfile | null {
  if (!value) return null;

  const branding: CompanyProfile = {
    companyName: String(value.companyName || "").trim(),
    domain: String(value.domain || "").trim(),
    email: String(value.email || "").trim(),
    phone: String(value.phone || "").trim(),
    taxId: String(value.taxId || "").trim(),
    address: String(value.address || "").trim(),
    logoUrl: normalizeLogoUrl(value.logoUrl),
  };

  return Object.values(branding).some((entry) => Boolean(entry))
    ? branding
    : null;
}

function getTenantBrandingFallback(): CompanyProfile | null {
  const storedTenant = parseJson<{ name?: string; logo?: string | null }>(localStorage.getItem(AUTH_STORAGE_KEYS.tenant));
  return normalizeBranding({
    companyName: storedTenant?.name || "",
    logoUrl: storedTenant?.logo || null,
  });
}

function readStoredWorkspaceBranding(): CompanyProfile | null {
  const stored = parseJson<{ tenantId?: string; branding?: Partial<CompanyProfile> | null }>(
    localStorage.getItem(WORKSPACE_BRANDING_STORAGE_KEY),
  );

  if (!stored?.branding) {
    return null;
  }

  const currentTenantId = getCurrentTenantId();
  if (stored.tenantId && currentTenantId && stored.tenantId !== currentTenantId) {
    return null;
  }

  return normalizeBranding(stored.branding);
}

function writeStoredWorkspaceBranding(branding: CompanyProfile | null): CompanyProfile | null {
  const normalized = normalizeBranding(branding);
  const tenantId = getCurrentTenantId();

  if (normalized) {
    localStorage.setItem(
      WORKSPACE_BRANDING_STORAGE_KEY,
      JSON.stringify({
        tenantId,
        branding: normalized,
      }),
    );
  } else {
    localStorage.removeItem(WORKSPACE_BRANDING_STORAGE_KEY);
  }

  const storedTenant = parseJson<Record<string, unknown>>(localStorage.getItem(AUTH_STORAGE_KEYS.tenant));
  if (storedTenant) {
    const nextTenant = {
      ...storedTenant,
      ...(normalized?.companyName ? { name: normalized.companyName } : {}),
      ...(normalized ? { logo: toLogoStorageValue(normalized.logoUrl) } : {}),
    };
    localStorage.setItem(AUTH_STORAGE_KEYS.tenant, JSON.stringify(nextTenant));
  }

  return normalized;
}

function emitWorkspaceBranding(branding: CompanyProfile | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_BRANDING_EVENT, { detail: branding }));
}

export function pushWorkspaceBranding(nextBranding: Partial<CompanyProfile> | CompanyProfile | null): CompanyProfile | null {
  const current = readStoredWorkspaceBranding() || getTenantBrandingFallback();
  const merged = nextBranding
    ? {
        ...(current || {
          companyName: "",
          domain: "",
          email: "",
          phone: "",
          taxId: "",
          address: "",
          logoUrl: null,
        }),
        ...nextBranding,
      }
    : null;

  const stored = writeStoredWorkspaceBranding(merged);
  emitWorkspaceBranding(stored);
  return stored;
}

export function clearWorkspaceBranding(): void {
  localStorage.removeItem(WORKSPACE_BRANDING_STORAGE_KEY);
}

export function WorkspaceBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<CompanyProfile | null>(() => readStoredWorkspaceBranding() || getTenantBrandingFallback());

  const updateBranding = useCallback((nextBranding: Partial<CompanyProfile> | CompanyProfile | null) => {
    const stored = pushWorkspaceBranding(nextBranding);
    setBranding(stored);
    return stored;
  }, []);

  const refreshBranding = useCallback(async () => {
    if (!getAccessToken()) {
      const fallback = readStoredWorkspaceBranding() || getTenantBrandingFallback();
      setBranding(fallback);
      return fallback;
    }

    try {
      const freshBranding = await getCompanyProfile();
      const stored = pushWorkspaceBranding(freshBranding);
      setBranding(stored);
      return stored;
    } catch {
      const fallback = readStoredWorkspaceBranding() || getTenantBrandingFallback();
      setBranding(fallback);
      return fallback;
    }
  }, []);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const nextBranding = normalizeBranding((event as CustomEvent<CompanyProfile | null>).detail);
      setBranding(nextBranding);
    };

    window.addEventListener(WORKSPACE_BRANDING_EVENT, handleUpdate as EventListener);
    void refreshBranding();

    return () => {
      window.removeEventListener(WORKSPACE_BRANDING_EVENT, handleUpdate as EventListener);
    };
  }, [refreshBranding]);

  const value = useMemo<WorkspaceBrandingContextValue>(() => ({
    branding,
    refreshBranding,
    updateBranding,
  }), [branding, refreshBranding, updateBranding]);

  return (
    <WorkspaceBrandingContext.Provider value={value}>
      {children}
    </WorkspaceBrandingContext.Provider>
  );
}

export function useWorkspaceBranding(): WorkspaceBrandingContextValue {
  const context = useContext(WorkspaceBrandingContext);

  if (!context) {
    throw new Error("useWorkspaceBranding must be used within WorkspaceBrandingProvider");
  }

  return context;
}
