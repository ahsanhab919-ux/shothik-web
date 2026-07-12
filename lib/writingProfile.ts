/**
 * Server-side helper: get-or-create a user's WRITING.md profile + Letta agent.
 *
 * PORT STATUS (shothik-web / Step 2): The original engine version persisted the
 * profile in a Mongoose `WritingProfile` model. shothik-web has no equivalent
 * Convex table yet, so — per the Step-2 contract's "do not invent a parallel
 * store / do not silently fake persistence" rule — the persistence path is left
 * as a clearly-marked NotImplemented stub rather than a fabricated backend.
 *
 * The public shape (`getOrCreateWritingProfile` → a record exposing
 * `lettaAgentId` and an optional `modelHandle`) is preserved so the book `run`
 * and `regenerate` routes type-check against the real contract. Wiring this onto
 * a Convex `writingProfiles` table (mirroring convex/bookService.ts) is the
 * documented follow-up before the BYOK run path can execute end-to-end.
 */
import { createWritingAgent, DEFAULT_WRITING_MD, WRITING_MD_BLOCK_LABEL } from '@/lib/letta';

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

/** Thrown by not-yet-wired persistence paths. Documented follow-up. */
export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

/**
 * Get-or-create the user's WRITING.md profile.
 *
 * TODO(step-3): persist on a Convex `writingProfiles` table (one row per user,
 * holding `lettaAgentId` + metadata), replacing the Mongoose store the engine
 * used. Until then this throws so no caller silently runs against a fake store.
 * The Letta-agent provisioning logic is retained above the throw as the shape
 * the Convex mutation should reproduce (create agent once, then upsert the row).
 */
export async function getOrCreateWritingProfile(
  _userId: string
): Promise<WritingProfileRecord> {
  // Provisioning shape preserved for the follow-up (see TODO): a first-time user
  // gets ONE Letta agent that owns their WRITING.md, then a row is upserted.
  void createWritingAgent;
  void DEFAULT_WRITING_MD;
  void WRITING_MD_BLOCK_LABEL;
  throw new NotImplementedError(
    'getOrCreateWritingProfile: writing-profile persistence is not yet wired onto ' +
      'a Convex table in shothik-web. Follow-up: add a convex/writingProfiles store ' +
      'mirroring convex/bookService.ts before enabling the BYOK book run path.'
  );
}
