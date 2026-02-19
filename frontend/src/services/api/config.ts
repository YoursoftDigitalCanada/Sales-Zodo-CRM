const FALLBACK_API_ORIGIN = "https://api.zodo.ca";
const API_VERSION = "v1";

const rawApiOrigin = import.meta.env.VITE_API_URL || FALLBACK_API_ORIGIN;
const normalizedOrigin = rawApiOrigin.replace(/\/+$/, "");

export const API_ORIGIN = normalizedOrigin;
export const API_PREFIX = `/api/${API_VERSION}`;
export const API_BASE_URL = `${API_ORIGIN}${API_PREFIX}`;

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function normalizeApiEndpoint(endpoint: string): string {
  if (!endpoint) return "/";
  if (isAbsoluteUrl(endpoint)) return endpoint;

  let normalized = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  normalized = normalized.replace(/^\/api\/v1(?=\/|$)/i, "");
  normalized = normalized.replace(/^\/api(?=\/|$)/i, "");

  return normalized || "/";
}

export function buildApiUrl(endpoint: string): string {
  if (isAbsoluteUrl(endpoint)) {
    return endpoint;
  }
  return `${API_ORIGIN}${API_PREFIX}${normalizeApiEndpoint(endpoint)}`;
}
