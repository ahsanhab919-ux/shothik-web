import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RegisterPage from "../page";

const push = vi.fn();
const register = vi.fn();
let currentIntent = "research";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "intent" ? currentIntent : null),
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
    register,
  }),
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    push.mockReset();
    register.mockReset();
    currentIntent = "research";
  });

  it("shows inline validation errors when required registration fields are invalid", async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Shothik User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "456" } });

    fireEvent.click(screen.getByRole("button", { name: /Create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please fix the highlighted fields before continuing.");
    expect(screen.getByText("Password must be at least 6 characters long.")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match yet.")).toBeInTheDocument();
    expect(screen.getByText("You must agree to the terms and conditions before creating an account.")).toBeInTheDocument();
  });

  it("preserves the selected intent in the login recovery link", () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("What do you want to do first?"), {
      target: { value: "assignment" },
    });

    expect(screen.getByRole("link", { name: /Already have an account\? Login/i })).toHaveAttribute(
      "href",
      "/auth/login?intent=assignment"
    );
  });

  it("renders the account creation privacy disclosure and legal consent links", () => {
    render(<RegisterPage />);

    const notice = screen.getByLabelText(/account creation privacy notice/i);
    const noticeQueries = within(notice);

    expect(notice).toBeInTheDocument();
    expect(noticeQueries.getByText(/Service provider:/i)).toBeInTheDocument();
    expect(noticeQueries.getByRole("link", { name: /Privacy Policy/i })).toHaveAttribute("href", "/privacy");
    expect(noticeQueries.getByRole("link", { name: /Terms & Conditions/i })).toHaveAttribute("href", "/terms");
    expect(noticeQueries.getByRole("link", { name: /Data Deletion Policy/i })).toHaveAttribute("href", "/deletion");
    expect(noticeQueries.getByRole("link", { name: /support@shothik\.ai/i })).toHaveAttribute(
      "href",
      "mailto:support@shothik.ai",
    );
  });

  it("links the consent text to the legal pages", () => {
    render(<RegisterPage />);

    const termsLinks = screen.getAllByRole("link", { name: /Terms & Conditions/i });
    const privacyLinks = screen.getAllByRole("link", { name: /Privacy Policy/i });

    expect(termsLinks.some((link) => link.getAttribute("href") === "/terms")).toBe(true);
    expect(privacyLinks.some((link) => link.getAttribute("href") === "/privacy")).toBe(true);
  });
});
