import { NextResponse } from "next/server";
import { InsforgeBookServiceError } from "@/lib/books/insforge-book-service";

export function parseInteger(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new InsforgeBookServiceError("INVALID_REQUEST", "Request body must be valid JSON.");
  }
}

export function handleBookRouteError(error: unknown, fallbackMessage: string) {
  if (error instanceof InsforgeBookServiceError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "FORBIDDEN"
          ? 403
          : error.code === "INSUFFICIENT_CREDITS"
            ? 409
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

  console.error(fallbackMessage, error);
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: fallbackMessage },
    { status: 500 },
  );
}
