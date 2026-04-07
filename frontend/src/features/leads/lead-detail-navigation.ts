export type LeadDetailNavigationState = {
  from?: string;
  fromLabel?: string;
};

const STORAGE_PREFIX = "zodo:lead-detail-source:";

function getStorageKey(leadId: string) {
  return `${STORAGE_PREFIX}${leadId}`;
}

export function saveLeadDetailNavigationState(leadId: string, state: LeadDetailNavigationState) {
  if (typeof window === "undefined" || !leadId) {
    return;
  }

  const payload: LeadDetailNavigationState = {
    from: typeof state.from === "string" ? state.from : undefined,
    fromLabel: typeof state.fromLabel === "string" ? state.fromLabel : undefined,
  };

  if (!payload.from) {
    return;
  }

  window.sessionStorage.setItem(getStorageKey(leadId), JSON.stringify(payload));
}

export function readLeadDetailNavigationState(leadId: string): LeadDetailNavigationState | null {
  if (typeof window === "undefined" || !leadId) {
    return null;
  }

  const raw = window.sessionStorage.getItem(getStorageKey(leadId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as LeadDetailNavigationState;
    if (typeof parsed?.from === "string" && parsed.from.trim()) {
      return {
        from: parsed.from,
        fromLabel: typeof parsed.fromLabel === "string" ? parsed.fromLabel : undefined,
      };
    }
  } catch {
    window.sessionStorage.removeItem(getStorageKey(leadId));
  }

  return null;
}
