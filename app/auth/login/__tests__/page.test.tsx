import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "../page";

const originalLocalStorage = window.localStorage;
const replace = vi.fn();
const login = vi.fn();
const trackLoginIntentCaptured = vi.fn();

let currentSearchParams: Record<string, string | null> = {
  intent: "continue",
  redirect: null,
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
  useSearchParams: () => ({
    get: (key: string) => currentSearchParams[key] ?? null,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    login,
  }),
}));

vi.mock("@/components/auth/AuthWithSocial", () => ({
  default: () => <div>Social auth</div>,
}));

vi.mock("@/lib/posthog", () => ({
  trackLoginIntentCaptured: (...args: unknown[]) => trackLoginIntentCaptured(...args),
}));

function createControlledStorage({
  failOnSetKeys = [],
  failOnRemoveKeys = [],
}: {
  failOnSetKeys?: string[];
  failOnRemoveKeys?: string[];
} = {}): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      if (failOnRemoveKeys.includes(key)) {
        throw new DOMException("Blocked", "SecurityError");
      }
      store.delete(key);
    },
    setItem(key: string, value: string) {
      if (failOnSetKeys.includes(key)) {
        throw new DOMException("Blocked", "SecurityError");
      }
      store.set(key, value);
    },
  };
}

describe("LoginPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    replace.mockReset();
    login.mockReset();
    trackLoginIntentCaptured.mockReset();
    currentSearchParams = {
      intent: "continue",
      redirect: null,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
    });
  });

  it("hydrates the remembered email and checkbox state from local storage", () => {
    window.localStorage.setItem("shothik_remembered_login_email", "remembered@example.com");

    render(<LoginPage />);

    expect(screen.getByLabelText("Email")).toHaveValue("remembered@example.com");
    expect(screen.getByRole("checkbox", { name: /Remember email on this device/i })).toBeChecked();
  });

  it("renders the auth privacy disclosure with legal and rights links", () => {
    render(<LoginPage />);

    const notice = screen.getByLabelText(/login privacy notice/i);
    const noticeQueries = within(notice);

    expect(notice).toBeInTheDocument();
    expect(noticeQueries.getByText(/Service provider:/i)).toBeInTheDocument();
    expect(noticeQueries.getByRole("link", { name: /Privacy Policy/i })).toHaveAttribute("href", "/privacy");
    expect(noticeQueries.getByRole("link", { name: /Terms & Conditions/i })).toHaveAttribute("href", "/terms");
    expect(noticeQueries.getByRole("link", { name: /Data Deletion Policy/i })).toHaveAttribute("href", "/deletion");
    expect(noticeQueries.getByText(/Remember email on this device/i, { selector: "span" })).toBeInTheDocument();
    expect(noticeQueries.getByText(/Google/i)).toBeInTheDocument();
    expect(noticeQueries.getByRole("link", { name: /support@shothik\.ai/i })).toHaveAttribute(
      "href",
      "mailto:support@shothik.ai",
    );
  });

  it("persists the remembered email after a successful login", async () => {
    login.mockResolvedValue(undefined);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: " user@example.com " } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Remember email on this device/i }));
    fireEvent.click(screen.getByRole("button", { name: /Sign in and continue/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("user@example.com", "secret123");
    });

    expect(window.localStorage.getItem("shothik_remembered_login_email")).toBe("user@example.com");
    expect(replace).toHaveBeenCalledWith("/auth/post-login");
  });

  it("preserves a safe redirect target when routing to post-login after successful login", async () => {
    currentSearchParams = {
      intent: "continue",
      redirect: "/agents/chat",
    };
    login.mockResolvedValue(undefined);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign in and continue/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("user@example.com", "secret123");
    });

    expect(replace).toHaveBeenCalledWith("/auth/post-login?redirect=%2Fagents%2Fchat");
  });

  it("shows a rate-limited inline alert when login is throttled", async () => {
    login.mockRejectedValue(new Error("Too many authentication attempts. Please wait before trying again."));

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign in and continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many authentication attempts. Please wait before trying again.",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows an unverified-account inline alert when login requires email verification", async () => {
    login.mockRejectedValue(new Error("Your account needs email verification before you can sign in."));

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign in and continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your account needs email verification before you can sign in.",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders post-registration verification guidance from the login query state", () => {
    currentSearchParams = {
      intent: "continue",
      redirect: null,
      verifyEmail: "1",
      email: "pending@example.com",
    };

    render(<LoginPage />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Registration successful. Enter the verification code from your email before signing in.",
    );
    expect(screen.getByLabelText("Email")).toHaveValue("pending@example.com");
    expect(screen.getByRole("button", { name: /Verify email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resend code/i })).toBeInTheDocument();
  });

  it("renders the verified-email success state from the login query state", () => {
    currentSearchParams = {
      intent: "continue",
      redirect: null,
      verified: "1",
      email: "verified@example.com",
    };

    render(<LoginPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Email verified. You can now sign in.");
    expect(screen.queryByRole("button", { name: /Verify email/i })).not.toBeInTheDocument();
  });

  it("clears the remembered email when the opt-in is disabled", async () => {
    window.localStorage.setItem("shothik_remembered_login_email", "remembered@example.com");
    login.mockResolvedValue(undefined);

    render(<LoginPage />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Remember email on this device/i }));
    expect(window.localStorage.getItem("shothik_remembered_login_email")).toBeNull();

    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign in and continue/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalled();
    });

    expect(window.localStorage.getItem("shothik_remembered_login_email")).toBeNull();
  });

  it("continues to post-login when remembered-email persistence is blocked", async () => {
    Object.defineProperty(window, "localStorage", {
      value: createControlledStorage({
        failOnSetKeys: ["shothik_remembered_login_email"],
      }),
      configurable: true,
    });
    login.mockResolvedValue(undefined);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Remember email on this device/i }));
    fireEvent.click(screen.getByRole("button", { name: /Sign in and continue/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("user@example.com", "secret123");
    });

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/auth/post-login");
    });
    expect(screen.queryByText(/login failed\. please check your credentials and try again\./i)).not.toBeInTheDocument();
  });

  it("continues to post-login when remembered-email clearing is blocked", async () => {
    Object.defineProperty(window, "localStorage", {
      value: createControlledStorage({
        failOnRemoveKeys: ["shothik_remembered_login_email"],
      }),
      configurable: true,
    });
    login.mockResolvedValue(undefined);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign in and continue/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("user@example.com", "secret123");
    });

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/auth/post-login");
    });
    expect(screen.queryByText(/login failed\. please check your credentials and try again\./i)).not.toBeInTheDocument();
  });
});
