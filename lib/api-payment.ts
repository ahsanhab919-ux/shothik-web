import axios, { InternalAxiosRequestConfig } from "axios";

const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
};

export const paymentSystemBaseUrl =
  process.env.NEXT_PUBLIC_PAYMENT_SYSTEM_URL?.trim() ||
  (process.env.NODE_ENV === "production"
    ? "https://payment-qa-svc.shothik.ai"
    : "");

export const hasPaymentSystemBaseUrl = paymentSystemBaseUrl.length > 0;

const api = axios.create({
  baseURL: paymentSystemBaseUrl || undefined,
  timeout: 5000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export default api;
