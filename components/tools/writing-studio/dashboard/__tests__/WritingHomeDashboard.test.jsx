import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import WritingHomeDashboard from "../WritingHomeDashboard";

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag) => {
        const Component = ({ children, ...props }) =>
          React.createElement(tag, props, children);
        return Component;
      },
    },
  ),
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key) => (key === "intent" ? "research" : null),
  }),
}));

vi.mock("@/hooks/useProjectsStore", () => ({
  getTemplates: () => [
    {
      id: "journal",
      name: "Journal Article",
      description: "Structured journal-ready template.",
      icon: "FlaskConical",
    },
  ],
  useProjectsStore: () => ({
    projects: [
      {
        _id: "project-1",
        title: "Research Draft",
        description: "Test draft",
        type: "research",
        template: "Journal Article",
        wordCount: 1200,
        progress: 35,
        lastEditedAt: Date.now(),
      },
    ],
    isLoading: false,
    isAuthenticated: true,
    createProject: vi.fn(),
    deleteProject: vi.fn(),
  }),
}));

vi.mock("../CreateProjectModal", () => ({
  default: () => null,
}));

describe("WritingHomeDashboard", () => {
  it("uses shared glass utilities for the dashboard header and intent guidance panel", () => {
    const { container } = render(
      <WritingHomeDashboard onOpenProject={vi.fn()} onNewProject={vi.fn()} />,
    );

    expect(container.querySelector(".glass-chrome")).toBeInTheDocument();
    expect(
      screen.getByText("Start with a research paper").closest(".glass-panel"),
    ).toBeInTheDocument();
  });
});
