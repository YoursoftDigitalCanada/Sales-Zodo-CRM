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

export type SignupPlan = "basic" | "standard" | "premium";

export interface SignupOtpPayload {
  email: string;
  phone?: string;
  channel: "email" | "phone";
}

export interface SignupOtpVerifyPayload extends SignupOtpPayload {
  otp: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  companyName: string;
  companyType: "individual" | "startup" | "sme" | "enterprise";
  phone: string;
  country: string;
  plan: SignupPlan;
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

export async function sendSignupOtp(
  payload: SignupOtpPayload
): Promise<AuthApiResponse> {
  const response = await api.post<AuthApiResponse>("/auth/signup/otp/send", payload);
  return response.data;
}

export async function verifySignupOtp(
  payload: SignupOtpVerifyPayload
): Promise<AuthApiResponse> {
  const response = await api.post<AuthApiResponse>("/auth/signup/otp/verify", payload);
  return response.data;
}

export async function signup(payload: SignupPayload): Promise<AuthApiResponse> {
  const response = await api.post<AuthApiResponse>("/auth/signup", payload);
  return response.data;
}
