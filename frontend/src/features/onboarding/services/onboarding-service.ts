import api from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { OnboardingPayload, TenantOnboardingApiResponse } from "@/lib/onboarding-config";

export async function getTenantOnboarding(): Promise<ApiResponse<TenantOnboardingApiResponse>> {
  const response = await api.get<ApiResponse<TenantOnboardingApiResponse>>("/tenants/onboarding");
  return response.data;
}

export async function completeTenantOnboarding(
  payload: OnboardingPayload
): Promise<ApiResponse<TenantOnboardingApiResponse>> {
  const response = await api.put<ApiResponse<TenantOnboardingApiResponse>>("/tenants/onboarding", payload);
  return response.data;
}
