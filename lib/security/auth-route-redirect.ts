const PROTECTED_WORKSPACE_ROUTE_PREFIXES = [
  "/dashboard",
  "/agents/chat",
  "/agents/research",
  "/writing-studio",
  "/twin",
] as const;

function isExactOrNestedPath(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function getAuthenticatedAuthRouteRedirect(
  pathname: string,
  redirectParam?: string | null,
) {
  if (pathname === "/auth/post-login" || pathname.startsWith("/auth/post-login/")) {
    return {
      allowThrough: true,
      target: null,
    };
  }

  const target = new URL("/auth/post-login", "https://example.com");
  if (redirectParam) {
    target.searchParams.set("redirect", redirectParam);
  }

  return {
    allowThrough: false,
    target: `${target.pathname}${target.search}`,
  };
}

export function isProtectedWorkspaceRoute(pathname: string) {
  return PROTECTED_WORKSPACE_ROUTE_PREFIXES.some((prefix) =>
    isExactOrNestedPath(pathname, prefix),
  );
}

export function buildLoginRedirectTarget(pathname: string, search = "") {
  const target = new URL("/auth/login", "https://example.com");
  const requestedPath = `${pathname}${search}`;

  if (requestedPath !== "/") {
    target.searchParams.set("redirect", requestedPath);
  }

  return `${target.pathname}${target.search}`;
}
