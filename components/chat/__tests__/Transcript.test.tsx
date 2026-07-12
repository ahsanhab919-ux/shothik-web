import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Transcript, type TranscriptMessage } from "../Transcript";

const messages: TranscriptMessage[] = [
  { id: "u1", role: "user", content: "Hello there", status: "complete" },
  {
    id: "a1",
    role: "assistant",
    content: "Here is **bold** and a list:\n\n- one\n- two",
    status: "complete",
    model: "gemini-2.5-flash",
  },
];

describe("Transcript", () => {
  it("renders markdown content (bold + list)", () => {
    render(<Transcript messages={messages} />);
    expect(screen.getByText("bold").tagName.toLowerCase()).toBe("strong");
    expect(screen.getByText("one")).toBeTruthy();
    expect(screen.getByText("two")).toBeTruthy();
  });

  it("exposes per-message action buttons and fires callbacks", () => {
    const onDelete = vi.fn();
    const onRegenerate = vi.fn();
    render(
      <Transcript messages={messages} onDelete={onDelete} onRegenerate={onRegenerate} />
    );
    const deleteButtons = screen.getAllByRole("button", { name: /delete message/i });
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /regenerate response/i }));
    expect(onRegenerate).toHaveBeenCalled();
  });
});
