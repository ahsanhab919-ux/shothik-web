import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { restoreProjectVersionForUser } from "@/lib/projects/insforge-project-service";
import { handleProjectRouteError } from "@/lib/projects/http";

type RouteContext = {
  params: Promise<{ id: string; versionId: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const startedAt = Date.now();
  const { id, versionId } = await context.params;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      logger.apiRequest(
        "POST",
        `/api/projects/${id}/versions/${versionId}/restore`,
        401,
        Date.now() - startedAt,
      );
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const project = await restoreProjectVersionForUser(id, versionId, user.id);
    logger.apiRequest(
      "POST",
      `/api/projects/${id}/versions/${versionId}/restore`,
      200,
      Date.now() - startedAt,
      user.id,
    );
    return NextResponse.json({ success: true, project });
  } catch (error) {
    logger.apiRequest(
      "POST",
      `/api/projects/${id}/versions/${versionId}/restore`,
      500,
      Date.now() - startedAt,
    );
    return handleProjectRouteError(error, "Failed to restore project version.");
  }
}
