import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock the Letta + writing-profile seams so resolveWritingMd touches no network.
vi.mock('@/lib/writingProfile', () => ({
  getOrCreateWritingProfile: vi.fn(),
}));
vi.mock('@/lib/letta', () => ({
  getWritingMd: vi.fn(),
}));

import { getOrCreateWritingProfile } from '@/lib/writingProfile';
import { getWritingMd } from '@/lib/letta';
import { resolveWritingMd, computeVoiceDriftFindings } from './writing-voice';

const getProfile = getOrCreateWritingProfile as unknown as Mock;
const getMd = getWritingMd as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveWritingMd', () => {
  it('resolves the agent by userId and returns its WRITING.md content', async () => {
    getProfile.mockResolvedValue({ lettaAgentId: 'agent-1' });
    getMd.mockResolvedValue({ content: '# WRITING.md\nMy learned voice.' });

    const md = await resolveWritingMd('user-1');

    expect(getProfile).toHaveBeenCalledWith('user-1');
    expect(getMd).toHaveBeenCalledWith('agent-1');
    expect(md).toContain('My learned voice.');
  });

  it('returns undefined for empty/whitespace content', async () => {
    getProfile.mockResolvedValue({ lettaAgentId: 'agent-1' });
    getMd.mockResolvedValue({ content: '   ' });
    expect(await resolveWritingMd('user-1')).toBeUndefined();
  });

  it('falls back to undefined (no throw) when Letta is unavailable', async () => {
    getProfile.mockRejectedValue(new Error('LETTA_BASE_URL not set'));
    await expect(resolveWritingMd('user-1')).resolves.toBeUndefined();
  });
});

describe('computeVoiceDriftFindings', () => {
  const REFERENCE = [
    'I write in short, warm sentences.',
    'I favor plain words and a calm, personal tone.',
    'I avoid corporate jargon and buzzwords entirely.',
  ].join(' ');

  it('produces drift findings for text far from the reference voice, without altering the text', () => {
    const drifting =
      'Henceforth the quarterly synergy paradigm shall be actualized via cross-functional stakeholder leverage.';

    const findings = computeVoiceDriftFindings(drifting, REFERENCE);

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.category === 'voice-drift')).toBe(true);
    // Annotation only: the caller's text is a separate value, never mutated here.
  });

  it('returns [] when there is no reference (writingMd absent)', () => {
    expect(computeVoiceDriftFindings('anything at all here.', undefined)).toEqual([]);
  });
});
