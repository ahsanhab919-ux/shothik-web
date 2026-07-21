import { NextResponse } from "next/server";
import { z } from "zod";
import logger from "@/lib/logger";
import { getAuthenticatedUser } from "@/lib/server-auth";
import {
  listProjectVersionsForUser,
  saveProjectVersionForUser,
} from "@/lib/projects/insforge-project-service";
import {
  handleProjectRouteError,
  parseInteger,
  readJsonBody,
} from "@/lib/projects/http";

const saveVersionSchema = z.object({
  content: z.string(),
  sections: z.array(z.unknown()).optional(),
  label: z.string().trim().max(200).optional().nullable(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const startedAt = Date.now();
  const { id } = await context.params;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      logger.apiRequest("GET", `/api/projects/${id}/versions`, 401, Date.now() - startedAt);
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(parseInteger(url.searchParams.get("limit"), 20), 100));
    const versions = await listProjectVersionsForUser(id, user.id, limit);
    logger.apiRequest("GET", `/api/projects/${id}/versions`, 200, Date.now() - startedAt, user.id);
    return NextResponse.json({ versions });
  } catch (error) {
    logger.apiRequest("GET", `/api/projects/${id}/versions`, 500, Date.now() - startedAt);
    return handleProjectRouteError(error, "Failed to load project versions.");
  }
}

export async function POST(request: Request, context: RouteContext) {
  const startedAt = Date.now();
  const { id } = await context.params;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      logger.apiRequest("POST", `/api/projects/${id}/versions`, 401, Date.now() - startedAt);
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const parsed = saveVersionSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      logger.apiRequest("POST", `/api/projects/${id}/versions`, 400, Date.now() - startedAt, user.id);
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message: "Project version payload is invalid.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const version = await saveProjectVersionForUser({
      projectId: id,
      userId: user.id,
      ...parsed.data,
    });

    logger.apiRequest("POST", `/api/projects/${id}/versions`, 201, Date.now() - startedAt, user.id);
    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    logger.apiRequest("POST", `/api/projects/${id}/versions`, 500, Date.now() - startedAt);
    return handleProjectRouteError(error, "Failed to save project version.");
  }
}
