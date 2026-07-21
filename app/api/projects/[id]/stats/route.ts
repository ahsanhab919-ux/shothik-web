import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { getProjectStatsForUser } from "@/lib/projects/insforge-project-service";
import { handleProjectRouteError } from "@/lib/projects/http";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const startedAt = Date.now();
  const { id } = await context.params;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      logger.apiRequest("GET", `/api/projects/${id}/stats`, 401, Date.now() - startedAt);
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const stats = await getProjectStatsForUser(id, user.id);
    logger.apiRequest("GET", `/api/projects/${id}/stats`, 200, Date.now() - startedAt, user.id);
    return NextResponse.json(stats);
  } catch (error) {
    logger.apiRequest("GET", `/api/projects/${id}/stats`, 500, Date.now() - startedAt);
    return handleProjectRouteError(error, "Failed to load project stats.");
  }
}
