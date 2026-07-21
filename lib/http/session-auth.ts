import axios from "axios";

function isBrowser() {
  return typeof window !== "undefined";
}

export function clearLegacyClientAuthState() {
  if (!isBrowser()) return;

  localStorage.removeItem("jwt_token");
  localStorage.removeItem("auth_token");
}

export async function refreshInsforgeSession() {
  if (!isBrowser()) return false;

  try {
    const response = await axios.post(
      "/api/auth/refresh",
      undefined,
      {
        withCredentials: true,
        validateStatus: (status) => status < 500,
      },
    );

    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}

export function redirectToLogin() {
  if (!isBrowser()) return;

  clearLegacyClientAuthState();
  window.location.href = "/auth/login";
}
