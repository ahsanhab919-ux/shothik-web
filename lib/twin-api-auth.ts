import { NextRequest } from "next/server";
import { hashAgentKey, isAgentKey } from "./agent-auth";
import { buildTwinAbility } from "./twin-permissions";
import type { Id } from "@/convex/_generated/dataModel";
import { createInsforgeRequestClient } from "@/lib/insforge/request";
import { normalizeInsforgeUser } from "@/lib/insforge/user";
import {
  getTwinByKeyHash,
  getTwinByMasterId,
  getTwinProfileByKeyHash,
  type TwinProfileRecord,
} from "@/lib/twin/insforge-twin-service";

type TwinRecord = TwinProfileRecord & {
  _id: Id<"twins">;
};

function asTwinRecord(doc: TwinProfileRecord): TwinRecord {
  return doc as TwinRecord;
}

export interface TwinAuthResult {
  authenticated: boolean;
  userId?: string;
  twinId?: Id<"twins">;
  authType: "user_session" | "twin_key" | "none";
  error?: string;
  twin?: TwinRecord;
  ability?: ReturnType<typeof buildTwinAbility>;
  token?: string;
  keyHash?: string;
}

export async function authenticateTwinRequest(
  req: NextRequest
): Promise<TwinAuthResult> {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer shothik_agent_")) {
    const apiKey = authHeader.slice(7).trim();
    return authenticateWithTwinKey(apiKey);
  }

  return authenticateWithUserSession(req);
}

async function authenticateWithUserSession(req: NextRequest): Promise<TwinAuthResult> {
  try {
    const insforge = createInsforgeRequestClient(req);
    const { data, error } = await insforge.auth.getCurrentUser();
    if (error || !data?.user) {
      return {
        authenticated: false,
        authType: "none",
        error: error?.message ?? "Authentication required",
      };
    }

    const user = normalizeInsforgeUser(data.user);
    if (!user) {
      return {
        authenticated: false,
        authType: "none",
        error: "Unable to resolve authenticated user",
      };
    }

    try {
      const twin = await getTwinByMasterId(user.id);
      if (twin) {
        const twinRecord = asTwinRecord(twin);
        const ability = buildTwinAbility({
          lifecycleState: twinRecord.lifecycleState,
          allowedSkills: twinRecord.allowedSkills ?? [],
          blockedSkills: twinRecord.blockedSkills ?? [],
          approvalRequiredActions: twinRecord.approvalRequiredActions ?? [],
        });

        return {
          authenticated: true,
          userId: user.id,
          authType: "user_session",
          twinId: twinRecord._id,
          twin: twinRecord,
          ability,
        };
      }
    } catch {
      // A user may be authenticated before a twin profile exists.
    }

    return {
      authenticated: true,
      userId: user.id,
      authType: "user_session",
    };
  } catch (err) {
    return {
      authenticated: false,
      authType: "none",
      error: err instanceof Error ? err.message : "Authentication failed",
    };
  }
}

async function authenticateWithTwinKey(apiKey: string): Promise<TwinAuthResult> {
  if (!isAgentKey(apiKey)) {
    return { authenticated: false, authType: "twin_key", error: "Invalid key format" };
  }

  const keyHash = hashAgentKey(apiKey);

  try {
    const summary = await getTwinByKeyHash(keyHash);
    const result = await getTwinProfileByKeyHash(keyHash);
    if (!summary || !result) {
      return { authenticated: false, authType: "twin_key", error: "Twin not found" };
    }

    const twin = asTwinRecord(result);
    const ability = buildTwinAbility({
      lifecycleState: twin.lifecycleState,
      allowedSkills: twin.allowedSkills ?? [],
      blockedSkills: twin.blockedSkills ?? [],
      approvalRequiredActions: twin.approvalRequiredActions ?? [],
    });

    return {
      authenticated: true,
      twinId: twin._id,
      userId: summary.masterAuthUserId ?? twin.masterId,
      authType: "twin_key",
      twin,
      ability,
      keyHash,
    };
  } catch (err) {
    return { authenticated: false, authType: "twin_key", error: (err as Error).message };
  }
}

export function requireAuth(auth: TwinAuthResult): auth is TwinAuthResult & { authenticated: true; userId: string } {
  return auth.authenticated && auth.authType === "user_session" && !!auth.userId;
}

export function requireAnyAuth(auth: TwinAuthResult): auth is TwinAuthResult & { authenticated: true; userId: string } {
  if (auth.authType === "twin_key") {
    return auth.authenticated && !!auth.userId && !!auth.twinId;
  }
  return auth.authenticated && auth.authType === "user_session" && !!auth.userId;
}

export function needsApproval(twin: TwinRecord, action: string): boolean {
  return (twin.approvalRequiredActions ?? []).includes(action);
}

export function requireTwinKey(auth: TwinAuthResult): auth is TwinAuthResult & { authenticated: true; twinId: Id<"twins">; twin: TwinRecord } {
  return auth.authenticated && auth.authType === "twin_key" && !!auth.twinId;
}
