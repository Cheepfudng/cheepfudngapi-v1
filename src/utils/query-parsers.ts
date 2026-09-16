// Query-string values always arrive as strings (or undefined) — this converts the common
// "true"/"false" boolean query param shape into a real boolean, or undefined if absent.
// Shared so every list endpoint that accepts an optional boolean filter (admin
// users/orders/products, a seller's own product listing) parses it identically rather than
// each controller reimplementing the same three lines.
export const parseOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  return value === 'true' || value === true;
};
