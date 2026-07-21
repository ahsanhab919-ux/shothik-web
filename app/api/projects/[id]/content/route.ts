import { NextResponse } from "next/server";
import { z } from "zod";
import logger from "@/lib/logger";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { updateProjectContentForUser } from "@/lib/projects/insforge-project-service";
import { handleProjectRouteError, readJsonBody } from "@/lib/projects/http";

const updateContentSchema = z.object({
  content: z.string(),
  sections: z.array(z.unknown()).optional(),
  wordCount: z.number().int().min(0).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const startedAt = Date.now();
  const { id } = await context.params;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      logger.apiRequest("POST", `/api/projects/${id}/content`, 401, Date.now() - startedAt);
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const parsed = updateContentSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      logger.apiRequest("POST", `/api/projects/${id}/content`, 400, Date.now() - startedAt, user.id);
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message: "Project content payload is invalid.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await updateProjectContentForUser({
      projectId: id,
      userId: user.id,
      ...parsed.data,
    });

    logger.apiRequest("POST", `/api/projects/${id}/content`, 200, Date.now() - startedAt, user.id);
    return NextResponse.json(result);
  } catch (error) {
    logger.apiRequest("POST", `/api/projects/${id}/content`, 500, Date.now() - startedAt);
    return handleProjectRouteError(error, "Failed to update project content.");
  }
}
