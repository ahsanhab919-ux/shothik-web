export function isStripeWebhookPath(pathname: string) {
  return pathname.startsWith("/api/stripe/") && pathname.endsWith("/webhook");
}

export function isPublicApiPath(pathname: string) {
  return (
    pathname === "/api/health" ||
    pathname.startsWith("/api/.well-known") ||
    pathname.startsWith("/api/forum/og/") ||
    pathname === "/api/zoho-webhook" ||
    pathname === "/api/latex" ||
    pathname.startsWith("/api/latex/") ||
    pathname === "/api/writing-studio/quality-check" ||
    pathname === "/api/user-limit" ||
    pathname === "/api/book-agent" ||
    pathname.startsWith("/api/auth/") ||
    isStripeWebhookPath(pathname)
  );
}
