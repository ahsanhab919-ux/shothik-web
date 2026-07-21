import { NextResponse } from "next/server";
import type { TwinAuthResult } from "./twin-api-auth";
import { getTwinByMasterId, logTwinActivity } from "@/lib/twin/insforge-twin-service";

export interface RouteGuardOptions {
  requiredAbility?: { action: string; subject: string };
  activityAction: string;
  activityTarget?: string;
  activityMetadata?: Record<string, string>;
  skipActivityLog?: boolean;
}

export function guardResponse(
  auth: TwinAuthResult,
  opts?: { requireTwinKey?: boolean }
): NextResponse | null {
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error ?? "Authentication required" },
      { status: 401 }
    );
  }

  if (opts?.requireTwinKey && auth.authType !== "twin_key") {
    return NextResponse.json(
      { error: "Twin API key required" },
      { status: 401 }
    );
  }

  if (opts?.requireTwinKey && !auth.twinId) {
    return NextResponse.json(
      { error: "Twin not found for key" },
      { status: 404 }
    );
  }

  return null;
}

export function checkAbility(
  auth: TwinAuthResult,
  action: string,
  subject: string
): NextResponse | null {
  if (!auth.ability) {
    return NextResponse.json(
      { error: "No Twin linked to account — permission check cannot be performed" },
      { status: 403 }
    );
  }

  if (!auth.ability.can(action, subject)) {
    return NextResponse.json(
      { error: `Twin does not have ${subject}:${action} permission` },
      { status: 403 }
    );
  }

  return null;
}

export async function logRouteActivity(
  auth: TwinAuthResult,
  opts: {
    action: string;
    targetResource?: string;
    metadata?: Record<string, string | undefined>;
  }
): Promise<void> {
  try {
    if (auth.twinId && auth.keyHash) {
      await logTwinActivity({
        twinId: auth.twinId,
        masterId: auth.userId,
        action: opts.action,
        targetResource: opts.targetResource,
        metadata: opts.metadata,
      });
      return;
    }

    if (auth.userId) {
      const profile = await getTwinByMasterId(auth.userId);
      if (profile) {
        await logTwinActivity({
          twinId: profile._id,
          masterId: auth.userId,
          action: opts.action,
          targetResource: opts.targetResource,
          metadata: opts.metadata,
        });
      }
    }
  } catch {
  }
}
