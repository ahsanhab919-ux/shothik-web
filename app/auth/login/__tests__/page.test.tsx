import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "../page";

const originalLocalStorage = window.localStorage;
const replace = vi.fn();
const login = vi.fn();
const trackLoginIntentCaptured = vi.fn();

let currentIntent = "continue";
let currentRedirect: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "intent") return currentIntent;
      if (key === "redirect") return currentRedirect;
      return null;
    },
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
    currentIntent = "continue";
    currentRedirect = null;
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
