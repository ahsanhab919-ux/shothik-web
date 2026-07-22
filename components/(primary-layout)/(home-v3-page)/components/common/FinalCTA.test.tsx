import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FinalCTA from "./FinalCTA";

describe("FinalCTA", () => {
  it("links Get Started to the auth-gated writing studio entry", () => {
    render(<FinalCTA />);

    const link = screen.getByRole("link", { name: /get started/i });

    expect(link).toHaveAttribute("href", "/writing-studio?projects=1");
  });
});
