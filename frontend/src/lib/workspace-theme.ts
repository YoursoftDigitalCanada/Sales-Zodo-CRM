import type { WorkspaceTheme } from "@/features/settings/services/settings-service";

export const WORKSPACE_THEME_STORAGE_KEY = "zodo-workspace-theme";

export function normalizeWorkspaceTheme(value: string | null | undefined): WorkspaceTheme {
  return value === "dark" ? "dark" : "light";
}

export function readStoredWorkspaceTheme(): WorkspaceTheme | null {
  if (typeof window === "undefined") {
    return null;
  }

  const candidates = [
    localStorage.getItem(WORKSPACE_THEME_STORAGE_KEY),
    localStorage.getItem("zodo-theme"),
    localStorage.getItem("theme"),
  ];

  const match = candidates.find((candidate) => candidate === "light" || candidate === "dark");
  return match ? normalizeWorkspaceTheme(match) : null;
}

export function syncLegacyThemeStorage(theme: WorkspaceTheme): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(WORKSPACE_THEME_STORAGE_KEY, theme);
  localStorage.setItem("zodo-theme", theme);
  localStorage.setItem("theme", theme);
}
