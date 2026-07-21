import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { ENV } from "@/config/env";
import {
  clearLegacyClientAuthState,
  redirectToLogin,
  refreshInsforgeSession,
} from "@/lib/http/session-auth";

interface RetryableAxiosConfig extends InternalAxiosRequestConfig {
  _sessionRetryAttempted?: boolean;
}

// Create an axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: ENV.api_url || "",
  timeout: 10000, // 10 seconds timeout
  withCredentials: true,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    clearLegacyClientAuthState();
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableAxiosConfig | undefined;

    if (error.response?.status === 401) {
      if (config && !config._sessionRetryAttempted) {
        config._sessionRetryAttempted = true;
        const refreshed = await refreshInsforgeSession();
        if (refreshed) {
          return apiClient(config);
        }
      }

      redirectToLogin();
      return Promise.reject(error);
    }

    if (!error.response) {
      if (error.message.includes("timeout")) {
        return Promise.reject(new Error("Network timeout, please try again later."));
      }
      return Promise.reject(new Error("Network error, please check your connection."));
    }

    return Promise.reject(error);
  }
);

// Helper function for error handling
export function handleError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response) {
    return error.response.data.message || "An error occurred. Please try again later.";
  }
  return "An unexpected error occurred. Please check your connection and try again later.";
}

export { apiClient };
