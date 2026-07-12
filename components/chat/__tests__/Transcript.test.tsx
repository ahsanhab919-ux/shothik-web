import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Transcript } from "../Transcript";
import type { ChatMessage } from "../types";

describe("Transcript", () => {
  it("renders assistant markdown (bold + list) instead of raw text", () => {
    const messages: ChatMessage[] = [
      { id: "u1", role: "user", content: "hi", timestamp: 1 },
      {
        id: "a1",
        role: "assistant",
        content: "This is **bold** and:\n\n- one\n- two",
        timestamp: 2,
      },
    ];
    const { container } = render(<Transcript messages={messages} />);

    expect(container.querySelector("strong")?.textContent).toBe("bold");
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe("one");
  });

  it("hides system messages", () => {
    const messages: ChatMessage[] = [
      { id: "s1", role: "system", content: "system prompt", timestamp: 1 },
      { id: "u1", role: "user", content: "visible user text", timestamp: 2 },
    ];
    render(<Transcript messages={messages} />);
    expect(screen.queryByText("system prompt")).toBeNull();
    expect(screen.getByText("visible user text")).toBeTruthy();
  });

  it("marks the streaming assistant message as an ARIA live region", () => {
    const messages: ChatMessage[] = [
      { id: "a1", role: "assistant", content: "typing", streaming: true, timestamp: 1 },
    ];
    const { container } = render(<Transcript messages={messages} />);
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
  });
});
