import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PublishingPage } from "./PublishingPage";

vi.mock("@/components/tools/writing-studio/workspace/publish/PublishWizard", () => ({
  PublishWizard: ({ bookTitle }: { bookTitle: string }) => (
    <div data-testid="publish-wizard">{bookTitle}</div>
  ),
}));

describe("PublishingPage", () => {
  it("uses the shared glass chrome header and passes the resolved title to the publish wizard", () => {
    render(<PublishingPage project={{ title: "Glass Book" }} />);

    const header = screen
      .getByText("Publishing Workflow")
      .closest("header");

    expect(header).toHaveClass("glass-chrome");
    expect(screen.getByTestId("publish-wizard")).toHaveTextContent("Glass Book");
  });
});
