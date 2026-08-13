/*
 * Members type their phone number however they say it out loud — "0244 000
 * 000", "+233 24 400 0000", "024-400-0000" — and users.phone stores that
 * string verbatim, because the profile form should show it back the way they
 * wrote it.
 *
 * Termii will not deliver to any of those. Its `to` field wants bare
 * international digits with no plus sign and no local trunk zero
 * (233244000000). A local 0-prefixed number is accepted by the API and then
 * silently fails to arrive, so the reminder job reports a success that never
 * reached anyone.
 *
 * Normalise at send time rather than on save: the stored value stays the one
 * the member recognises, and only the wire format changes.
 */

/** Ghana. KNUST members are overwhelmingly local numbers. */
const GHANA_CC = '233';

/*
 * E.164 caps a full international number at 15 digits and nothing real is
 * under 8. No country code begins with 0 either, which is what stops a junk
 * local string like "0000000000" from being read as an international one.
 */
const isPlausible = (digits) =>
  digits.length >= 8 && digits.length <= 15 && !digits.startsWith('0');

/**
 * Convert a stored phone number to the bare international form Termii expects.
 * Returns null when the input can't be read as a phone number, so callers can
 * report it instead of posting something undeliverable.
 */
const normalizePhone = (value) => {
  if (value === undefined || value === null) return null;

  const raw = String(value).trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Written as international ("+44…", "00233…"): trust the country code that's
  // already there. Exchange students don't all carry Ghanaian numbers.
  if (raw.startsWith('+')) return isPlausible(digits) ? digits : null;
  if (digits.startsWith('00')) {
    const withoutPrefix = digits.slice(2);
    return isPlausible(withoutPrefix) ? withoutPrefix : null;
  }

  // "233 024 400 0000" — country code with the local trunk 0 left in.
  if (digits.startsWith(`${GHANA_CC}0`) && digits.length === 13) {
    return GHANA_CC + digits.slice(4);
  }

  // "233244000000" — already correct.
  if (digits.startsWith(GHANA_CC) && digits.length === 12) return digits;

  // "0244000000" — the everyday local form.
  if (digits.length === 10 && digits.startsWith('0')) return GHANA_CC + digits.slice(1);

  // "244000000" — local form with the trunk 0 dropped.
  if (digits.length === 9 && !digits.startsWith('0')) return GHANA_CC + digits;

  return null;
};

module.exports = { normalizePhone };
