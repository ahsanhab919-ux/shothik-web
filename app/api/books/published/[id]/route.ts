import { NextResponse } from "next/server";
import { getPublishedBookDetail } from "@/lib/books/insforge-book-service";
import { handleBookRouteError } from "@/lib/books/http";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const book = await getPublishedBookDetail(id);
    return NextResponse.json({ book });
  } catch (error) {
    return handleBookRouteError(error, "Failed to load published book.");
  }
}
