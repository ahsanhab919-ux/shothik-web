import { NextRequest, NextResponse } from "next/server";
import { isAgentKey, hashAgentKey } from "@/lib/agent-auth";
import logger from "@/lib/logger";
import {
  createTwinNotification,
  getTwinByKeyHash,
  type TwinNotificationType,
} from "@/lib/twin/insforge-twin-service";

export async function POST(req: NextRequest) {
  let body: {
    projectId?: string;
    title?: string;
    message?: string;
    wordCount?: number;
    agentId?: string;
    masterId?: string;
    type?: TwinNotificationType;
    bookId?: string;
    bookTitle?: string;
    feedback?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { projectId, title, message, wordCount, type, bookId, bookTitle, feedback } = body;

  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.replace("Bearer ", "");

  if (!apiKey || !isAgentKey(apiKey)) {
    return NextResponse.json({ error: "Agent API key required" }, { status: 401 });
  }

  let resolvedAgentId: string | undefined;
  let resolvedMasterId: string | undefined;
  let resolvedMasterAuthUserId: string | undefined;
  let resolvedMasterEmail: string | undefined;
  let resolvedAgentName: string | undefined;

  try {
    const keyHash = hashAgentKey(apiKey);
    const agent = await getTwinByKeyHash(keyHash);
    if (!agent) {
      return NextResponse.json({ error: "Invalid agent API key" }, { status: 401 });
    }
    if (agent.lifecycleState === "suspended") {
      return NextResponse.json({ error: "Invalid agent API key" }, { status: 401 });
    }
    resolvedAgentId = agent.id;
    resolvedMasterId = agent.masterId;
    resolvedMasterAuthUserId = agent.masterAuthUserId;
    resolvedMasterEmail = agent.masterEmail;
    resolvedAgentName = agent.name;
  } catch (err) {
    logger.warn("notify-master: failed to resolve agent from key", err);
    return NextResponse.json({ error: "Invalid agent API key" }, { status: 401 });
  }

  const notificationType: TwinNotificationType =
    type ?? "review_needed";

  const notifMessage = message ?? (
    notificationType === "format_complete"
      ? `"${title ?? "Untitled"}" formatting is complete${wordCount ? ` (${wordCount.toLocaleString()} words)` : ""}. Ready for your review.`
      : notificationType === "forum_opened"
      ? `Forum opened for "${title ?? "Untitled"}". Agents and readers can now discuss.`
      : notificationType === "revision_requested"
      ? `Revision requested for "${title ?? "Untitled"}". Please review the feedback.`
      : `"${title ?? "Untitled"}" is ready for review${wordCount ? ` (${wordCount.toLocaleString()} words)` : ""}.`
  );

  try {
    await createTwinNotification({
      masterId: resolvedMasterId,
      masterAuthUserId: resolvedMasterAuthUserId,
      twinId: resolvedAgentId,
      twinName: resolvedAgentName ?? title ?? "Twin",
      type: notificationType,
      bookId,
      bookTitle: bookTitle ?? title,
      message: notifMessage,
      feedback,
    });

    if (process.env.RESEND_API_KEY && resolvedMasterEmail) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "notifications@shothik.ai",
            to: resolvedMasterEmail,
            subject: `Agent notification: ${title ?? "Untitled"}`,
            html: `<p>${notifMessage}</p><p><a href="https://shothik.ai/agents">View in Agent Studio</a></p>`,
          }),
        });
      } catch (emailErr) {
        logger.warn("notify-master: email send failed (non-fatal)", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      notification: {
        projectId: projectId ?? null,
        title: title ?? "Untitled",
        message: notifMessage,
        wordCount: wordCount ?? 0,
        sentAt: new Date().toISOString(),
        stored: true,
        masterId: resolvedMasterId,
      },
    });
  } catch (err: any) {
    logger.error("notify-master: notification persistence failed:", err?.message);
    return NextResponse.json({
      success: true,
      notification: {
        projectId: projectId ?? null,
        title: title ?? "Untitled",
        message: notifMessage,
        wordCount: wordCount ?? 0,
        sentAt: new Date().toISOString(),
        stored: false,
        error: err?.message,
      },
    });
  }
}
