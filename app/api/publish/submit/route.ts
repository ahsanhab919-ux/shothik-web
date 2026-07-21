import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  createBookRecord,
  uploadManuscriptFile,
  uploadCoverFile,
  submitToChannels,
  getAvailableChannels,
} from "@/services/publishDriveService";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { getBookDraftForUser } from "@/lib/books/insforge-book-service";
import {
  createPublishingNotification,
  getDistributionRecordForUser,
  upsertDistributionRecord,
  updateDistributionStatusByPublishDriveId,
} from "@/lib/books/insforge-publishing-service";

const PD_ENABLED =
  process.env.PUBLISHDRIVE_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_PUBLISHDRIVE_ENABLED === "true";

async function sendDistributionFailureNotification(
  userId: string,
  bookId: string,
  bookTitle: string,
  errorMessage: string,
) {
  await createPublishingNotification({
    userId,
    bookId,
    type: "book_distribution_failed",
    title: "Distribution submission failed",
    message: `Failed to submit "${bookTitle}" for distribution: ${errorMessage}. You can retry from your book's distribution panel.`,
    payload: { bookId, error: errorMessage },
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { bookId?: string; selectedChannels?: string[]; retry?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { bookId, selectedChannels, retry } = body;
  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }

  try {
    const book = await getBookDraftForUser(bookId, user.id);

    if (book.userId !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to distribute this book" },
        { status: 403 },
      );
    }

    if (!book.distributionOptIn && !retry) {
      return NextResponse.json(
        {
          error:
            "Distribution opt-in is required. Enable it from your book review page.",
        },
        { status: 403 },
      );
    }

    if (!book.title || book.title.trim().length < 3) {
      return NextResponse.json(
        { error: "Book title is required (min 3 chars)" },
        { status: 422 },
      );
    }
    if (!book.description || book.description.trim().length < 50) {
      return NextResponse.json(
        { error: "Book description must be at least 50 characters" },
        { status: 422 },
      );
    }
    if (!book.manuscriptKey) {
      return NextResponse.json({ error: "Manuscript file is required" }, { status: 422 });
    }
    if (!book.coverKey) {
      return NextResponse.json({ error: "Cover image is required" }, { status: 422 });
    }
    if (!book.category) {
      return NextResponse.json({ error: "Book category is required" }, { status: 422 });
    }

    const jobId = uuidv4();
    const allChannels = getAvailableChannels() as Array<{ id: string; name: string }>;
    const channelIds = selectedChannels || allChannels.map((channel) => channel.id);

    if (retry && PD_ENABLED) {
      const existingDist = await getDistributionRecordForUser({
        bookId,
        userId: user.id,
      });

      if (existingDist?.publishDriveBookId) {
        const failedChannelIds =
          channelIds.length > 0
            ? channelIds
            : (existingDist.channels || [])
                .filter((channel) => channel.status === "failed")
                .map((channel) => channel.channelId);

        if (failedChannelIds.length === 0) {
          return NextResponse.json({
            success: true,
            message: "No failed channels to retry.",
          });
        }

        const distributeResult = await submitToChannels(
          existingDist.publishDriveBookId,
          failedChannelIds,
        );

        const channelStatusMap: Record<string, string> = {};
        if (distributeResult.success && distributeResult.channels) {
          for (const channel of distributeResult.channels as Array<{
            id: string;
            status: string;
          }>) {
            channelStatusMap[channel.id] = channel.status;
          }
        }

        const updatedChannels = (existingDist.channels || []).map((channel) => {
          if (failedChannelIds.includes(channel.channelId)) {
            return {
              ...channel,
              status: (channelStatusMap[channel.channelId] as
                | "pending"
                | "processing"
                | "review"
                | "in_review"
                | "live"
                | "failed"
                | "removed") || "processing",
              updatedAt: Date.now(),
            };
          }

          return channel;
        });

        await updateDistributionStatusByPublishDriveId({
          publishDriveBookId: existingDist.publishDriveBookId,
          status: "processing",
          channels: updatedChannels,
        });

        logger.info(
          `Retry: book ${bookId} re-submitted ${failedChannelIds.length} channels`,
        );

        return NextResponse.json({
          success: true,
          jobId,
          publishDriveBookId: existingDist.publishDriveBookId,
          message: `Retrying ${failedChannelIds.length} distribution channel(s).`,
        });
      }
    }

    if (!PD_ENABLED) {
      const pendingChannels = channelIds.map((id) => {
        const channel = allChannels.find((entry) => entry.id === id);
        return {
          channelId: id,
          channelName: channel?.name || id,
          status: (id === "google_play" ? "processing" : "pending") as
            | "pending"
            | "processing",
          updatedAt: Date.now(),
        };
      });

      await upsertDistributionRecord({
        bookId,
        userId: book.userId,
        jobId,
        status: "pending",
        channels: pendingChannels,
      });

      return NextResponse.json({
        success: true,
        jobId,
        publishDriveBookId: null,
        message: "Book queued for distribution. Multi-store rollout in progress.",
      });
    }

    const manuscriptUrl = book.manuscriptUrl ?? null;
    if (!manuscriptUrl) {
      return NextResponse.json(
        { error: "Could not retrieve manuscript file URL" },
        { status: 500 },
      );
    }

    const manuscriptRes = await fetch(manuscriptUrl);
    if (!manuscriptRes.ok) {
      return NextResponse.json(
        { error: "Failed to download manuscript from storage" },
        { status: 500 },
      );
    }
    const manuscriptBuffer = Buffer.from(await manuscriptRes.arrayBuffer());

    const coverUrl = book.coverUrl ?? null;

    const createResult = await createBookRecord({
      title: book.title,
      subtitle: book.subtitle || undefined,
      description: book.description,
      language: book.language || "en",
      isbn: book.isbn || undefined,
      category: book.category,
      keywords: book.keywords || [],
      listPrice: book.listPrice || "9.99",
      currency: book.currency || "USD",
      author: book.agreementName || "Unknown Author",
    });

    if (!createResult.success) {
      logger.error("PublishDrive createBookRecord failed:", createResult.error);

      await sendDistributionFailureNotification(
        book.userId,
        bookId,
        book.title,
        createResult.error,
      );

      await upsertDistributionRecord({
        bookId,
        userId: book.userId,
        jobId,
        status: "failed",
        channels: channelIds.map((id) => {
          const channel = allChannels.find((entry) => entry.id === id);
          return {
            channelId: id,
            channelName: channel?.name || id,
            status: "failed" as const,
            updatedAt: Date.now(),
          };
        }),
      });

      return NextResponse.json(
        { error: `PublishDrive error: ${createResult.error}` },
        { status: 502 },
      );
    }

    const { publishDriveBookId } = createResult;
    const uploadResult = await uploadManuscriptFile(
      publishDriveBookId,
      manuscriptBuffer,
      "application/epub+zip",
    );

    if (!uploadResult.success) {
      logger.error("PublishDrive manuscript upload failed:", uploadResult.error);

      await sendDistributionFailureNotification(
        book.userId,
        bookId,
        book.title,
        `Manuscript upload: ${uploadResult.error}`,
      );

      await upsertDistributionRecord({
        bookId,
        userId: book.userId,
        jobId,
        status: "failed",
        publishDriveBookId,
        channels: channelIds.map((id) => {
          const channel = allChannels.find((entry) => entry.id === id);
          return {
            channelId: id,
            channelName: channel?.name || id,
            status: "failed" as const,
            updatedAt: Date.now(),
          };
        }),
      });

      return NextResponse.json(
        { error: `Manuscript upload failed: ${uploadResult.error}` },
        { status: 502 },
      );
    }

    if (coverUrl) {
      try {
        const coverRes = await fetch(coverUrl);
        if (coverRes.ok) {
          const coverBuffer = Buffer.from(await coverRes.arrayBuffer());
          const contentType =
            coverRes.headers.get("content-type") || "image/jpeg";
          const coverUploadResult = await uploadCoverFile(
            publishDriveBookId,
            coverBuffer,
            contentType,
          );
          if (!coverUploadResult.success) {
            logger.warn(
              `Cover upload failed for book ${bookId}: ${coverUploadResult.error}`,
            );
          }
        }
      } catch (coverError) {
        logger.warn(`Cover download/upload failed for book ${bookId}:`, coverError);
      }
    }

    const distributeResult = await submitToChannels(publishDriveBookId, channelIds);

    if (!distributeResult.success) {
      logger.error("PublishDrive submitToChannels failed:", distributeResult.error);

      const failedChannels = channelIds.map((id) => {
        const channel = allChannels.find((entry) => entry.id === id);
        return {
          channelId: id,
          channelName: channel?.name || id,
          status: "failed" as const,
          updatedAt: Date.now(),
        };
      });

      await sendDistributionFailureNotification(
        book.userId,
        bookId,
        book.title,
        `Channel submission: ${distributeResult.error}`,
      );

      await upsertDistributionRecord({
        bookId,
        userId: book.userId,
        jobId,
        status: "failed",
        publishDriveBookId,
        channels: failedChannels,
      });

      return NextResponse.json(
        { error: `Channel submission failed: ${distributeResult.error}` },
        { status: 502 },
      );
    }

    const channelStatusMap: Record<string, string> = {};
    if (distributeResult.channels) {
      for (const channel of distributeResult.channels as Array<{
        id: string;
        status: string;
      }>) {
        channelStatusMap[channel.id] = channel.status;
      }
    }

    const recordChannels = channelIds.map((id) => {
      const channel = allChannels.find((entry) => entry.id === id);
      return {
        channelId: id,
        channelName: channel?.name || id,
        status: (channelStatusMap[id] as
          | "pending"
          | "processing"
          | "review"
          | "in_review"
          | "live"
          | "failed"
          | "removed") || "processing",
        updatedAt: Date.now(),
      };
    });

    await upsertDistributionRecord({
      bookId,
      userId: book.userId,
      jobId,
      status: "processing",
      publishDriveBookId,
      channels: recordChannels,
    });

    logger.info(
      `Book ${bookId} submitted to PublishDrive as ${publishDriveBookId}, job ${jobId}`,
    );

    return NextResponse.json({
      success: true,
      jobId,
      publishDriveBookId,
      message: `Book submitted to ${channelIds.length} distribution channels.`,
    });
  } catch (error) {
    logger.error("Book submission error:", error);

    try {
      const book = await getBookDraftForUser(bookId, user.id);
      if (book) {
        await sendDistributionFailureNotification(
          book.userId,
          bookId,
          book.title,
          "An unexpected error occurred. Please try again.",
        );
      }
    } catch {}

    return NextResponse.json(
      { error: "Internal server error during submission" },
      { status: 500 },
    );
  }
}
