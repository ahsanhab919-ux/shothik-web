import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/agents/AgentLandingPage", () => ({
  default: () => <div data-testid="agent-landing-page">Agent landing</div>,
}));

vi.mock("@/components/agents/shared/AgentContextProvider", () => ({
  AgentContextProvider: ({ children }) => (
    <div data-testid="agent-context-provider">{children}</div>
  ),
}));

import AgentsPage, { metadata } from "./page";

describe("AgentsPage", () => {
  it("renders the public agents landing page inside the agent context", () => {
    render(<AgentsPage />);

    expect(screen.getByTestId("agent-context-provider")).toBeInTheDocument();
    expect(screen.getByTestId("agent-landing-page")).toBeInTheDocument();
  });

  it("describes the public agent landing page for discovery", () => {
    expect(metadata).toMatchObject({
      title: "AI Agents - Shothik AI",
    });
    expect(metadata.description).toContain("Sign in only when you want to start");
  });
});
