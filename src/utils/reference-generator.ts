import crypto from 'crypto';

// ORD-YYYYMMDD-XXXXXX (6 uppercase hex chars). Collisions are astronomically unlikely
// (16^6 combinations per calendar day) and are still caught by the schema's unique index
// if one ever occurs — not retried here, consistent with how other generated
// identifiers in this codebase (e.g. cart/checkout references) aren't retried either.
export const generateOrderNumber = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${y}${m}${d}-${random}`;
};

// CHF-{timestamp}-{randomHex}. Shared as both the checkout event's linking key across
// sibling Orders and the Transaction's transactionReference (they're the same value).
export const generateCheckoutReference = (): string => {
  const random = crypto.randomBytes(4).toString('hex');
  return `CHF-${Date.now()}-${random}`;
};

// CHF-DON-{timestamp}-{randomHex}. Distinct prefix purely for human readability in
// Atlas/Paystack dashboards — routing is always by Transaction.transactionType, never by
// parsing this string.
export const generateDonationReference = (): string => {
  const random = crypto.randomBytes(4).toString('hex');
  return `CHF-DON-${Date.now()}-${random}`;
};
