import { NextRequest, NextResponse } from "next/server";

import { twinApi, createTwinClient } from "@/lib/twin-convex";
import {
  authenticateTwinRequest,
  requireAnyAuth,
  type TwinAuthResult,
} from "@/lib/twin-api-auth";

type ForumParticipantType = "agent_only" | "human_only" | "both";
type ForumVotingMode = "balance_of_probabilities" | "beyond_reasonable_doubt";

function validateParticipantType(
  value: unknown,
): value is ForumParticipantType {
  return value === "agent_only" || value === "human_only" || value === "both";
}

function validateVotingMode(value: unknown): value is ForumVotingMode {
  return value === "balance_of_probabilities" || value === "beyond_reasonable_doubt";
}

async function resolveTwinId(
  auth: TwinAuthResult & { authenticated: true; userId: string },
  convex: ReturnType<typeof createTwinClient>,
): Promise<string | null> {
  if (auth.twinId) {
    return String(auth.twinId);
  }

  const profile = await convex.query(twinApi.twin.getByMaster, {
    masterId: auth.userId,
  });
  if (!profile?._id) {
    return null;
  }

  return String(profile._id);
}

export async function POST(req: NextRequest) {
  const auth = await authenticateTwinRequest(req);
  if (!requireAnyAuth(auth)) {
    return NextResponse.json(
      { error: auth.error ?? "Authentication required" },
      { status: 401 },
    );
  }

  if (!auth.ability?.can("create", "forum")) {
    return NextResponse.json(
      { error: "Twin does not have forum:create permission" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {}

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (
    body.participantType !== undefined &&
    !validateParticipantType(body.participantType)
  ) {
    return NextResponse.json(
      { error: "participantType must be agent_only, human_only, or both" },
      { status: 400 },
    );
  }

  if (body.votingMode !== undefined && !validateVotingMode(body.votingMode)) {
    return NextResponse.json(
      {
        error:
          "votingMode must be balance_of_probabilities or beyond_reasonable_doubt",
      },
      { status: 400 },
    );
  }

  try {
    const convex = createTwinClient(auth.token);
    const twinId = await resolveTwinId(auth, convex);
    if (!twinId) {
      return NextResponse.json({ error: "Twin profile not found" }, { status: 404 });
    }

    const forumId = await convex.mutation(twinApi.twin.twinCreateForum, {
      twinId,
      title,
      ...(typeof body.description === "string"
        ? { description: body.description }
        : {}),
      participantType: validateParticipantType(body.participantType)
        ? body.participantType
        : "both",
      ...(typeof body.category === "string" ? { category: body.category } : {}),
      ...(typeof body.language === "string" ? { language: body.language } : {}),
      ...(validateVotingMode(body.votingMode)
        ? { votingMode: body.votingMode }
        : {}),
      ...(typeof body.citationRequired === "boolean"
        ? { citationRequired: body.citationRequired }
        : {}),
      ...(typeof body.agentBrief === "string"
        ? { agentBrief: body.agentBrief }
        : {}),
      ...(typeof body.agentOpinion === "string"
        ? { agentOpinion: body.agentOpinion }
        : {}),
      ...(auth.keyHash ? { keyHash: auth.keyHash } : {}),
    });

    return NextResponse.json({
      forumId,
      status: "created",
    });
  } catch (err) {
    console.error("[twin/forum/execute POST]", err);
    return NextResponse.json({ error: "Failed to create forum" }, { status: 500 });
  }
}
