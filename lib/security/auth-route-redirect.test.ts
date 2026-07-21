import { describe, expect, it } from "vitest";

import {
  buildLoginRedirectTarget,
  getAuthenticatedAuthRouteRedirect,
  isProtectedWorkspaceRoute,
} from "@/lib/security/auth-route-redirect";

describe("getAuthenticatedAuthRouteRedirect", () => {
  it("allows the post-login route to render for authenticated sessions", () => {
    expect(getAuthenticatedAuthRouteRedirect("/auth/post-login")).toEqual({
      allowThrough: true,
      target: null,
    });
  });

  it("allows nested post-login routes to render for authenticated sessions", () => {
    expect(getAuthenticatedAuthRouteRedirect("/auth/post-login/continue")).toEqual({
      allowThrough: true,
      target: null,
    });
  });

  it("redirects other auth routes into post-login", () => {
    expect(getAuthenticatedAuthRouteRedirect("/auth/login")).toEqual({
      allowThrough: false,
      target: "/auth/post-login",
    });
  });

  it("preserves the requested redirect destination", () => {
    expect(
      getAuthenticatedAuthRouteRedirect("/auth/login", "/agents/chat?tab=recent"),
    ).toEqual({
      allowThrough: false,
      target: "/auth/post-login?redirect=%2Fagents%2Fchat%3Ftab%3Drecent",
    });
  });
});

describe("isProtectedWorkspaceRoute", () => {
  it("matches exact protected workspace roots", () => {
    expect(isProtectedWorkspaceRoute("/dashboard")).toBe(true);
    expect(isProtectedWorkspaceRoute("/agents/chat")).toBe(true);
    expect(isProtectedWorkspaceRoute("/agents/research")).toBe(true);
    expect(isProtectedWorkspaceRoute("/writing-studio")).toBe(true);
    expect(isProtectedWorkspaceRoute("/twin")).toBe(true);
  });

  it("matches nested protected workspace routes", () => {
    expect(isProtectedWorkspaceRoute("/agents/chat")).toBe(true);
    expect(isProtectedWorkspaceRoute("/agents/research/session")).toBe(true);
    expect(isProtectedWorkspaceRoute("/writing-studio/project")).toBe(true);
    expect(isProtectedWorkspaceRoute("/twin/history")).toBe(true);
  });

  it("does not match unrelated routes", () => {
    expect(isProtectedWorkspaceRoute("/")).toBe(false);
    expect(isProtectedWorkspaceRoute("/agents")).toBe(false);
    expect(isProtectedWorkspaceRoute("/agents/profile/demo")).toBe(false);
    expect(isProtectedWorkspaceRoute("/auth/login")).toBe(false);
    expect(isProtectedWorkspaceRoute("/agentic")).toBe(false);
  });
});

describe("buildLoginRedirectTarget", () => {
  it("preserves requested protected routes for post-login return", () => {
    expect(buildLoginRedirectTarget("/agents/chat", "?tab=recent")).toBe(
      "/auth/login?redirect=%2Fagents%2Fchat%3Ftab%3Drecent",
    );
    expect(buildLoginRedirectTarget("/agents/research", "?id=abc")).toBe(
      "/auth/login?redirect=%2Fagents%2Fresearch%3Fid%3Dabc",
    );
  });

  it("does not add a redirect parameter for the root route", () => {
    expect(buildLoginRedirectTarget("/")).toBe("/auth/login");
  });
});
