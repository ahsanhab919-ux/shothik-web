import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { handleBookRouteError, readJsonBody } from "@/lib/books/http";
import {
  listUnreadPublishingNotificationsForUser,
  markPublishingNotificationsReadForUser,
} from "@/lib/books/insforge-publishing-service";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const notifications = await listUnreadPublishingNotificationsForUser(user.id);
    return NextResponse.json({ notifications });
  } catch (error) {
    return handleBookRouteError(error, "Failed to load notifications.");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const body = (await readJsonBody(request)) as {
      bookId?: string;
      notificationIds?: string[];
    };

    if (!Array.isArray(body.notificationIds) || body.notificationIds.length === 0) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message: "notificationIds must be a non-empty array.",
        },
        { status: 400 },
      );
    }

    const result = await markPublishingNotificationsReadForUser({
      userId: user.id,
      bookId: body.bookId,
      notificationIds: body.notificationIds,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleBookRouteError(error, "Failed to mark notifications as read.");
  }
}
