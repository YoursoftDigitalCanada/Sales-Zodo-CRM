import type { NotificationSettings } from "@/features/settings/services/settings-service";

export const NOTIFICATION_PREFERENCES_STORAGE_KEY = "workspaceNotificationPreferences";
export const NOTIFICATION_PREFERENCES_UPDATED_EVENT = "zodo:notification-preferences-updated";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationSettings = {
  emailNotifications: true,
  pushNotifications: true,
  desktopNotifications: true,
  weeklyDigest: true,
  productUpdates: false,
};

function normalizeNotificationPreferences(
  value: Partial<NotificationSettings> | null | undefined,
): NotificationSettings {
  return {
    emailNotifications: value?.emailNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.emailNotifications,
    pushNotifications: value?.pushNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.pushNotifications,
    desktopNotifications: value?.desktopNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.desktopNotifications,
    weeklyDigest: value?.weeklyDigest ?? DEFAULT_NOTIFICATION_PREFERENCES.weeklyDigest,
    productUpdates: value?.productUpdates ?? DEFAULT_NOTIFICATION_PREFERENCES.productUpdates,
  };
}

export function readStoredNotificationPreferences(): NotificationSettings {
  if (typeof window === "undefined") {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const rawValue = localStorage.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY);

  if (!rawValue) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  try {
    return normalizeNotificationPreferences(JSON.parse(rawValue) as Partial<NotificationSettings>);
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function writeStoredNotificationPreferences(
  value: Partial<NotificationSettings> | NotificationSettings,
): NotificationSettings {
  const nextValue = normalizeNotificationPreferences(value);

  if (typeof window !== "undefined") {
    localStorage.setItem(NOTIFICATION_PREFERENCES_STORAGE_KEY, JSON.stringify(nextValue));
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_PREFERENCES_UPDATED_EVENT, {
        detail: nextValue,
      }),
    );
  }

  return nextValue;
}
