import { NextRequest } from "next/server";
import { getChatAuthenticatedUser } from "@/lib/server-auth";
import {
  createPersistedConversation,
  listConversationsForUser,
} from "@/lib/chat/server";
import type { ChatSurface, ConversationStatus } from "@/lib/chat/types";

function unauthorized() {
  return Response.json(
    {
      error: "Authentication required",
      code: "INSFORGE_SESSION_REQUIRED",
      message: "Please sign in again to continue using chat.",
    },
    { status: 401 },
  );
}

export async function GET(request: NextRequest) {
  const user = await getChatAuthenticatedUser();
  if (!user?._id) return unauthorized();

  const { searchParams } = new URL(request.url);
  const surface = searchParams.get("surface") as ChatSurface | null;
  const status = searchParams.get("status") as ConversationStatus | null;
  const includeTemporary = searchParams.get("includeTemporary") === "true";
  const query = searchParams.get("query")?.trim();
  const limitValue = Number(searchParams.get("limit") ?? "");
  const limit = Number.isFinite(limitValue) ? limitValue : undefined;

  const conversations = await listConversationsForUser({
    userId: String(user._id),
    ...(surface ? { surface } : {}),
    ...(status ? { status } : {}),
    includeTemporary,
    ...(typeof limit === "number" ? { limit } : {}),
    ...(query ? { query } : {}),
  });

  return Response.json({ data: conversations });
}

export async function POST(request: NextRequest) {
  const user = await getChatAuthenticatedUser();
  if (!user?._id) return unauthorized();

  const body = await request.json();
  const conversation = await createPersistedConversation({
    userId: String(user._id),
    surface: body.surface,
    title: body.title,
    modelHandle: body.modelHandle,
    temporary: body.temporary,
    contextRef: body.contextRef,
  });

  return Response.json({ data: conversation });
}
