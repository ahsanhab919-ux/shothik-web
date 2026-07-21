import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getDistributionStatus } from "@/services/publishDriveService";
import { getAuthenticatedUser } from "@/lib/server-auth";
import {
  getDistributionRecordForUser,
  updateDistributionStatusByPublishDriveId,
} from "@/lib/books/insforge-publishing-service";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");

  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }

  try {
    const distRecord = await getDistributionRecordForUser({ bookId, userId: user.id });
    if (!distRecord) {
      return NextResponse.json({ error: "No distribution record found" }, { status: 404 });
    }

    if (!distRecord.publishDriveBookId) {
      return NextResponse.json({
        success: true,
        status: distRecord.status,
        channels: distRecord.channels || [],
        updatedAt: distRecord.updatedAt,
        source: "local",
      });
    }

    const pdStatus = await getDistributionStatus(distRecord.publishDriveBookId);

    if (!pdStatus.success || !pdStatus.channels || pdStatus.channels.length === 0) {
      return NextResponse.json({
        success: true,
        status: distRecord.status,
        channels: distRecord.channels || [],
        updatedAt: distRecord.updatedAt,
        source: "local",
      });
    }

    const pdChannelMap: Record<string, { status: string; url?: string }> = {};
    for (const channel of pdStatus.channels as Array<{
      id: string;
      status: string;
      url?: string;
    }>) {
      pdChannelMap[channel.id] = { status: channel.status, url: channel.url };
    }

    let changed = false;
    const updatedChannels = (distRecord.channels || []).map((channel) => {
      const pdChannel = pdChannelMap[channel.channelId];
      if (pdChannel && pdChannel.status !== channel.status) {
        changed = true;
        return {
          ...channel,
          status: pdChannel.status as
            | "pending"
            | "processing"
            | "review"
            | "in_review"
            | "live"
            | "failed"
            | "removed",
          url: pdChannel.url || channel.url,
          updatedAt: Date.now(),
        };
      }
      return channel;
    });

    if (changed) {
      const allLive = updatedChannels.every(
        (channel) => channel.status === "live" || channel.status === "removed",
      );
      const anyFailed = updatedChannels.some(
        (channel) => channel.status === "failed",
      );
      const overallStatus = allLive
        ? "completed"
        : anyFailed
          ? "failed"
          : "processing";

      const updatedRecord = await updateDistributionStatusByPublishDriveId({
        publishDriveBookId: distRecord.publishDriveBookId,
        status: overallStatus,
        channels: updatedChannels,
      });

      return NextResponse.json({
        success: true,
        status: overallStatus,
        channels: updatedRecord.channels,
        updatedAt: updatedRecord.updatedAt,
        source: "publishdrive",
      });
    }

    return NextResponse.json({
      success: true,
      status: distRecord.status,
      channels: updatedChannels,
      updatedAt: distRecord.updatedAt,
      source: "publishdrive",
    });
  } catch (error) {
    logger.error("Distribution status check error:", error);
    return NextResponse.json(
      { error: "Failed to check distribution status" },
      { status: 500 },
    );
  }
}
