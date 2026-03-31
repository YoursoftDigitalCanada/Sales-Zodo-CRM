const FALLBACK_API_ORIGIN = "https://api.zodo.ca";
const API_VERSION = "v1";

const rawApiOrigin = import.meta.env.VITE_API_URL || FALLBACK_API_ORIGIN;
const normalizedOrigin = rawApiOrigin.replace(/\/+$/, "");

function stripApiPathSuffix(url: string): string {
  return url.replace(/\/api(?:\/v\d+)?$/i, "");
}

function resolveApiBaseUrl(url: string): string {
  if (/\/api\/v\d+$/i.test(url)) {
    return url;
  }

  if (/\/api$/i.test(url)) {
    return `${stripApiPathSuffix(url)}/api/${API_VERSION}`;
  }

  return `${stripApiPathSuffix(url)}/api/${API_VERSION}`;
}

export const API_ORIGIN = stripApiPathSuffix(normalizedOrigin);
export const API_PREFIX = `/api/${API_VERSION}`;
export const API_BASE_URL = resolveApiBaseUrl(normalizedOrigin);

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
