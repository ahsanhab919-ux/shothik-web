import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useChatStream } from "../useChatStream";

function sseResponse(chunks: string[], keepOpen = false) {
  let ctrl: ReadableStreamDefaultController<Uint8Array> | null = null;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      ctrl = c;
      for (const ch of chunks) c.enqueue(encoder.encode(ch));
      if (!keepOpen) c.close();
    },
  });
  const response = new Response(stream, { status: 200 });
  return { response, close: () => ctrl?.close() };
}

const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock.mockReset();
  localStorage.clear();
});

describe("useChatStream", () => {
  it("streams assistant content and appends to the transcript", async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        'data: {"content":"Hello"}\n\n',
        'data: {"content":" world"}\n\n',
        'data: {"done":true}\n\n',
      ]).response,
    );

    const { result } = renderHook(() => useChatStream({ persistence: null }));

    await act(async () => {
      await result.current.send("hi");
    });

    const assistant = result.current.messages.find((m) => m.role === "assistant");
    expect(result.current.messages[0].content).toBe("hi");
    expect(assistant?.content).toBe("Hello world");
    expect(assistant?.streaming).toBeFalsy();
    expect(result.current.isStreaming).toBe(false);
  });

  it("sends the selected model in the request body", async () => {
    fetchMock.mockResolvedValue(sseResponse(['data: {"done":true}\n\n']).response);
    const { result } = renderHook(() =>
      useChatStream({ persistence: null, model: "gemini-2.5-pro" }),
    );
    await act(async () => {
      await result.current.send("hi");
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("gemini-2.5-pro");
  });

  it("persists via the Convex adapter when authenticated", async () => {
    fetchMock.mockResolvedValue(
      sseResponse(['data: {"content":"ok"}\n\n', 'data: {"done":true}\n\n']).response,
    );
    const appendMessage = vi.fn();
    const { result } = renderHook(() =>
      useChatStream({ persistence: { appendMessage } }),
    );

    await act(async () => {
      await result.current.send("hi");
    });

    // one call for the user message, one for the finalized assistant message
    expect(appendMessage).toHaveBeenCalledTimes(2);
    expect(appendMessage.mock.calls[0][0].role).toBe("user");
    expect(appendMessage.mock.calls[1][0].role).toBe("assistant");
    expect(localStorage.getItem("shothik_chat_history")).toBeNull();
  });

  it("falls back to localStorage when unauthenticated (no adapter)", async () => {
    fetchMock.mockResolvedValue(
      sseResponse(['data: {"content":"ok"}\n\n', 'data: {"done":true}\n\n']).response,
    );
    const { result } = renderHook(() =>
      useChatStream({ persistence: null, storageKey: "test_history" }),
    );

    await act(async () => {
      await result.current.send("hi");
    });

    const stored = JSON.parse(localStorage.getItem("test_history") || "[]");
    expect(stored.length).toBeGreaterThanOrEqual(1);
    expect(stored.some((m: any) => m.content === "ok")).toBe(true);
  });

  it("stop() aborts the in-flight request", async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");
    const handle = sseResponse(['data: {"content":"partial"}\n\n'], true);
    fetchMock.mockResolvedValue(handle.response);

    const { result } = renderHook(() => useChatStream({ persistence: null }));

    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.send("hi");
    });

    await waitFor(() => expect(result.current.isStreaming).toBe(true));

    act(() => {
      result.current.stop();
    });
    expect(abortSpy).toHaveBeenCalled();

    handle.close();
    await act(async () => {
      await sendPromise;
    });
    abortSpy.mockRestore();
  });
});
