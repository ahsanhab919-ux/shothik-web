import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { InsforgeProjectServiceError } from "@/lib/projects/insforge-project-service";

export function parseInteger(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new InsforgeProjectServiceError(
      "INVALID_REQUEST",
      "Request body must be valid JSON.",
    );
  }
}

function isMissingProjectsSchemaError(error: unknown) {
  const candidate = error as { code?: string; message?: string } | null;
  if (!candidate) return false;

  if (candidate.code === "42P01" && /projects/i.test(candidate.message ?? "")) {
    return true;
  }

  return /relation ["']?public\.projects["']? does not exist/i.test(
    candidate.message ?? "",
  );
}

export function handleProjectRouteError(error: unknown, fallbackMessage: string) {
  if (error instanceof InsforgeProjectServiceError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "FORBIDDEN"
          ? 403
          : error.code === "CONFLICT"
            ? 409
            : 400;

    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
      },
      { status },
    );
  }

  if (isMissingProjectsSchemaError(error)) {
    logger.error("Project backend unavailable: missing projects schema", error as Error);
    return NextResponse.json(
      {
        error: "PROJECT_BACKEND_UNAVAILABLE",
        message:
          "Project storage is temporarily unavailable. Verify DATABASE_URL matches the active InsForge project schema.",
      },
      { status: 503 },
    );
  }

  logger.error(fallbackMessage, error as Error);
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: fallbackMessage },
    { status: 500 },
  );
}
