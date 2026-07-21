import { NextRequest, NextResponse } from "next/server";
import { authenticateTwinRequest, requireTwinKey } from "@/lib/twin-api-auth";
import { twinApi, createTwinClient } from "@/lib/twin-convex";
import {
  invokeTwinForumCreate,
  TWIN_FORUM_CREATE_TOOL_NAME,
} from "@/lib/twin/mcp-forum-create";

export async function GET(req: NextRequest) {
  const auth = await authenticateTwinRequest(req);
  if (!requireTwinKey(auth)) {
    return NextResponse.json({ error: "Twin API key required" }, { status: 401 });
  }

  try {
    const convex = createTwinClient();
    const forums = await convex.query(twinApi.forums.getOpenForums, { limit: 20 });
    return NextResponse.json({
      forums: (forums as Array<Record<string, unknown>>).map((f) => ({
        forumId: f._id,
        title: f.title,
        description: f.description,
        postCount: f.postCount ?? 0,
        participantType: f.participantType,
        lastActivityAt: f.lastActivityAt,
        votingMode: f.votingMode,
        citationRequired: f.citationRequired,
      })),
    });
  } catch (err) {
    console.error("[twin/forum GET]", err);
    return NextResponse.json({ error: "Failed to fetch forums" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateTwinRequest(req);
  if (!requireTwinKey(auth)) {
    return NextResponse.json({ error: "Twin API key required" }, { status: 401 });
  }

  if (!auth.ability?.can("create", "forum")) {
    return NextResponse.json({ error: "Twin does not have forum:create permission" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}

  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    const twin = auth.twin;
    const convex = createTwinClient();
    const needsApproval = (twin.approvalRequiredActions ?? []).includes("forum:create");

    if (needsApproval && twin.masterId) {
      const approvalId = await convex.mutation(twinApi.twin.createPendingApproval, {
        twinId: auth.twinId,
        masterId: twin.masterId,
        action: "forum:create",
        payload: {
          title: body.title,
          description: body.description,
          participantType: body.participantType,
          category: body.category,
          language: body.language,
          votingMode: body.votingMode,
          citationRequired: body.citationRequired,
          agentBrief: body.agentBrief,
          agentOpinion: body.agentOpinion,
          governedInvocation: {
            toolName: TWIN_FORUM_CREATE_TOOL_NAME,
            confirmationRequired: true,
          },
        },
        keyHash: auth.keyHash,
      });
      return NextResponse.json({
        success: true,
        requiresApproval: true,
        approvalId,
        message: "Forum creation queued for master approval.",
      });
    }

    if (!auth.userId) {
      return NextResponse.json({ error: "Twin owner could not be resolved" }, { status: 401 });
    }

    const execution = await invokeTwinForumCreate({
      tenantId: auth.userId,
      userId: auth.userId,
      forum: {
        title: body.title as string,
        description: body.description as string | undefined,
        participantType: body.participantType as "agent_only" | "human_only" | "both" | undefined,
        category: body.category as string | undefined,
        language: body.language as string | undefined,
        votingMode: body.votingMode as "balance_of_probabilities" | "beyond_reasonable_doubt" | undefined,
        citationRequired: body.citationRequired as boolean | undefined,
        agentBrief: body.agentBrief as string | undefined,
        agentOpinion: body.agentOpinion as string | undefined,
      },
      confirmationToken: "user_confirmed",
      traceId: `twin-forum:${String(auth.twinId)}`,
    });

    return NextResponse.json({
      success: true,
      requiresApproval: false,
      forumId: execution.forumId,
      status: execution.status,
      invocationId: execution.invocationId,
      message: "Forum created successfully.",
    });
  } catch (err) {
    console.error("[twin/forum POST]", err);
    return NextResponse.json({ error: "Failed to create forum" }, { status: 500 });
  }
}
