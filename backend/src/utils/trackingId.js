/**
 * Tracking-ID generator.
 * Format: CIV-<year>-<6 chars>   e.g. CIV-2026-A7K3P9
 *
 * The alphabet excludes look-alike characters (I, O, 0, 1) so a human can
 * read a tracking ID off a phone screen and type it back without errors.
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTrackingId(year = new Date().getFullYear()) {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `CIV-${year}-${code}`;
}

/** Normalises user input such as "civ 2026 a7k3p9" into "CIV-2026-A7K3P9". */
export function normaliseTrackingId(input = '') {
  const raw = String(input).trim().toUpperCase().replace(/\s+/g, '');
  if (/^CIV\d{4}[A-Z0-9]{6}$/.test(raw)) {
    return `CIV-${raw.slice(3, 7)}-${raw.slice(7)}`;
  }
  return raw;
}
