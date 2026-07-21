import { NextResponse } from "next/server";
import { z } from "zod";
import logger from "@/lib/logger";
import { getAuthenticatedUser } from "@/lib/server-auth";
import {
  createProjectForUser,
  listProjectsForUser,
} from "@/lib/projects/insforge-project-service";
import { handleProjectRouteError, readJsonBody } from "@/lib/projects/http";

const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(["book", "research", "assignment"]),
  template: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  content: z.string().optional(),
  sections: z.array(z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  researchNotes: z.record(z.string(), z.unknown()).optional().nullable(),
  agentChapters: z.array(z.unknown()).optional().nullable(),
});

export async function GET(request: Request) {
  const startedAt = Date.now();
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      logger.apiRequest("GET", "/api/projects", 401, Date.now() - startedAt);
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const projects = await listProjectsForUser(
      user.id,
      type === "book" || type === "research" || type === "assignment"
        ? type
        : undefined,
    );

    logger.apiRequest("GET", "/api/projects", 200, Date.now() - startedAt, user.id);
    return NextResponse.json({ projects });
  } catch (error) {
    logger.apiRequest("GET", "/api/projects", 500, Date.now() - startedAt);
    return handleProjectRouteError(error, "Failed to list projects.");
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      logger.apiRequest("POST", "/api/projects", 401, Date.now() - startedAt);
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const parsed = createProjectSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      logger.apiRequest("POST", "/api/projects", 400, Date.now() - startedAt, user.id);
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message: "Project payload is invalid.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const project = await createProjectForUser({
      userId: user.id,
      ...parsed.data,
    });

    logger.apiRequest("POST", "/api/projects", 201, Date.now() - startedAt, user.id);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    logger.apiRequest("POST", "/api/projects", 500, Date.now() - startedAt);
    return handleProjectRouteError(error, "Failed to create project.");
  }
}
