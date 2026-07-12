/**
 * Twin writing-voice helpers (feature 3b).
 *
 * Resolve the CURRENT master's learned WRITING.md voice (userId-keyed, via the
 * `writingProfiles` agent) and, after generation, annotate the produced text
 * with voice-drift findings. Both are ADDITIVE and degrade gracefully:
 *   - resolveWritingMd never throws — if Letta is unset/unavailable it logs and
 *     returns undefined so task execution falls back to heuristic-only.
 *   - computeVoiceDriftFindings is a pure, no-LLM annotation — it never alters
 *     the generated text.
 *
 * Transfer-safety: the agent is resolved from the master's `userId` (never from
 * `twin.lettaAgentId`), so a transferred twin never carries the prior owner's
 * voice.
 */
import { getOrCreateWritingProfile } from '@/lib/writingProfile';
import { getWritingMd } from '@/lib/letta';
import { voiceDrift } from '@/lib/re-educator/guards/voice-drift';
import type { Issue } from '@/lib/re-educator/types';

/**
 * Resolve the user's learned WRITING.md content by userId. Returns undefined
 * (and logs a warning) if the profile/agent cannot be reached — Letta must never
 * be a hard dependency of the twin writing path.
 */
export async function resolveWritingMd(userId: string): Promise<string | undefined> {
  try {
    const { lettaAgentId } = await getOrCreateWritingProfile(userId);
    const { content } = await getWritingMd(lettaAgentId);
    return content?.trim() ? content : undefined;
  } catch (err) {
    console.warn('[twin] WRITING.md voice unavailable; proceeding heuristic-only:', err);
    return undefined;
  }
}

/**
 * Annotate generated text against the WRITING.md reference voice. Pure/no-LLM.
 * Returns [] when there is no reference. Never mutates the text.
 */
export function computeVoiceDriftFindings(
  text: string,
  writingMd?: string
): Issue[] {
  if (!writingMd) return [];
  return voiceDrift(text, { referenceText: writingMd });
}
