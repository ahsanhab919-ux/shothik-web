import { NextResponse } from "next/server";
import { z } from "zod";
import logger from "@/lib/logger";
import { getAuthenticatedUser } from "@/lib/server-auth";
import {
  deleteProjectForUser,
  getProjectForUser,
  updateProjectForUser,
} from "@/lib/projects/insforge-project-service";
import { handleProjectRouteError, readJsonBody } from "@/lib/projects/http";

const updateProjectSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  template: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  content: z.string().optional(),
  sections: z.array(z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  wordCount: z.number().int().min(0).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  starred: z.boolean().optional(),
  researchNotes: z.record(z.string(), z.unknown()).optional().nullable(),
  agentChapters: z.array(z.unknown()).optional().nullable(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const startedAt = Date.now();
  const { id } = await context.params;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      logger.apiRequest("GET", `/api/projects/${id}`, 401, Date.now() - startedAt);
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const project = await getProjectForUser(id, user.id);
    logger.apiRequest("GET", `/api/projects/${id}`, 200, Date.now() - startedAt, user.id);
    return NextResponse.json({ project });
  } catch (error) {
    logger.apiRequest("GET", `/api/projects/${id}`, 500, Date.now() - startedAt);
    return handleProjectRouteError(error, "Failed to load project.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const startedAt = Date.now();
  const { id } = await context.params;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      logger.apiRequest("PATCH", `/api/projects/${id}`, 401, Date.now() - startedAt);
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const parsed = updateProjectSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      logger.apiRequest("PATCH", `/api/projects/${id}`, 400, Date.now() - startedAt, user.id);
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message: "Project update payload is invalid.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const project = await updateProjectForUser({
      projectId: id,
      userId: user.id,
      updates: parsed.data,
    });

    logger.apiRequest("PATCH", `/api/projects/${id}`, 200, Date.now() - startedAt, user.id);
    return NextResponse.json({ project });
  } catch (error) {
    logger.apiRequest("PATCH", `/api/projects/${id}`, 500, Date.now() - startedAt);
    return handleProjectRouteError(error, "Failed to update project.");
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const startedAt = Date.now();
  const { id } = await context.params;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      logger.apiRequest("DELETE", `/api/projects/${id}`, 401, Date.now() - startedAt);
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    await deleteProjectForUser(id, user.id);
    logger.apiRequest("DELETE", `/api/projects/${id}`, 200, Date.now() - startedAt, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.apiRequest("DELETE", `/api/projects/${id}`, 500, Date.now() - startedAt);
    return handleProjectRouteError(error, "Failed to delete project.");
  }
}
