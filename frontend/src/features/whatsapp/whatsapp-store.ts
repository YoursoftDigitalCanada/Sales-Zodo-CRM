import type { PlanKey } from "@/lib/enabled-features";

export type WhatsAppProvider = "meta" | "twilio";

export interface WhatsAppConnection {
  id: string;
  provider: WhatsAppProvider;
  phoneNumber: string;
  status: "connected";
  lastSyncTime: string;
  connectedAt: string;
  providerLabel: string;
  descriptor: string;
}

export interface WhatsAppPlanAccess {
  enabled: boolean;
  maxNumbers: number;
  manualMessagingOnly: boolean;
  automation: boolean;
  teamAssignment: boolean;
  analytics: boolean;
}

interface TenantWhatsAppState {
  connections: WhatsAppConnection[];
}

interface WhatsAppStorageShape {
  byTenant: Record<string, TenantWhatsAppState>;
}

const STORAGE_KEY = "zodo.whatsapp.integrations.v1";
const CHANGE_EVENT = "zodo:whatsapp-change";

const EMPTY_STATE: WhatsAppStorageShape = { byTenant: {} };

export const WHATSAPP_PLAN_ACCESS: Record<PlanKey, WhatsAppPlanAccess> = {
  basic: {
    enabled: false,
    maxNumbers: 0,
    manualMessagingOnly: true,
    automation: false,
    teamAssignment: false,
    analytics: false,
  },
  standard: {
    enabled: true,
    maxNumbers: 1,
    manualMessagingOnly: true,
    automation: false,
    teamAssignment: false,
    analytics: false,
  },
  premium: {
    enabled: true,
    maxNumbers: 5,
    manualMessagingOnly: false,
    automation: true,
    teamAssignment: true,
    analytics: true,
  },
};

function readStorage(): WhatsAppStorageShape {
  if (typeof window === "undefined") {
    return EMPTY_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY_STATE;
    }

    const parsed = JSON.parse(raw) as WhatsAppStorageShape;
    return parsed?.byTenant ? parsed : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function writeStorage(next: WhatsAppStorageShape): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readTenantRecord(): Record<string, unknown> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem("tenant");
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function getCurrentTenantPlan(): PlanKey {
  const tenant = readTenantRecord();
  const plan = String(tenant.plan || "").trim().toLowerCase();

  if (plan === "basic" || plan === "standard" || plan === "premium") {
    return plan;
  }

  return "standard";
}

export function getCurrentTenantId(): string {
  const tenant = readTenantRecord();
  return String(tenant.id || "default-tenant");
}

export function getWhatsAppPlanAccess(plan: PlanKey = getCurrentTenantPlan()): WhatsAppPlanAccess {
  return WHATSAPP_PLAN_ACCESS[plan];
}

export function formatWhatsAppDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function getProviderLabel(provider: WhatsAppProvider): string {
  return provider === "meta" ? "Meta" : "Twilio";
}

export function getTenantWhatsAppState(tenantId: string = getCurrentTenantId()): TenantWhatsAppState {
  const state = readStorage();
  return state.byTenant[tenantId] || { connections: [] };
}

export function getWhatsAppConnections(tenantId: string = getCurrentTenantId()): WhatsAppConnection[] {
  return getTenantWhatsAppState(tenantId).connections;
}

export function isWhatsAppConnected(tenantId: string = getCurrentTenantId()): boolean {
  return getWhatsAppConnections(tenantId).length > 0;
}

export function createMetaConnection(input: {
  phoneNumberId: string;
  businessAccountId: string;
}): WhatsAppConnection {
  const digits = input.phoneNumberId.replace(/\D/g, "");
  const derivedDigits = digits.slice(-10).padStart(10, "0");
  const phoneNumber = `+91${derivedDigits}`;
  const now = new Date().toISOString();

  return {
    id: `wa-${Date.now()}`,
    provider: "meta",
    phoneNumber,
    status: "connected",
    lastSyncTime: now,
    connectedAt: now,
    providerLabel: "Meta",
    descriptor: `Business ID ${input.businessAccountId.trim()}`,
  };
}

export function createTwilioConnection(input: {
  accountSid: string;
  whatsappNumber: string;
}): WhatsAppConnection {
  const now = new Date().toISOString();

  return {
    id: `wa-${Date.now()}`,
    provider: "twilio",
    phoneNumber: input.whatsappNumber.replace(/^whatsapp:/i, ""),
    status: "connected",
    lastSyncTime: now,
    connectedAt: now,
    providerLabel: "Twilio",
    descriptor: `SID ${input.accountSid.trim().slice(0, 8)}...`,
  };
}

export function saveWhatsAppConnection(connection: WhatsAppConnection, tenantId: string = getCurrentTenantId()): void {
  const state = readStorage();
  const existing = state.byTenant[tenantId] || { connections: [] };
  state.byTenant[tenantId] = {
    connections: [...existing.connections, connection],
  };
  writeStorage(state);
}

export function disconnectWhatsAppConnection(connectionId: string, tenantId: string = getCurrentTenantId()): void {
  const state = readStorage();
  const existing = state.byTenant[tenantId] || { connections: [] };
  state.byTenant[tenantId] = {
    connections: existing.connections.filter((connection) => connection.id !== connectionId),
  };
  writeStorage(state);
}

export function refreshWhatsAppSync(connectionId: string, tenantId: string = getCurrentTenantId()): void {
  const state = readStorage();
  const existing = state.byTenant[tenantId] || { connections: [] };
  state.byTenant[tenantId] = {
    connections: existing.connections.map((connection) =>
      connection.id === connectionId
        ? { ...connection, lastSyncTime: new Date().toISOString() }
        : connection
    ),
  };
  writeStorage(state);
}

export function subscribeWhatsAppIntegration(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, listener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}
