import api from "@/lib/axios";
import type { ApiResponse, AnyRecord } from "@/types/api";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  company: string;
  password: string;
}

export type AuthApiResponse = ApiResponse<AnyRecord>;

interface BackendRegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantName?: string;
  tenantSlug?: string;
}

function splitFullName(name: string): { firstName: string; lastName: string } {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length < 2) {
    return {
      firstName: parts[0] || "",
      lastName: "",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function slugifyTenantName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function login(payload: LoginPayload): Promise<AuthApiResponse> {
  const response = await api.post<AuthApiResponse>("/auth/login", payload);
  return response.data;
}

export async function register(payload: RegisterPayload): Promise<AuthApiResponse> {
  const { firstName, lastName } = splitFullName(payload.name);
  const tenantName = payload.company?.trim() || undefined;
  const tenantSlug = tenantName ? slugifyTenantName(tenantName) : "";

  const backendPayload: BackendRegisterPayload = {
    email: payload.email,
    password: payload.password,
    firstName,
    lastName,
    ...(tenantName ? { tenantName, ...(tenantSlug.length >= 2 ? { tenantSlug } : {}) } : {}),
  };

  const response = await api.post<AuthApiResponse>("/auth/register", backendPayload);
  return response.data;
}
