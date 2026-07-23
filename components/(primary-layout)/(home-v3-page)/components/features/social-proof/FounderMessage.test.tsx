import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import FounderMessage from "./FounderMessage";

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img alt={alt} {...props} />
  ),
}));

beforeAll(() => {
  class MockIntersectionObserver {
    observe() {}
    disconnect() {}
    unobserve() {}
  }

  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

describe("FounderMessage", () => {
  it("renders the production showcase content instead of the placeholder block", () => {
    render(<FounderMessage />);

    expect(
      screen.getByText("Build confidence from your first draft to your next big launch."),
    ).toBeInTheDocument();
    expect(screen.getByText("Learn faster")).toBeInTheDocument();
    expect(screen.getByText("Work smarter")).toBeInTheDocument();
    expect(screen.getByText("Ship bigger ideas")).toBeInTheDocument();
    expect(
      screen.queryByText(/Secondary screenshot will be placed here/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Add your feature showcase image/i),
    ).not.toBeInTheDocument();
  });
});
