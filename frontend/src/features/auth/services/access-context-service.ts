import api from "@/lib/axios";

interface AccessContextResponse {
  permissions: string[];
  employee: unknown;
}

export async function getCurrentAccessContext(): Promise<AccessContextResponse> {
  const response = await api.get("/permissions/current");
  return response.data?.data as AccessContextResponse;
}
