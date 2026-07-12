import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Composer } from "../Composer";

describe("Composer", () => {
  it("fires onSubmit when Enter is pressed", () => {
    const onSubmit = vi.fn();
    render(
      <Composer value="hello" onChange={() => {}} onSubmit={onSubmit} placeholder="Ask" />
    );
    const textarea = screen.getByPlaceholderText("Ask");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not fire onSubmit on Shift+Enter", () => {
    const onSubmit = vi.fn();
    render(<Composer value="hello" onChange={() => {}} onSubmit={onSubmit} placeholder="Ask" />);
    fireEvent.keyDown(screen.getByPlaceholderText("Ask"), { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a stop button and calls onStop while generating", () => {
    const onStop = vi.fn();
    render(
      <Composer value="" onChange={() => {}} onSubmit={() => {}} onStop={onStop} generating />
    );
    fireEvent.click(screen.getByRole("button", { name: /stop generating/i }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
