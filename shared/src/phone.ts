import { parsePhoneNumberWithError, type CountryCode } from 'libphonenumber-js';

/** Default region when a number has no country code of its own (e.g. a
 * local PBX extension dial-out like "03-87654321") — see the task's spec:
 * this must assume Malaysia unless the number is already in international
 * form. */
export const DEFAULT_REGION: CountryCode = 'MY';

/**
 * Normalizes any phone number string to E.164 (e.g. "03-87654321" ->
 * "+60387654321"). Returns null for input that isn't a valid number at all
 * (PBX extensions like "204" are NOT valid phone numbers and intentionally
 * return null — callers should keep short extension numbers as-is instead
 * of trying to normalize them).
 */
export function normalizePhone(raw: string, defaultRegion: CountryCode = DEFAULT_REGION): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = parsePhoneNumberWithError(trimmed, defaultRegion);
    if (!parsed.isValid()) return null;
    return parsed.number;
  } catch {
    return null;
  }
}

/** True if `value` looks like a short internal extension (digits only, PBX
 * extensions on CD-series systems are 2-5 digits) rather than a real PSTN
 * number — used to decide whether to even attempt normalizePhone(). */
export function isLikelyExtension(value: string): boolean {
  return /^\d{2,5}$/.test(value.trim());
}
