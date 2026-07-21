import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { exchangeOAuthRoute, getCurrentUser } = vi.hoisted(() => ({
  exchangeOAuthRoute: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/insforge/client", () => ({
  getInsforgeBrowserClient: () => ({
    auth: {
      getCurrentUser,
    },
  }),
}));

import { AuthProvider, useAuth } from "@/providers/AuthProvider";

function AuthConsumer() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div>Loading auth</div>;
  }

  return (
    <div>
      <div>{auth.isAuthenticated ? "authenticated" : "anonymous"}</div>
      <div>{auth.user?.email ?? "no-user"}</div>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    exchangeOAuthRoute.mockReset();
    getCurrentUser.mockReset();
    vi.stubGlobal("fetch", exchangeOAuthRoute);
    window.history.replaceState({}, "", "http://localhost:3000/auth/post-login");
    window.sessionStorage.clear();
  });

  it("exchanges insforge_code through the local auth route and hydrates the authenticated user", async () => {
    exchangeOAuthRoute.mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: "user-1",
            _id: "user-1",
            name: "Writer Example",
            email: "writer@example.com",
            authProvider: "insforge",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    getCurrentUser.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    });

    window.history.replaceState(
      {},
      "",
      "http://localhost:3000/auth/post-login?insforge_code=test-oauth-code",
    );
    window.sessionStorage.setItem("shothik.oauth.google.codeVerifier", "verifier-1");

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(exchangeOAuthRoute).toHaveBeenCalledWith("/api/auth/oauth/exchange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: "test-oauth-code", codeVerifier: "verifier-1" }),
      });
    });
    await waitFor(() => {
      expect(screen.getByText("authenticated")).toBeInTheDocument();
    });

    expect(screen.getByText("writer@example.com")).toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(window.sessionStorage.getItem("shothik.oauth.google.codeVerifier")).toBeNull();
  });

  it("falls back to an anonymous state when no current user is available", async () => {
    getCurrentUser.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("anonymous")).toBeInTheDocument();
    });
    expect(screen.getByText("no-user")).toBeInTheDocument();
    expect(exchangeOAuthRoute).not.toHaveBeenCalled();
  });

  it("omits the PKCE verifier when the callback does not have one stored", async () => {
    exchangeOAuthRoute.mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: "user-2",
            _id: "user-2",
            name: "Code Only",
            email: "code-only@example.com",
            authProvider: "insforge",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    getCurrentUser.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    });

    window.history.replaceState(
      {},
      "",
      "http://localhost:3000/auth/post-login?insforge_code=code-only-oauth",
    );

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(exchangeOAuthRoute).toHaveBeenCalledWith("/api/auth/oauth/exchange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: "code-only-oauth" }),
      });
    });
    await waitFor(() => {
      expect(screen.getByText("authenticated")).toBeInTheDocument();
    });
    expect(screen.getByText("code-only@example.com")).toBeInTheDocument();
  });

  it("stays anonymous when the OAuth callback exchange fails", async () => {
    exchangeOAuthRoute.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "AUTH_UNAUTHORIZED",
          message: "OAuth exchange failed",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    getCurrentUser.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    });

    window.history.replaceState(
      {},
      "",
      "http://localhost:3000/auth/post-login?insforge_code=failed-oauth",
    );
    window.sessionStorage.setItem("shothik.oauth.google.codeVerifier", "failed-verifier");

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(exchangeOAuthRoute).toHaveBeenCalledWith("/api/auth/oauth/exchange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: "failed-oauth", codeVerifier: "failed-verifier" }),
      });
    });
    await waitFor(() => {
      expect(screen.getByText("anonymous")).toBeInTheDocument();
    });
    expect(screen.getByText("no-user")).toBeInTheDocument();
    expect(window.location.search).toBe("?insforge_code=failed-oauth");
    expect(window.sessionStorage.getItem("shothik.oauth.google.codeVerifier")).toBe(
      "failed-verifier",
    );
  });
});
