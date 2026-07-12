/**
 * Second Me — key custody service (BYOK-at-rest).
 *
 * The persistent, encrypted-at-rest complement to the per-request BYOK path
 * (lib/re-educator/byok.ts). Where byok.ts takes a key that arrives on a single
 * request and is never persisted, this lets a user store a BYOK provider key
 * ONCE, sealed, so later runs reuse it without the key crossing the wire again.
 *
 * PORT STATUS (shothik-web / Step 2): the original engine version persisted a
 * sealed envelope in a Mongoose `SecondMeKeyCustody` model. shothik-web has no
 * equivalent Convex table yet, so — per the Step-2 contract's "do not invent a
 * parallel store / do not silently fake persistence" rule — the STORE/DELETE
 * mutations are clearly-marked NotImplemented stubs, and the read paths fail
 * CLOSED (no store ⇒ no usable key). The crypto primitive (crypto-vault.ts) and
 * the provider policy below are retained so the follow-up only has to add the
 * Convex row.
 *
 * SECURITY (unchanged intent): the plaintext key is never logged; retrieval
 * fails closed to "no key" rather than throwing at the point of use.
 *
 * TODO(step-3): persist the sealed envelope on a Convex `secondMeKeyCustody`
 * table keyed by {userId, purpose}, then implement store/use/list/delete against
 * it (seal via crypto-vault before write, open only inside useByokKey).
 */
import { BYOK_PROVIDERS, isByokProvider, type ByokProviderName } from '@/lib/re-educator/byok';

/** Custody purpose namespace for a BYOK provider key. */
export function byokPurpose(provider: ByokProviderName): string {
  return `byok:${provider}`;
}

/** Thrown for a rejected custody STORE (bad input). Never contains the key. */
export class KeyCustodyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeyCustodyError';
  }
}

/** Thrown by not-yet-wired persistence paths. Documented follow-up. */
export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

/** Non-secret view of a custody row — safe to return/log. Never holds plaintext. */
export interface CustodyRecordView {
  userId: string;
  purpose: string;
  provider?: string;
  present: true;
}

const NOT_WIRED =
  'key custody persistence is not yet wired onto a Convex table in shothik-web. ' +
  'Follow-up: add a convex/secondMeKeyCustody store before enabling stored BYOK keys.';

/**
 * Store a user's sealed BYOK key. Validates input up front (byok.ts idiom), then
 * throws NotImplemented — there is no custody store to write to yet, and we must
 * not persist a key we cannot later open.
 */
export async function storeByokKey(
  userId: string,
  provider: string,
  apiKey: string
): Promise<CustodyRecordView> {
  if (!userId) {
    throw new KeyCustodyError('storeByokKey: userId is required');
  }
  if (!isByokProvider(provider)) {
    throw new KeyCustodyError(
      `storeByokKey: provider must be one of ${BYOK_PROVIDERS.join(', ')}`
    );
  }
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    throw new KeyCustodyError('storeByokKey: apiKey must be a non-empty string');
  }
  throw new NotImplementedError(`storeByokKey: ${NOT_WIRED}`);
}

/**
 * List a user's stored BYOK providers. No store yet ⇒ the truthful answer is an
 * empty list. Never throws.
 */
export async function listCustody(_userId: string): Promise<CustodyRecordView[]> {
  return [];
}

/**
 * Non-secret view of a user's stored key for a provider. No store yet ⇒ none.
 * Never opens an envelope; never throws.
 */
export async function getByokCustody(
  _userId: string,
  _provider: ByokProviderName
): Promise<CustodyRecordView | undefined> {
  return undefined;
}

/** Delete a user's stored key. No store to mutate yet — throws NotImplemented. */
export async function deleteByokKey(
  _userId: string,
  _provider: ByokProviderName
): Promise<boolean> {
  throw new NotImplementedError(`deleteByokKey: ${NOT_WIRED}`);
}

/**
 * THE point-of-use accessor: recover a user's plaintext BYOK key, or `undefined`
 * if there is nothing usable. With no custody store wired yet this always fails
 * CLOSED to `undefined` — exactly the documented "no stored key" degradation, so
 * a run proceeds only if a per-request `x-second-me-key` header is supplied.
 * Never throws.
 */
export async function useByokKey(
  _userId: string,
  _provider: ByokProviderName
): Promise<string | undefined> {
  return undefined;
}
