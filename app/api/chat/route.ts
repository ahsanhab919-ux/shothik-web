import { NextRequest } from "next/server";
import { resolveChatModel } from "./models";

const SYSTEM_PROMPT = `You are Shothik, an intelligent AI assistant built for university students and STEM researchers. You help with:
- Academic writing, research, and study questions
- Explaining complex concepts clearly
- Summarizing papers and topics
- Generating ideas and outlines
- Answering questions about science, technology, engineering, and mathematics
- General knowledge and curiosity-driven conversations

Be concise, warm, and accurate. If you don't know something, say so honestly.`;

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

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    if (!checkLimit(ip)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { messages, context, model } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
      context?: string;
      model?: string;
    };

    const resolvedModel = resolveChatModel(model);

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    const baseUrl =
      process.env.AI_INTEGRATIONS_GEMINI_BASE_URL ||
      "https://generativelanguage.googleapis.com";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

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
      `${baseUrl}/models/${resolvedModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const errStream = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: `AI service error (${geminiRes.status})` })}\n\n`
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

        try {
          while (true) {
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
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
                  );
                }
              } catch {
              }
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        } finally {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
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
