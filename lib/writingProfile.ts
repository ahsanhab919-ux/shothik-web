/**
 * Server-side helper: get-or-create a user's WRITING.md profile + Letta agent.
 *
 * Keeps the "one agent per user" invariant and lazily provisions a Letta agent
 * (with the default WRITING.md) the first time a user opens the feature. The
 * profile row lives on the additive Convex `writingProfiles` table, reached
 * through the mockable `convex-second-me-client` transport (mirroring
 * convex/bookService.ts). Letta-agent provisioning is delegated to lib/letta.ts.
 */
import {
  createWritingAgent,
  DEFAULT_WRITING_MD,
  WRITING_MD_BLOCK_LABEL,
} from '@/lib/letta';
import {
  runSecondMeQuery,
  runSecondMeMutation,
} from '@/lib/second-me/convex-second-me-client';

/**
 * Non-secret view of a user's writing profile. Mirrors the fields the engine's
 * Mongoose `IWritingProfile` exposed to callers (only the ones actually read by
 * the book routes are typed here).
 */
export interface WritingProfileRecord {
  userId: string;
  lettaAgentId: string;
  blockLabel: string;
  modelHandle?: string;
  lastContentLength?: number;
  lastSyncedAt?: number;
}

/** Shape of a `writingProfiles` Convex doc as returned by the transport. */
interface WritingProfileDoc {
  userId: string;
  lettaAgentId: string;
  blockLabel: string;
  modelHandle?: string;
  embeddingHandle?: string;
  lastContentLength?: number;
  lastSyncedAt?: number;
}

function toRecord(doc: WritingProfileDoc): WritingProfileRecord {
  return {
    userId: doc.userId,
    lettaAgentId: doc.lettaAgentId,
    blockLabel: doc.blockLabel,
    modelHandle: doc.modelHandle,
    lastContentLength: doc.lastContentLength,
    lastSyncedAt: doc.lastSyncedAt,
  };
}

/**
 * Get-or-create the user's WRITING.md profile.
 *
 * First-time users get ONE Letta agent that owns their WRITING.md, then a row
 * is inserted. Idempotent: a returning user's existing row short-circuits before
 * any Letta round-trip, so no duplicate agent is ever provisioned.
 */
export async function getOrCreateWritingProfile(
  userId: string
): Promise<WritingProfileRecord> {
  const existing = await runSecondMeQuery<WritingProfileDoc | null>(
    'secondMePersistence:getWritingProfile',
    { userId }
  );
  if (existing) return toRecord(existing);

  // First time: provision a Letta agent that owns this user's WRITING.md.
  const agentId = await createWritingAgent(userId, DEFAULT_WRITING_MD);

  const doc = await runSecondMeMutation<WritingProfileDoc>(
    'secondMePersistence:createWritingProfile',
    {
      userId,
      lettaAgentId: agentId,
      blockLabel: WRITING_MD_BLOCK_LABEL,
      lastContentLength: DEFAULT_WRITING_MD.length,
    }
  );
  return toRecord(doc);
}
