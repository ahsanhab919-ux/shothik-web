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

  it("authed regenerate deletes the superseded assistant server-side and does NOT re-insert the user message", async () => {
    fetchMock.mockResolvedValue(
      sseResponse(['data: {"content":"first"}\n\n', 'data: {"done":true}\n\n']).response,
    );
    const appendMessage = vi.fn();
    const deleteMessagesAfter = vi.fn();
    const { result } = renderHook(() =>
      useChatStream({ persistence: { appendMessage, deleteMessagesAfter } }),
    );

    await act(async () => {
      await result.current.send("hi");
    });
    const firstAssistant = result.current.messages.find((m) => m.role === "assistant");
    expect(firstAssistant?.content).toBe("first");

    fetchMock.mockResolvedValue(
      sseResponse(['data: {"content":"second"}\n\n', 'data: {"done":true}\n\n']).response,
    );
    await act(async () => {
      await result.current.regenerate();
    });

    // superseded assistant dropped server-side, keyed by the assistant's id
    expect(deleteMessagesAfter).toHaveBeenCalledTimes(1);
    expect(deleteMessagesAfter).toHaveBeenCalledWith(firstAssistant?.id);

    // no duplicate user row persisted, and exactly one user remains in the UI
    const userAppends = appendMessage.mock.calls.filter((c) => c[0].role === "user");
    expect(userAppends.length).toBe(1);
    expect(result.current.messages.filter((m) => m.role === "user").length).toBe(1);
    expect(result.current.messages.find((m) => m.role === "assistant")?.content).toBe("second");
  });

  it("authed deleteMessage calls the Convex delete adapter (not just local state)", async () => {
    fetchMock.mockResolvedValue(
      sseResponse(['data: {"content":"ok"}\n\n', 'data: {"done":true}\n\n']).response,
    );
    const appendMessage = vi.fn();
    const deleteMessage = vi.fn();
    const { result } = renderHook(() =>
      useChatStream({ persistence: { appendMessage, deleteMessage } }),
    );
    await act(async () => {
      await result.current.send("hi");
    });
    const assistant = result.current.messages.find((m) => m.role === "assistant");

    act(() => {
      result.current.deleteMessage(assistant!.id);
    });

    expect(deleteMessage).toHaveBeenCalledWith(assistant!.id);
    expect(result.current.messages.some((m) => m.id === assistant!.id)).toBe(false);
  });

  it("skips a malformed data: line but keeps streaming (F5 parse guard)", async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        "data: not-json\n\n",
        'data: {"content":"ok"}\n\n',
        'data: {"done":true}\n\n',
      ]).response,
    );
    const { result } = renderHook(() => useChatStream({ persistence: null }));
    await act(async () => {
      await result.current.send("hi");
    });
    const assistant = result.current.messages.find((m) => m.role === "assistant");
    expect(assistant?.content).toBe("ok");
    expect(assistant?.error).toBeFalsy();
  });

  it("surfaces an intentional data.error as an error message (F5 parse guard)", async () => {
    fetchMock.mockResolvedValue(sseResponse(['data: {"error":"boom"}\n\n']).response);
    const { result } = renderHook(() => useChatStream({ persistence: null }));
    await act(async () => {
      await result.current.send("hi");
    });
    const assistant = result.current.messages.find((m) => m.role === "assistant");
    expect(assistant?.error).toBe(true);
  });

  it("does not persist anywhere while auth is unresolved (no adapter, no storageKey)", async () => {
    fetchMock.mockResolvedValue(
      sseResponse(['data: {"content":"ok"}\n\n', 'data: {"done":true}\n\n']).response,
    );
    const { result } = renderHook(() => useChatStream({ persistence: null }));
    await act(async () => {
      await result.current.send("hi");
    });
    // During the auth-loading window ChatAgentPage passes neither a persistence
    // adapter nor a storageKey, so nothing must reach localStorage (F2).
    expect(localStorage.length).toBe(0);
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
