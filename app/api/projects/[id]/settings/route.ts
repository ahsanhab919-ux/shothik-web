import { NextResponse } from "next/server";
import { z } from "zod";
import logger from "@/lib/logger";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { updateProjectSettingsForUser } from "@/lib/projects/insforge-project-service";
import { handleProjectRouteError, readJsonBody } from "@/lib/projects/http";

const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.unknown()),
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
      logger.apiRequest("POST", `/api/projects/${id}/settings`, 401, Date.now() - startedAt);
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const parsed = updateSettingsSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      logger.apiRequest("POST", `/api/projects/${id}/settings`, 400, Date.now() - startedAt, user.id);
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message: "Project settings payload is invalid.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const project = await updateProjectSettingsForUser({
      projectId: id,
      userId: user.id,
      settings: parsed.data.settings,
    });

    logger.apiRequest("POST", `/api/projects/${id}/settings`, 200, Date.now() - startedAt, user.id);
    return NextResponse.json({ success: true, project });
  } catch (error) {
    logger.apiRequest("POST", `/api/projects/${id}/settings`, 500, Date.now() - startedAt);
    return handleProjectRouteError(error, "Failed to update project settings.");
  }
}
