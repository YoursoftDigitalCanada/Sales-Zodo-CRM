import { isRoofingPublicMarketingEnabled } from "@/lib/public-product-config";

export const APP_FEATURE_IDS = [
  "calendar",
  "tasks",
  "leads",
  "clients",
  "finance",
  "letterbox",
  "support",
  "chat",
  "projects",
  "kanban",
  "timeTracking",
  "files",
  "team",
  "roofEstimator",
  "analytics",
  "reports",
  "aiAssistant",
] as const;

export type FeatureId = (typeof APP_FEATURE_IDS)[number];

export const PLAN_KEYS = ["basic", "standard", "premium"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const PLAN_FEATURE_ACCESS: Record<PlanKey, FeatureId[]> = {
  basic: [
    "calendar",
    "tasks",
    "leads",
    "clients",
    "finance",
    "letterbox",
    "support",
  ],
  standard: [
    "calendar",
    "tasks",
    "leads",
    "clients",
    "finance",
    "letterbox",
    "support",
    "chat",
    "projects",
    "kanban",
    "timeTracking",
    "files",
    "team",
  ],
  premium: APP_FEATURE_IDS.filter((featureId) => featureId !== "roofEstimator"),
};

export const DEFAULT_ENABLED_FEATURES: FeatureId[] = [...PLAN_FEATURE_ACCESS.standard];

const STORAGE_KEYS = {
  enabledFeatures: "enabledFeatures",
  availableFeatures: "availableFeatures",
  onboardingCompleted: "onboardingCompleted",
  onboardingData: "onboardingData",
} as const;

const LEGACY_FEATURE_ALIASES: Record<string, FeatureId[]> = {
  pipeline: ["leads"],
  contacts: ["clients"],
  companies: ["clients"],
  invoices: ["finance"],
  payments: ["finance"],
  quotes: ["finance"],
  email: ["letterbox", "chat", "support"],
  documents: ["files"],
  api: ["team", "aiAssistant"],
  automation: ["aiAssistant"],
};

export function isPlanKey(value: string | null | undefined): value is PlanKey {
  return !!value && PLAN_KEYS.includes(value as PlanKey);
}

export function getFeatureAccessForPlan(plan: PlanKey): FeatureId[] {
  return [...PLAN_FEATURE_ACCESS[plan]];
}

export function isOnboardingCompleted(): boolean {
  return localStorage.getItem(STORAGE_KEYS.onboardingCompleted) === "true";
}

export function isOnboardingRequired(): boolean {
  return localStorage.getItem(STORAGE_KEYS.onboardingCompleted) === "false";
}

export function setOnboardingCompleted(completed: boolean): void {
  localStorage.setItem(
    STORAGE_KEYS.onboardingCompleted,
    completed ? "true" : "false"
  );
  window.dispatchEvent(new Event("enabledFeatures:change"));
}

export function normalizeEnabledFeatures(input: unknown): FeatureId[] {
  const allowed = new Set<string>(APP_FEATURE_IDS);
  const incoming = Array.isArray(input) ? input : [];
  const normalized = new Set<FeatureId>();

  incoming.forEach((value) => {
    const key = String(value).trim();
    if (!key) return;

    if (key === "roofEstimator" && !isRoofingPublicMarketingEnabled) {
      return;
    }

    if (allowed.has(key)) {
      normalized.add(key as FeatureId);
      return;
    }

    const aliases = LEGACY_FEATURE_ALIASES[key];
    if (aliases) {
      aliases.forEach((alias) => normalized.add(alias));
    }
  });

  return Array.from(normalized);
}

export function getStoredEnabledFeatures(): FeatureId[] | null {
  const raw = localStorage.getItem(STORAGE_KEYS.enabledFeatures);
  if (!raw) return null;
  try {
    return normalizeEnabledFeatures(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function getAvailableFeatures(): FeatureId[] | null {
  const raw = localStorage.getItem(STORAGE_KEYS.availableFeatures);
  if (!raw) return null;
  try {
    return normalizeEnabledFeatures(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function setAvailableFeatures(features: FeatureId[]): void {
  const normalized = normalizeEnabledFeatures(features);
  localStorage.setItem(
    STORAGE_KEYS.availableFeatures,
    JSON.stringify(normalized)
  );
  window.dispatchEvent(new Event("enabledFeatures:change"));
}

export function clearEnabledFeatures(): void {
  localStorage.removeItem(STORAGE_KEYS.enabledFeatures);
  window.dispatchEvent(new Event("enabledFeatures:change"));
}

export function clearAvailableFeatures(): void {
  localStorage.removeItem(STORAGE_KEYS.availableFeatures);
  window.dispatchEvent(new Event("enabledFeatures:change"));
}

export function clearOnboardingData(): void {
  localStorage.removeItem(STORAGE_KEYS.onboardingData);
}

export function getEnabledFeatures(): FeatureId[] {
  const available = getAvailableFeatures() ?? [...APP_FEATURE_IDS];

  if (!isOnboardingCompleted()) {
    return available;
  }

  const stored = getStoredEnabledFeatures();
  if (!stored) {
    return available;
  }

  const availableSet = new Set<FeatureId>(available);
  return stored.filter((feature) => availableSet.has(feature));
}

export function setEnabledFeatures(features: FeatureId[]): void {
  const normalized = normalizeEnabledFeatures(features);
  const available = new Set<FeatureId>(getAvailableFeatures() ?? APP_FEATURE_IDS);
  const filtered = normalized.filter((feature) => available.has(feature));

  localStorage.setItem(
    STORAGE_KEYS.enabledFeatures,
    JSON.stringify(filtered)
  );
  window.dispatchEvent(new Event("enabledFeatures:change"));
}

export function getFeatureAccessFromTenant(tenant: unknown): FeatureId[] | null {
  if (!tenant || typeof tenant !== "object") {
    return null;
  }

  const record = tenant as Record<string, unknown>;
  const available = normalizeEnabledFeatures(record.availableFeatures);
  if (available.length > 0) {
    return available;
  }

  const explicit = normalizeEnabledFeatures(record.enabledFeatures);
  if (explicit.length > 0) {
    return explicit;
  }

  const plan = String(record.plan || "").trim().toLowerCase();
  if (isPlanKey(plan)) {
    return getFeatureAccessForPlan(plan);
  }

  return null;
}

export function subscribeEnabledFeatures(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === STORAGE_KEYS.enabledFeatures ||
      e.key === STORAGE_KEYS.availableFeatures ||
      e.key === STORAGE_KEYS.onboardingCompleted
    ) {
      callback();
    }
  };

  const onCustom = () => callback();

  window.addEventListener("storage", onStorage);
  window.addEventListener("enabledFeatures:change", onCustom);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("enabledFeatures:change", onCustom);
  };
}
