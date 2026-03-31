export interface UserLocalizationSnapshot {
  timezone: string;
  locale: string;
  countryCode: string;
}

const USER_LOCALIZATION_STORAGE_KEY = "zodo.userLocalization";
const DATE_PATCH_REGISTRY_KEY = "__zodoDateLocalizationRegistry__";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function normalizeLocale(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) {
    return "en-US";
  }

  try {
    return Intl.getCanonicalLocales(raw)[0] || "en-US";
  } catch {
    return "en-US";
  }
}

function normalizeCountryCode(locale: string): string {
  const candidate = locale.split("-").pop()?.toUpperCase() || "";
  return /^[A-Z]{2}$/.test(candidate) ? candidate : "US";
}

function normalizeTimeZone(value?: string | null): string {
  const candidate = String(value || "").trim();
  if (!candidate) {
    return "UTC";
  }

  try {
    new Intl.DateTimeFormat(undefined, { timeZone: candidate });
    return candidate;
  } catch {
    return "UTC";
  }
}

export function detectUserLocalization(): UserLocalizationSnapshot {
  const locale = normalizeLocale(
    typeof navigator !== "undefined"
      ? navigator.languages?.find(Boolean) || navigator.language
      : "en-US",
  );

  const timezone = normalizeTimeZone(
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC",
  );

  return {
    timezone,
    locale,
    countryCode: normalizeCountryCode(locale),
  };
}

export function readStoredUserLocalization(): UserLocalizationSnapshot | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(USER_LOCALIZATION_STORAGE_KEY) || "null") as Partial<UserLocalizationSnapshot> | null;
    if (!parsed) {
      return null;
    }

    const locale = normalizeLocale(parsed.locale);
    return {
      locale,
      timezone: normalizeTimeZone(parsed.timezone),
      countryCode: normalizeCountryCode(locale),
    };
  } catch {
    return null;
  }
}

export function writeStoredUserLocalization(snapshot: UserLocalizationSnapshot): UserLocalizationSnapshot {
  const normalized: UserLocalizationSnapshot = {
    locale: normalizeLocale(snapshot.locale),
    timezone: normalizeTimeZone(snapshot.timezone),
    countryCode: normalizeCountryCode(snapshot.locale),
  };

  if (isBrowser()) {
    localStorage.setItem(USER_LOCALIZATION_STORAGE_KEY, JSON.stringify(normalized));
  }

  return normalized;
}

export function getUserLocalizationSnapshot(): UserLocalizationSnapshot {
  return readStoredUserLocalization() || writeStoredUserLocalization(detectUserLocalization());
}

function withPatchedTimeZone(
  timezone: string,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
  if (options?.timeZone) {
    return options;
  }

  return {
    ...(options || {}),
    timeZone: timezone,
  };
}

function installDateLocalePatch(timezone: string): void {
  if (!isBrowser()) {
    return;
  }

  const registry = (window as typeof window & {
    [DATE_PATCH_REGISTRY_KEY]?: {
      timezone: string;
      setTimezone: (nextTimezone: string) => void;
    };
  })[DATE_PATCH_REGISTRY_KEY];

  if (registry) {
    registry.setTimezone(timezone);
    return;
  }

  const originalToLocaleString = Date.prototype.toLocaleString;
  const originalToLocaleDateString = Date.prototype.toLocaleDateString;
  const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;

  let activeTimezone = timezone;

  Date.prototype.toLocaleString = function toLocaleStringPatched(
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    return originalToLocaleString.call(this, locales, withPatchedTimeZone(activeTimezone, options));
  };

  Date.prototype.toLocaleDateString = function toLocaleDateStringPatched(
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    return originalToLocaleDateString.call(this, locales, withPatchedTimeZone(activeTimezone, options));
  };

  Date.prototype.toLocaleTimeString = function toLocaleTimeStringPatched(
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    return originalToLocaleTimeString.call(this, locales, withPatchedTimeZone(activeTimezone, options));
  };

  (window as typeof window & {
    [DATE_PATCH_REGISTRY_KEY]?: {
      timezone: string;
      setTimezone: (nextTimezone: string) => void;
    };
  })[DATE_PATCH_REGISTRY_KEY] = {
    timezone,
    setTimezone: (nextTimezone: string) => {
      activeTimezone = normalizeTimeZone(nextTimezone);
    },
  };
}

export function initializeUserLocalization(): UserLocalizationSnapshot {
  const snapshot = writeStoredUserLocalization(detectUserLocalization());
  installDateLocalePatch(snapshot.timezone);
  return snapshot;
}
