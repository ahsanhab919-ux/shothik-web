const REMEMBERED_LOGIN_EMAIL_KEY = "shothik_remembered_login_email";

export function getRememberedLoginEmail() {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage.getItem(REMEMBERED_LOGIN_EMAIL_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function saveRememberedLoginEmail(email: string) {
  if (typeof window === "undefined") return;

  const normalizedEmail = email.trim();
  if (!normalizedEmail) {
    clearRememberedLoginEmail();
    return;
  }

  try {
    window.localStorage.setItem(REMEMBERED_LOGIN_EMAIL_KEY, normalizedEmail);
  } catch {
    // Ignore storage restrictions so successful auth is never downgraded to a UI failure.
  }
}

export function clearRememberedLoginEmail() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(REMEMBERED_LOGIN_EMAIL_KEY);
  } catch {
    // Ignore storage restrictions so successful auth is never downgraded to a UI failure.
  }
}
