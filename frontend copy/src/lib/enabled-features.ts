export const ONBOARDING_FEATURE_IDS = [
  "leads",
  "pipeline",
  "contacts",
  "companies",
  "tasks",
  "calendar",
  "email",
  "invoices",
  "reports",
  "documents",
  "automation",
  "api",
] as const;

export type FeatureId = (typeof ONBOARDING_FEATURE_IDS)[number];

export const DEFAULT_ENABLED_FEATURES: FeatureId[] = [
  "leads",
  "contacts",
  "tasks",
  "calendar",
];

const STORAGE_KEYS = {
  enabledFeatures: "enabledFeatures",
  onboardingCompleted: "onboardingCompleted",
  onboardingData: "onboardingData",
} as const;

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

export function clearEnabledFeatures(): void {
  localStorage.removeItem(STORAGE_KEYS.enabledFeatures);
  window.dispatchEvent(new Event("enabledFeatures:change"));
}

export function clearOnboardingData(): void {
  localStorage.removeItem(STORAGE_KEYS.onboardingData);
}

export function normalizeEnabledFeatures(input: unknown): FeatureId[] {
  const allowed = new Set<string>(ONBOARDING_FEATURE_IDS);
  const incoming = Array.isArray(input) ? input : [];

  const normalized = incoming
    .map((v) => String(v).trim())
    .filter((v) => allowed.has(v)) as FeatureId[];

  // Basic dependency: pipeline implies leads.
  const set = new Set<FeatureId>(normalized);
  if (set.has("pipeline")) set.add("leads");

  return Array.from(set);
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

export function getEnabledFeatures(): FeatureId[] {
  // Only enforce selected features after onboarding is completed.
  // Before that (or for users that never did onboarding), default to "everything enabled"
  // so we don't unexpectedly hide modules.
  if (!isOnboardingCompleted()) return [...ONBOARDING_FEATURE_IDS];
  return getStoredEnabledFeatures() ?? DEFAULT_ENABLED_FEATURES;
}

export function setEnabledFeatures(features: FeatureId[]): void {
  const normalized = normalizeEnabledFeatures(features);
  localStorage.setItem(
    STORAGE_KEYS.enabledFeatures,
    JSON.stringify(normalized)
  );
  window.dispatchEvent(new Event("enabledFeatures:change"));
}

export function subscribeEnabledFeatures(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === STORAGE_KEYS.enabledFeatures ||
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
