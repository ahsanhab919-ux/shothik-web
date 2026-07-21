import { NextRequest } from "next/server";
import { getChatAuthenticatedUser } from "@/lib/server-auth";
import {
  appendPersistedAssistantChunk,
  appendPersistedUserMessage,
  completePersistedAssistantMessage,
  createPersistedAssistantMessage,
  createPersistedConversation,
  failPersistedAssistantMessage,
  getConversationForUser,
  stopPersistedAssistantMessage,
} from "@/lib/chat/server";

const SYSTEM_PROMPT = `You are Shothik, an intelligent AI assistant built for university students and STEM researchers. You help with:
- Academic writing, research, and study questions
- Explaining complex concepts clearly
- Summarizing papers and topics
- Generating ideas and outlines
- Answering questions about science, technology, engineering, and mathematics
- General knowledge and curiosity-driven conversations

Be concise, warm, and accurate. If you don't know something, say so honestly.`;

const DEFAULT_CHAT_MODEL = "gemini-flash-latest";
const LEGACY_CHAT_MODEL_ALIASES: Record<string, string> = {
  "gemini-2.5-flash": DEFAULT_CHAT_MODEL,
  "gemini-2.5-flash-lite": DEFAULT_CHAT_MODEL,
  "gemini-2.0-flash": DEFAULT_CHAT_MODEL,
  "gemini-2.5-pro": "gemini-pro-latest",
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

function normalizeChatModelHandle(modelHandle?: string | null) {
  const normalized = modelHandle?.trim();
  if (!normalized) {
    return DEFAULT_CHAT_MODEL;
  }

  return LEGACY_CHAT_MODEL_ALIASES[normalized] ?? normalized;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getChatAuthenticatedUser();
    if (!user?._id) {
      return new Response(JSON.stringify({
        error: "Authentication required",
        code: "INSFORGE_SESSION_REQUIRED",
        message: "Please sign in again to continue using chat.",
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    if (!checkLimit(ip)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { messages, context, conversationId, surface, modelHandle, contextRef } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
      context?: string;
      conversationId?: string;
      surface?: "flagship" | "writing-studio" | "sheet" | "research" | "book-agent";
      modelHandle?: string;
      contextRef?: {
        projectId?: string;
        bookId?: string;
        sheetId?: string;
        researchId?: string;
        localProjectId?: string;
        agentType?: string;
      };
    };

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey =
      process.env.AI_INTEGRATIONS_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY;
    const rawBaseUrl =
      process.env.AI_INTEGRATIONS_GEMINI_BASE_URL ||
      "https://generativelanguage.googleapis.com";
    const baseUrl = rawBaseUrl.includes("/v1beta")
      ? rawBaseUrl.replace(/\/$/, "")
      : `${rawBaseUrl.replace(/\/$/, "")}/v1beta`;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const effectiveModelHandle = normalizeChatModelHandle(modelHandle);

    const effectiveConversation =
      conversationId
        ? await getConversationForUser(conversationId, String(user._id))
        : await createPersistedConversation({
            userId: String(user._id),
            surface: surface ?? "flagship",
            title: messages.find((m) => m.role === "user")?.content?.slice(0, 80) ?? "New chat",
            modelHandle: effectiveModelHandle,
            temporary: false,
            contextRef,
          });

    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    if (!lastUserMessage) {
      return new Response(JSON.stringify({ error: "A user message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const persistedUserMessage = await appendPersistedUserMessage({
      conversationId: String(effectiveConversation._id),
      userId: String(user._id),
      content: lastUserMessage.content,
    });

    const persistedAssistantMessage = await createPersistedAssistantMessage({
      conversationId: String(effectiveConversation._id),
      userId: String(user._id),
      modelHandle: effectiveModelHandle,
      parentMessageId: String(persistedUserMessage._id),
    });

    const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];

    if (context && context.trim()) {
      contents.push({
        role: "user",
        parts: [{ text: `Document context for reference:\n${context.slice(0, 2000)}` }],
      });
      contents.push({
        role: "model",
        parts: [{ text: "Understood. I'll use this document context to inform my responses." }],
      });
    }

    for (const m of messages) {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    }

    const geminiRes = await fetch(
      `${baseUrl}/models/${effectiveModelHandle}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: request.signal,
        body: JSON.stringify({
          contents,
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.8,
          },
        }),
      }
    );

    const encoder = new TextEncoder();

    if (!geminiRes.ok || !geminiRes.body) {
      const errText = await geminiRes.text().catch(() => "unknown");
      console.error("[chat] Gemini error:", geminiRes.status, errText);
      await failPersistedAssistantMessage({
        messageId: String(persistedAssistantMessage._id),
        userId: String(user._id),
        errorCode: `provider_${geminiRes.status}`,
        fallbackText: "Sorry, something went wrong. Please try again.",
      });
      const errStream = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "conversation",
                conversationId: String(effectiveConversation._id),
              })}\n\n`
            )
          );
          ctrl.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "message_start",
                messageId: String(persistedAssistantMessage._id),
              })}\n\n`
            )
          );
          ctrl.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                messageId: String(persistedAssistantMessage._id),
                error: `AI service error (${geminiRes.status})`,
              })}\n\n`
            )
          );
          ctrl.close();
        },
      });
      return new Response(errStream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let aborted = false;
        let failed = false;

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "conversation",
              conversationId: String(effectiveConversation._id),
            })}\n\n`
          )
        );
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "message_start",
              messageId: String(persistedAssistantMessage._id),
            })}\n\n`
          )
        );

        try {
          while (true) {
            if (request.signal.aborted) {
              aborted = true;
              await stopPersistedAssistantMessage({
                messageId: String(persistedAssistantMessage._id),
                userId: String(user._id),
              });
              break;
            }
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6).trim();
              if (!raw || raw === "[DONE]") continue;

              try {
                const chunk = JSON.parse(raw);
                const text = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (typeof text === "string" && text) {
                  await appendPersistedAssistantChunk({
                    messageId: String(persistedAssistantMessage._id),
                    userId: String(user._id),
                    delta: text,
                  });
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "chunk",
                        messageId: String(persistedAssistantMessage._id),
                        content: text,
                      })}\n\n`
                    )
                  );
                }
              } catch {
              }
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Stream error";
          failed = true;
          if (err instanceof Error && err.name === "AbortError") {
            aborted = true;
            await stopPersistedAssistantMessage({
              messageId: String(persistedAssistantMessage._id),
              userId: String(user._id),
            });
          } else {
            await failPersistedAssistantMessage({
              messageId: String(persistedAssistantMessage._id),
              userId: String(user._id),
              errorCode: "stream_error",
              fallbackText: "Sorry, something went wrong. Please try again.",
            });
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                messageId: String(persistedAssistantMessage._id),
                error: msg,
              })}\n\n`
            )
          );
        } finally {
          if (!aborted && !failed) {
            await completePersistedAssistantMessage({
              messageId: String(persistedAssistantMessage._id),
              userId: String(user._id),
            });
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                messageId: String(persistedAssistantMessage._id),
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
