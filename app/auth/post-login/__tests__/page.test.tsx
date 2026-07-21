import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { saveAuthFlowState } from "@/lib/auth-flow";
import PostLoginPage from "../page";

const replace = vi.fn();
const trackPostLoginOverride = vi.fn();
const trackPostLoginRecommendation = vi.fn();
const getProjects = vi.fn();
const useAuth = vi.fn();

let currentRedirect: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "redirect" ? currentRedirect : null),
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
  useAuth: () => useAuth(),
}));

vi.mock("@/lib/projects-store", () => ({
  getProjects: () => getProjects(),
}));

vi.mock("@/lib/posthog", () => ({
  trackPostLoginOverride: (...args: unknown[]) => trackPostLoginOverride(...args),
  trackPostLoginRecommendation: (...args: unknown[]) => trackPostLoginRecommendation(...args),
}));

describe("PostLoginPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    replace.mockReset();
    trackPostLoginOverride.mockReset();
    trackPostLoginRecommendation.mockReset();
    getProjects.mockReset();
    useAuth.mockReset();
    currentRedirect = null;
    getProjects.mockReturnValue([]);
    useAuth.mockReturnValue({
      user: { name: "Shothik User" },
      isAuthenticated: true,
      isLoading: false,
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers authenticated remote project history over stale local projects", async () => {
    getProjects.mockReturnValue([
      { _id: "local-project", type: "book", title: "Old Local Draft", lastEditedAt: 100 },
    ]);
    saveAuthFlowState({
      intent: "continue",
      source: "login",
      variant: "contextual",
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        projects: [
          { _id: "remote-project", type: "research", title: "Remote Research Draft", lastEditedAt: 500 },
        ],
      }),
    } as Response);

    render(<PostLoginPage />);

    expect((await screen.findAllByText("/writing-studio?projectId=remote-project")).length).toBeGreaterThan(0);
    expect(screen.queryByText("/writing-studio?projectId=local-project")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(trackPostLoginRecommendation).toHaveBeenCalledWith(
        "/writing-studio?projectId=remote-project",
        "recent_project",
        "continue"
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue now/i }));
    expect(replace).toHaveBeenCalledWith("/writing-studio?projectId=remote-project");
  });

  it("falls back to local project history when authenticated project loading fails", async () => {
    getProjects.mockReturnValue([
      { _id: "local-project", type: "assignment", title: "Recovered Local Draft", lastEditedAt: 300 },
    ]);
    saveAuthFlowState({
      intent: "continue",
      source: "login",
      variant: "contextual",
    });

    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));

    render(<PostLoginPage />);

    expect((await screen.findAllByText("/writing-studio?projectId=local-project")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Continue now/i }));
    expect(replace).toHaveBeenCalledWith("/writing-studio?projectId=local-project");
  });
});
