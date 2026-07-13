import { deleteMessageForUser } from "@/lib/chat/server";
import { getAuthenticatedUser } from "@/lib/server-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user?._id) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { messageId } = await params;
  try {
    const result = await deleteMessageForUser(messageId, String(user._id));
    return Response.json({ data: result });
  } catch {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }
}
