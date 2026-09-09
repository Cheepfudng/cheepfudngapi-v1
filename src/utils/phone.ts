// Single source of truth for Nigerian phone validation/normalization, shared by every
// phone-collecting endpoint (onboarding, addresses) so the same number can't be valid in
// one place and invalid in another.
//
// Accepts the three equivalent ways a Nigerian mobile number is commonly written:
//   0   + 10-digit subscriber number   e.g. 08012345678  (local format, no country code)
//   234 + 10-digit subscriber number   e.g. 2348012345678
//   +234 + 10-digit subscriber number  e.g. +2348012345678
//   10-digit subscriber number alone   e.g. 8012345678
// The subscriber number itself always starts with 7, 8, or 9 (every Nigerian mobile
// network prefix — 070x/080x/081x/090x/091x/etc. — starts with one of these).
const NIGERIAN_PHONE_PATTERN = /^(?:\+?234|0)?([789]\d{9})$/;

export const isValidNigerianPhone = (value: string): boolean =>
  NIGERIAN_PHONE_PATTERN.test(value.trim());

// Canonical stored format is +234 + the 10-digit subscriber number, regardless of which
// valid input format was submitted. Returns the input unchanged if it doesn't match —
// callers should validate with isValidNigerianPhone (or the shared express-validator rule
// below) first; this is never reached with an invalid value on the request path since
// validateRequest rejects the request before a controller/service ever sees it.
export const normalizeNigerianPhone = (value: string): string => {
  const match = NIGERIAN_PHONE_PATTERN.exec(value.trim());
  return match ? `+234${match[1]}` : value;
};
