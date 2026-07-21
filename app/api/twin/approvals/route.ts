import { NextRequest, NextResponse } from "next/server";
import { authenticateTwinRequest, requireAuth } from "@/lib/twin-api-auth";
import { twinApi, createTwinClient } from "@/lib/twin-convex";
import { checkAbility, logRouteActivity } from "@/lib/twin-route-guard";
import {
  invokeTwinForumCreate,
  TWIN_FORUM_CREATE_TOOL_NAME,
} from "@/lib/twin/mcp-forum-create";
import {
  invokeTwinForumPost,
  TWIN_FORUM_POST_TOOL_NAME,
} from "@/lib/twin/mcp-forum-post";
import {
  invokeTwinBookWrite,
  TWIN_BOOK_WRITE_TOOL_NAME,
} from "@/lib/twin/mcp-book-write";
import {
  invokeTwinBookPublish,
  TWIN_BOOK_PUBLISH_TOOL_NAME,
} from "@/lib/twin/mcp-book-publish";
import {
  invokeTwinCommunityPreview,
  TWIN_COMMUNITY_PREVIEW_TOOL_NAME,
} from "@/lib/twin/mcp-community-preview";
import { invokeTwinTaskExecution } from "@/lib/twin/mcp-task-execution";

export async function GET(req: NextRequest) {
  const auth = await authenticateTwinRequest(req);
  if (!requireAuth(auth)) {
    return NextResponse.json({ error: auth.error ?? "Authentication required" }, { status: 401 });
  }

  const abilityErr = checkAbility(auth, "read", "TwinApproval");
  if (abilityErr) return abilityErr;

  try {
    const convex = createTwinClient(auth.token);
    const approvals = await convex.query(twinApi.twin.getPendingApprovals, { masterId: auth.userId });
    return NextResponse.json({ approvals });
  } catch (err) {
    console.error("[twin/approvals GET]", err);
    return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateTwinRequest(req);
  if (!requireAuth(auth)) {
    return NextResponse.json({ error: auth.error ?? "Authentication required" }, { status: 401 });
  }

  const abilityErr = checkAbility(auth, "manage", "TwinApproval");
  if (abilityErr) return abilityErr;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}

  if (!body.approvalId || !body.action) {
    return NextResponse.json({ error: "approvalId and action are required" }, { status: 400 });
  }

  try {
    const convex = createTwinClient(auth.token);

    const allPending = await convex.query(twinApi.twin.getPendingApprovals, { masterId: auth.userId });
    const targetApproval = (allPending as Array<Record<string, unknown>>).find(
      (a) => a._id === body.approvalId
    );

    if (!targetApproval) {
      return NextResponse.json({ error: "Approval not found or not pending" }, { status: 404 });
    }

    const payload = targetApproval.payload as Record<string, unknown> | undefined;
    let voiceDriftFindings: import("@/lib/re-educator/types").Issue[] = [];
    let voiceGatePassed = true;
    let repairAttempts = 0;
    let bestEffort = false;
    let forumCreation: {
      forumId?: string;
      status: string;
      invocationId?: string;
      error?: string;
    } | null = null;
    let forumPost: {
      postId?: string;
      forumId?: string;
      status: string;
      invocationId?: string;
      error?: string;
    } | null = null;
    let bookWrite: {
      operation?: string;
      bookId?: string;
      status: string;
      invocationId?: string;
      previousState?: string | null;
      newState?: string | null;
      error?: string;
    } | null = null;
    let bookPublish: {
      bookId?: string;
      status: string;
      invocationId?: string;
      previousState?: string | null;
      newState?: string | null;
      error?: string;
    } | null = null;
    let communityPreview: {
      postId?: string;
      bookId?: string;
      forumId?: string;
      status: string;
      invocationId?: string;
      previousState?: string | null;
      newState?: string | null;
      error?: string;
    } | null = null;

    if (body.action === "approve") {
      await convex.mutation(twinApi.twin.approveAction, { approvalId: body.approvalId });

      const taskIdFromPayload = payload?.taskId as string | undefined;

      if (taskIdFromPayload && payload?.taskType && payload?.title) {
        try {
          const execution = await invokeTwinTaskExecution({
            tenantId: auth.userId,
            userId: auth.userId,
            taskId: taskIdFromPayload,
            confirmationToken: "approval_granted",
            traceId: `twin-approval:${String(body.approvalId)}`,
          });

          voiceDriftFindings = execution.voiceDriftFindings as import("@/lib/re-educator/types").Issue[];
          voiceGatePassed = execution.voiceGatePassed;
          repairAttempts = execution.repairAttempts;
          bestEffort = execution.bestEffort;
        } catch (execErr) {
          console.error("[twin/approvals POST] task execution after approval failed:", execErr);
          // Execution produced no text, so the gate did not pass for this work.
          voiceGatePassed = false;
          await convex.mutation(twinApi.twin.updateTaskStatus, {
            taskId: taskIdFromPayload,
            status: "failed",
            result: execErr instanceof Error ? execErr.message : "Execution failed after approval",
          });
        }
      } else if (
        payload?.governedInvocation &&
        typeof payload.governedInvocation === "object" &&
        (payload.governedInvocation as Record<string, unknown>).toolName ===
          TWIN_FORUM_CREATE_TOOL_NAME &&
        typeof payload.title === "string"
      ) {
        try {
          const execution = await invokeTwinForumCreate({
            tenantId: auth.userId,
            userId: auth.userId,
            forum: {
              title: payload.title,
              ...(typeof payload.description === "string"
                ? { description: payload.description }
                : {}),
              ...(payload.participantType === "agent_only" ||
              payload.participantType === "human_only" ||
              payload.participantType === "both"
                ? { participantType: payload.participantType }
                : {}),
              ...(typeof payload.category === "string"
                ? { category: payload.category }
                : {}),
              ...(typeof payload.language === "string"
                ? { language: payload.language }
                : {}),
              ...(payload.votingMode === "balance_of_probabilities" ||
              payload.votingMode === "beyond_reasonable_doubt"
                ? { votingMode: payload.votingMode }
                : {}),
              ...(typeof payload.citationRequired === "boolean"
                ? { citationRequired: payload.citationRequired }
                : {}),
              ...(typeof payload.agentBrief === "string"
                ? { agentBrief: payload.agentBrief }
                : {}),
              ...(typeof payload.agentOpinion === "string"
                ? { agentOpinion: payload.agentOpinion }
                : {}),
            },
            confirmationToken: "approval_granted",
            traceId: `twin-approval:${String(body.approvalId)}:forum-create`,
          });

          forumCreation = {
            forumId: execution.forumId,
            status: execution.status,
            invocationId: execution.invocationId,
          };
        } catch (execErr) {
          console.error(
            "[twin/approvals POST] forum creation after approval failed:",
            execErr,
          );
          forumCreation = {
            status: "failed",
            error:
              execErr instanceof Error
                ? execErr.message
                : "Forum creation failed after approval",
          };
        }
      } else if (
        payload?.governedInvocation &&
        typeof payload.governedInvocation === "object" &&
        (payload.governedInvocation as Record<string, unknown>).toolName ===
          TWIN_FORUM_POST_TOOL_NAME &&
        typeof payload.forumId === "string" &&
        typeof payload.content === "string"
      ) {
        try {
          const execution = await invokeTwinForumPost({
            tenantId: auth.userId,
            userId: auth.userId,
            post: {
              forumId: payload.forumId,
              content: payload.content,
            },
            confirmationToken: "approval_granted",
            traceId: `twin-approval:${String(body.approvalId)}:forum-post`,
          });

          forumPost = {
            postId: execution.postId,
            forumId: execution.forumId,
            status: execution.status,
            invocationId: execution.invocationId,
          };
        } catch (execErr) {
          console.error(
            "[twin/approvals POST] forum posting after approval failed:",
            execErr,
          );
          forumPost = {
            status: "failed",
            forumId: typeof payload.forumId === "string" ? payload.forumId : undefined,
            error:
              execErr instanceof Error
                ? execErr.message
                : "Forum post creation failed after approval",
          };
        }
      } else if (
        payload?.governedInvocation &&
        typeof payload.governedInvocation === "object" &&
        (payload.governedInvocation as Record<string, unknown>).toolName ===
          TWIN_BOOK_WRITE_TOOL_NAME &&
        (payload.operation === "start" ||
          payload.operation === "upload" ||
          payload.operation === "metadata")
      ) {
        try {
          const execution = await invokeTwinBookWrite({
            tenantId: auth.userId,
            userId: auth.userId,
            bookWrite:
              payload.operation === "start"
                ? {
                    operation: "start",
                    title: String(payload.title ?? ""),
                    ...(typeof payload.description === "string"
                      ? { description: payload.description }
                      : {}),
                    ...(typeof payload.category === "string"
                      ? { category: payload.category }
                      : {}),
                    ...(typeof payload.language === "string"
                      ? { language: payload.language }
                      : {}),
                  }
                : payload.operation === "upload"
                  ? {
                      operation: "upload",
                      bookId: String(payload.bookId ?? ""),
                      content: String(payload.content ?? ""),
                    }
                  : {
                      operation: "metadata",
                      bookId: String(payload.bookId ?? ""),
                      ...(typeof payload.title === "string"
                        ? { title: payload.title }
                        : {}),
                      ...(typeof payload.subtitle === "string"
                        ? { subtitle: payload.subtitle }
                        : {}),
                      ...(typeof payload.description === "string"
                        ? { description: payload.description }
                        : {}),
                      ...(typeof payload.category === "string"
                        ? { category: payload.category }
                        : {}),
                      ...(typeof payload.language === "string"
                        ? { language: payload.language }
                        : {}),
                      ...(Array.isArray(payload.keywords)
                        ? {
                            keywords: payload.keywords.filter(
                              (keyword): keyword is string => typeof keyword === "string",
                            ),
                          }
                        : {}),
                    },
            confirmationToken: "approval_granted",
            traceId: `twin-approval:${String(body.approvalId)}:book-write`,
          });

          bookWrite = {
            operation: execution.operation,
            bookId: execution.bookId,
            status: execution.status,
            invocationId: execution.invocationId,
            previousState: execution.previousState,
            newState: execution.newState,
          };
        } catch (execErr) {
          console.error(
            "[twin/approvals POST] book write after approval failed:",
            execErr,
          );
          bookWrite = {
            status: "failed",
            operation:
              payload.operation === "start" ||
              payload.operation === "upload" ||
              payload.operation === "metadata"
                ? payload.operation
                : undefined,
            bookId: typeof payload.bookId === "string" ? payload.bookId : undefined,
            error:
              execErr instanceof Error
                ? execErr.message
                : "Book write failed after approval",
          };
        }
      } else if (
        payload?.governedInvocation &&
        typeof payload.governedInvocation === "object" &&
        (payload.governedInvocation as Record<string, unknown>).toolName ===
          TWIN_BOOK_PUBLISH_TOOL_NAME &&
        typeof payload.bookId === "string"
      ) {
        try {
          const execution = await invokeTwinBookPublish({
            tenantId: auth.userId,
            userId: auth.userId,
            bookId: payload.bookId,
            confirmationToken: "approval_granted",
            traceId: `twin-approval:${String(body.approvalId)}:book-publish`,
          });

          bookPublish = {
            bookId: execution.bookId,
            status: execution.status,
            invocationId: execution.invocationId,
            previousState: execution.previousState,
            newState: execution.newState,
          };
        } catch (execErr) {
          console.error(
            "[twin/approvals POST] book publishing after approval failed:",
            execErr,
          );
          bookPublish = {
            status: "failed",
            bookId: payload.bookId,
            error:
              execErr instanceof Error
                ? execErr.message
                : "Book publishing failed after approval",
          };
        }
      } else if (
        payload?.governedInvocation &&
        typeof payload.governedInvocation === "object" &&
        (payload.governedInvocation as Record<string, unknown>).toolName ===
          TWIN_COMMUNITY_PREVIEW_TOOL_NAME &&
        typeof payload.bookId === "string" &&
        typeof payload.forumId === "string"
      ) {
        try {
          const execution = await invokeTwinCommunityPreview({
            tenantId: auth.userId,
            userId: auth.userId,
            bookId: payload.bookId,
            forumId: payload.forumId,
            confirmationToken: "approval_granted",
            traceId: `twin-approval:${String(body.approvalId)}:community-preview`,
          });

          communityPreview = {
            postId: execution.postId,
            bookId: execution.bookId,
            forumId: execution.forumId,
            status: execution.status,
            invocationId: execution.invocationId,
            previousState: execution.previousState,
            newState: execution.newState,
          };
        } catch (execErr) {
          console.error(
            "[twin/approvals POST] community preview after approval failed:",
            execErr,
          );
          communityPreview = {
            status: "failed",
            bookId: payload.bookId,
            forumId: payload.forumId,
            error:
              execErr instanceof Error
                ? execErr.message
                : "Community preview failed after approval",
          };
        }
      }
    } else if (body.action === "reject") {
      await convex.mutation(twinApi.twin.rejectAction, { approvalId: body.approvalId });

      const taskIdFromPayload = payload?.taskId as string | undefined;
      if (taskIdFromPayload) {
        try {
          await convex.mutation(twinApi.twin.updateTaskStatus, {
            taskId: taskIdFromPayload,
            status: "failed",
            result: "Task was rejected by the master.",
          });
        } catch {}
      }
    } else {
      return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
    }

    await logRouteActivity(auth, {
      action: `approval_${body.action as string}`,
      targetResource: `approval:${body.approvalId as string}`,
    });

    return NextResponse.json({
      success: true,
      voiceDriftFindings,
      voiceGatePassed,
      repairAttempts,
      bestEffort,
      ...(forumCreation ? { forumCreation } : {}),
      ...(forumPost ? { forumPost } : {}),
      ...(bookWrite ? { bookWrite } : {}),
      ...(bookPublish ? { bookPublish } : {}),
      ...(communityPreview ? { communityPreview } : {}),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process approval";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
