import axios from "axios";
import { getAccessToken, clearAuthSession } from "@/features/auth/lib/auth-storage";
import { API_BASE_URL, normalizeApiEndpoint } from "@/services/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (config.url) {
      config.url = normalizeApiEndpoint(config.url);
    }

    const token = getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = typeof error.config?.url === "string" ? error.config.url : "";
    const normalizedUrl = url ? normalizeApiEndpoint(url) : "";
    const skipRedirect401 =
      normalizedUrl === "/auth/login" || normalizedUrl === "/auth/register";

    if (error.response?.status === 401 && !skipRedirect401) {
      clearAuthSession();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
