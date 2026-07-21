import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import {
  attachBookAssetForUser,
  getBookDraftForUser,
  updateBookDraftForUser,
} from "@/lib/books/insforge-book-service";
import { handleBookRouteError, readJsonBody } from "@/lib/books/http";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const book = await getBookDraftForUser(id, user.id);
    return NextResponse.json({ book });
  } catch (error) {
    return handleBookRouteError(error, "Failed to load book draft.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const body = (await readJsonBody(request)) as {
      updates?: Record<string, unknown>;
      manuscriptAsset?: Parameters<typeof attachBookAssetForUser>[0]["asset"];
      coverAsset?: Parameters<typeof attachBookAssetForUser>[0]["asset"];
    };

    if (body.updates && typeof body.updates === "object") {
      await updateBookDraftForUser({
        bookId: id,
        userId: user.id,
        updates: body.updates,
      });
    }

    if (body.manuscriptAsset) {
      await attachBookAssetForUser({
        bookId: id,
        userId: user.id,
        assetKind: "manuscript",
        asset: body.manuscriptAsset,
      });
    }

    if (body.coverAsset) {
      await attachBookAssetForUser({
        bookId: id,
        userId: user.id,
        assetKind: "cover",
        asset: body.coverAsset,
      });
    }

    const book = await getBookDraftForUser(id, user.id);
    return NextResponse.json({ book });
  } catch (error) {
    return handleBookRouteError(error, "Failed to update book draft.");
  }
}
