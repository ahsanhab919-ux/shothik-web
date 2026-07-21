import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getPublicAuthConfig = vi.fn();
const signInWithOAuth = vi.fn();

vi.mock("@/lib/insforge/client", () => ({
  getInsforgeBrowserClient: () => ({
    auth: {
      getPublicAuthConfig,
      signInWithOAuth,
    },
  }),
}));

import AuthWithSocial from "@/components/auth/AuthWithSocial";

describe("AuthWithSocial", () => {
  beforeEach(() => {
    getPublicAuthConfig.mockReset();
    signInWithOAuth.mockReset();
    window.sessionStorage.clear();
    getPublicAuthConfig.mockResolvedValue({
      data: {
        oAuthProviders: ["google"],
      },
      error: null,
    });
  });

  it("starts Google OAuth through the InsForge browser client", async () => {
    const setLoading = vi.fn();
    const onBeforeAuthStart = vi.fn();
    const onAuthError = vi.fn();
    signInWithOAuth.mockResolvedValue({
      data: {
        codeVerifier: "verifier-1",
      },
      error: null,
    });

    render(
      <AuthWithSocial
        loading={false}
        setLoading={setLoading}
        onBeforeAuthStart={onBeforeAuthStart}
        onAuthError={onAuthError}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith("google", {
        redirectTo: "http://localhost:3000/auth/post-login",
        skipBrowserRedirect: true,
      });
    });

    expect(window.sessionStorage.getItem("shothik.oauth.google.codeVerifier")).toBe(
      "verifier-1",
    );
    expect(onBeforeAuthStart).toHaveBeenCalledTimes(1);
    expect(onAuthError).not.toHaveBeenCalled();
    expect(setLoading).toHaveBeenCalledWith(true);
  });

  it("replaces any stale verifier before starting a new Google OAuth flow", async () => {
    const setLoading = vi.fn();
    window.sessionStorage.setItem("shothik.oauth.google.codeVerifier", "stale-verifier");
    signInWithOAuth.mockResolvedValue({
      data: {
        codeVerifier: "fresh-verifier",
      },
      error: null,
    });

    render(<AuthWithSocial loading={false} setLoading={setLoading} />);

    fireEvent.click(await screen.findByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(window.sessionStorage.getItem("shothik.oauth.google.codeVerifier")).toBe(
        "fresh-verifier",
      );
    });
  });

  it("surfaces an error when Google OAuth cannot be started", async () => {
    const setLoading = vi.fn();
    const onAuthError = vi.fn();
    window.sessionStorage.setItem("shothik.oauth.google.codeVerifier", "stale-verifier");
    signInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: "Provider disabled" },
    });

    render(
      <AuthWithSocial
        loading={false}
        setLoading={setLoading}
        onAuthError={onAuthError}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(onAuthError).toHaveBeenCalledWith(
        "Google sign-in could not be started. Please try again.",
      );
    });
    expect(setLoading).toHaveBeenCalledWith(true);
    expect(window.sessionStorage.getItem("shothik.oauth.google.codeVerifier")).toBeNull();
  });
});
