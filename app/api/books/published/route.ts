import { NextRequest, NextResponse } from "next/server";
import { listPublishedBooks } from "@/lib/books/insforge-book-service";
import { handleBookRouteError, parseInteger } from "@/lib/books/http";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const books = await listPublishedBooks({
      category: searchParams.get("category"),
      query: searchParams.get("query"),
      limit: parseInteger(searchParams.get("limit"), 100),
    });

    return NextResponse.json({ books });
  } catch (error) {
    return handleBookRouteError(error, "Failed to list published books.");
  }
}
