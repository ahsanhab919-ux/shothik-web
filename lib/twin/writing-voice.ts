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
import { executeTask, type TaskInput, type TwinProfile } from './task-executor';
import type { StyleProfile } from './style-extractor';

/**
 * Voice-gate tunables (feature 3c). Exposed as constants so the block rule is
 * auditable and adjustable in one place.
 *
 *   DRIFT_RATIO_THRESHOLD  — lexical-drift (severity 'info') findings only block
 *     when the fraction of drifted sentences EXCEEDS this. A single/few drift
 *     findings never block; banned-phrase findings always do.
 *   DEFAULT_DRIFT_THRESHOLD — per-sentence cosine-distance cutoff forwarded to the
 *     voice-drift guard (HIGHER = more permissive).
 *   DEFAULT_MAX_REPAIR_ATTEMPTS — bounded repair regenerations (so up to
 *     1 + N total generations); the synchronous twin path keeps this tight.
 */
export const DRIFT_RATIO_THRESHOLD = 0.3;
export const DEFAULT_DRIFT_THRESHOLD = 0.85;
export const DEFAULT_MAX_REPAIR_ATTEMPTS = 2;

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
 *
 * 3c: additively forwards `bannedPhrases` (so the banned-phrase gate has teeth)
 * and `driftThreshold` to the guard. Existing 2-arg call sites are unaffected.
 */
export function computeVoiceDriftFindings(
  text: string,
  writingMd?: string,
  opts?: { bannedPhrases?: string[]; driftThreshold?: number }
): Issue[] {
  if (!writingMd) return [];
  return voiceDrift(text, {
    referenceText: writingMd,
    bannedPhrases: opts?.bannedPhrases,
    driftThreshold: opts?.driftThreshold,
  });
}

/**
 * Extract discouraged phrases from a WRITING.md "Don't" (a.k.a. Do/Don't,
 * "Terminology & Style") section. Defensive: understands markdown headings
 * (`## Don't`) and bold labels (`**Don't:**`), collects the following list
 * items, and stops when a non-"Don't" section (e.g. a "Do" list) begins. When no
 * such section is found, returns [] — the gate degrades to drift-only.
 *
 * If a list item wraps a phrase in quotes, the quoted phrase is used; otherwise
 * the whole item text is taken.
 */
export function extractBannedPhrases(writingMd?: string): string[] {
  if (!writingMd) return [];

  const isDont = (label: string) => /don['’]?t|do not|avoid|never use/i.test(label);
  const phrases: string[] = [];
  let capturing = false;

  for (const raw of writingMd.split(/\r?\n/)) {
    const line = raw.trim();

    // A markdown heading or a bold/plain label ends the current list and may
    // open (or close) a "Don't" capture window.
    const heading = line.match(/^#{1,6}\s+(.+?)\s*$/);
    const boldLabel = line.match(/^\*\*(.+?)\*\*:?\s*$/);
    const plainLabel = line.match(/^(?:do|don['’]?t)\b.*:\s*$/i);
    const label = heading?.[1] ?? boldLabel?.[1] ?? (plainLabel ? line : undefined);
    if (label !== undefined) {
      capturing = isDont(label);
      continue;
    }

    if (!capturing) continue;

    const item =
      line.match(/^[-*+]\s+(.+)$/) ?? line.match(/^\d+[.)]\s+(.+)$/);
    if (!item) continue;

    const quoted = item[1].match(/["“”'']([^"“”'']+)["“”'']/);
    const phrase = (quoted ? quoted[1] : item[1])
      .replace(/\*\*/g, '')
      .replace(/^["“”'']|["“”'']$/g, '')
      .trim();
    if (phrase) phrases.push(phrase);
  }

  return phrases;
}

/** Count non-empty sentences — the denominator proxy for the drift ratio. */
function countSentences(text: string): number {
  const matches = text.match(/[^.!?]*[.!?]+|\S[^.!?]*$/g) ?? ([] as string[]);
  return matches.filter((s) => s.trim().length > 0).length;
}

/**
 * The hard voice pass-rule, built DIRECTLY over the voice-drift Issue[] (NOT the
 * re-educator, which maps voice-drift to non-blocking `propose` under STANDARD).
 *
 *   - Banned-phrase findings (severity 'minor') ALWAYS block.
 *   - Lexical-drift findings (severity 'info') block ONLY when the drifted-sentence
 *     ratio exceeds DRIFT_RATIO_THRESHOLD. The ratio is (# drift findings) /
 *     (sentenceCount); if sentenceCount is absent, the drift count is used as the
 *     denominator (conservative — any lone drift finding then blocks).
 */
export function passesVoiceGate(
  findings: Issue[],
  sentenceCount?: number
): { passed: boolean; blockingFindings: Issue[] } {
  const banned = findings.filter((f) => f.severity === 'minor');
  const drift = findings.filter((f) => f.severity === 'info');

  const denom =
    sentenceCount && sentenceCount > 0 ? sentenceCount : drift.length;
  const driftRatio = denom > 0 ? drift.length / denom : 0;
  const blockingDrift = driftRatio > DRIFT_RATIO_THRESHOLD ? drift : [];

  const blockingFindings = [...banned, ...blockingDrift];
  return { passed: blockingFindings.length === 0, blockingFindings };
}

/** Human-readable repair block threaded into the next executeTask call. */
function buildRepairFeedback(blocking: Issue[], bannedPhrases: string[]): string {
  const issues = blocking.map((i) => `- ${i.rationale}`).join('\n');
  const bannedLine =
    bannedPhrases.length > 0
      ? `\nAvoid these phrases entirely: ${bannedPhrases
          .map((p) => `"${p}"`)
          .join(', ')}.`
      : '';
  return `The previous draft drifted from the author's WRITING.md voice. Revise to fix:\n${issues}${bannedLine}`;
}

export interface GenerateWithVoiceGateParams {
  task: TaskInput;
  profile: TwinProfile;
  styleProfile?: StyleProfile | null;
  writingMd?: string | null;
  maxAttempts?: number;
  driftThreshold?: number;
}

export interface VoiceGateResult {
  text: string;
  voiceGatePassed: boolean;
  repairAttempts: number;
  finalFindings: Issue[];
  bestEffort: boolean;
}

/**
 * Generate Twin text behind a HARD voice gate with a bounded repair loop. Mirrors
 * the book engine's generate→gate→regen shape (lib/book/author.ts
 * authorChapterOnce), but with the CUSTOM voice pass-rule (passesVoiceGate) and
 * caller-driven regeneration via the gateway (executeTask) — the re-educator never
 * rewrites voice text.
 *
 *   - No reference voice (writingMd empty) → NO-OP gate: one generation, always
 *     passed (preserves 3b behavior for users with no profile).
 *   - Else: generate → computeVoiceDriftFindings → passesVoiceGate. On pass, return
 *     with the attempts used. On fail, thread the blocking findings + banned
 *     phrases back as repairFeedback and regenerate, up to maxAttempts. After
 *     exhaustion, return the LAST draft flagged voiceGatePassed:false, bestEffort:true.
 *
 * Always returns text — never leaves the caller with no output.
 */
export async function generateWithVoiceGate(
  params: GenerateWithVoiceGateParams
): Promise<VoiceGateResult> {
  const { task, profile, styleProfile } = params;
  const writingMd = params.writingMd ?? undefined;
  const maxAttempts = params.maxAttempts ?? DEFAULT_MAX_REPAIR_ATTEMPTS;
  const driftThreshold = params.driftThreshold ?? DEFAULT_DRIFT_THRESHOLD;

  // No-op gate: nothing to measure against, so a single generation is final.
  if (!writingMd || !writingMd.trim()) {
    const text = await executeTask(task, profile, styleProfile, writingMd);
    return {
      text,
      voiceGatePassed: true,
      repairAttempts: 0,
      finalFindings: [],
      bestEffort: false,
    };
  }

  const bannedPhrases = extractBannedPhrases(writingMd);

  let attempt = 0;
  let repairFeedback: string | undefined;
  let lastText = '';
  let lastFindings: Issue[] = [];

  // attempt 0 = first try; each failing attempt under the bound regenerates.
  // Total generations = 1 + maxAttempts.
  while (attempt <= maxAttempts) {
    const text = await executeTask(task, profile, styleProfile, writingMd, repairFeedback);
    const findings = computeVoiceDriftFindings(text, writingMd, {
      bannedPhrases,
      driftThreshold,
    });
    const gate = passesVoiceGate(findings, countSentences(text));

    lastText = text;
    lastFindings = findings;

    if (gate.passed) {
      return {
        text,
        voiceGatePassed: true,
        repairAttempts: attempt,
        finalFindings: findings,
        bestEffort: false,
      };
    }

    repairFeedback = buildRepairFeedback(gate.blockingFindings, bannedPhrases);
    attempt += 1;
  }

  // Exhausted the bound without passing — best-effort, clearly flagged.
  return {
    text: lastText,
    voiceGatePassed: false,
    repairAttempts: maxAttempts,
    finalFindings: lastFindings,
    bestEffort: true,
  };
}
