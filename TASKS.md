# TASKS — Phase 19: Product Moderation (Backend)

Started: 2026-08-22
Completed: 2026-08-22
Read PROJECT_STATE.md first (Products section). This closes a real pre-launch gap: `isApproved` has been hardcoded `true` at creation since Phase 8, meaning any verified farmer/vendor's listing goes straight to public visibility with zero review. That was an acceptable MVP shortcut with only test data in play — it stops being acceptable once mobile brings real sellers and real buyers together.

## Scope decisions

1. **Replace the `isApproved` boolean with a `moderationStatus` enum (`pending | approved | rejected`) — don't keep both.** A boolean can't distinguish "never reviewed" from "explicitly rejected," and keeping a derived/synced `isApproved` alongside the real enum would recreate the exact two-fields-tracking-the-same-thing pattern that's already caused real bugs twice on this project (`accountType`/`role`, `isEmailVerified`/`verificationStatus`). `moderationStatus` becomes the single source of truth; `isApproved` is removed from the schema entirely, not deprecated-but-kept.
2. **New products default to `moderationStatus: 'pending'`**, not auto-approved. This is the actual point of the phase — remove the hardcoded `true` from Phase 8's product creation, replace with the real default.
3. **Migration required for existing data.** Every product created before this phase has no `moderationStatus` at all — write a one-time migration setting `moderationStatus: 'approved'` for existing products (they were created under the old auto-approve rule, so grandfathering them in as approved is correct — don't silently un-list existing test/demo products by defaulting them to `pending`).
4. **Rejection requires a reason**, stored on the product (`rejectionReason`, optional string) — same pattern as Organizations/Campaigns rejection, for the same reason (a seller needs to know what to fix before resubmitting, once that flow exists on mobile).
5. **Email notification on approve/reject**, reusing the existing Brevo pattern already used for org verification and campaign approval decisions — this is consistency with established behavior, not a new decision to debate.
6. **This changes the public browse filter.** `GET /v1/products` and `GET /v1/products/:id` currently filter `isApproved: true` — update both to filter `moderationStatus: 'approved'` instead. Double-check the Phase 11.5.3 deactivated-seller filter (which sits alongside this) still combines correctly with the new field.

## Model + Enum

- [x] 19.1 — Add `ProductModerationStatus` enum (`pending | approved | rejected`) to `src/types/enums.ts`.
- [x] 19.2 — Update `Product` model: remove `isApproved`, add `moderationStatus` (enum, default `'pending'`) and `rejectionReason` (optional string).
- [x] 19.3 — Update `ProductService`'s creation logic to stop hardcoding approval — new products get the schema default (`pending`), no explicit override needed unless the codebase currently sets `isApproved: true` explicitly somewhere that needs removing (check and remove it if so).

## Migration

- [x] 19.4 — One-time migration script (or a startup migration step, whichever fits this codebase's existing conventions — check if any migration pattern already exists, don't invent a new one if there's precedent) setting `moderationStatus: 'approved'` on every existing product document. Run this against staging first, confirm the count of products updated matches the actual number of existing test products before considering it done.

## Endpoints

- [x] 19.5 — Update `GET /v1/products` and `GET /v1/products/:id` filters per Scope item 6.
- [x] 19.6 — Update `GET /v1/admin/products` to filter by `moderationStatus` instead of/in addition to the old `isApproved` query param (replace it — don't support both an old and new filter param for the same underlying field).
- [x] 19.7 — New: `PUT /v1/admin/products/:id/moderate` — `requireRole(ADMIN)`, body `{ decision: 'approved' | 'rejected', rejectionReason? }` (`rejectionReason` required when rejecting, same validation pattern as Organizations/Campaigns). Sets `moderationStatus` accordingly, sends the Brevo email per Scope item 5.

## Docs

- [x] 19.8 — Update OpenAPI: `Product` schema (`moderationStatus`/`rejectionReason` replacing `isApproved`), the two changed public endpoints, the updated admin list filter, and the new moderate endpoint.

## Test pass

- [x] 19.9
  1. Create a new product as a verified farmer/vendor → `moderationStatus: 'pending'`, confirm it does NOT appear in public `GET /v1/products`.
  2. Migration: confirm existing pre-phase products now show `moderationStatus: 'approved'` and still appear in public browse — no accidental de-listing.
  3. Admin approves a pending product → `moderationStatus: 'approved'`, now appears in public browse, seller receives the approval email.
  4. Admin rejects without a reason → `400 VALIDATION_ERROR`.
  5. Admin rejects with a reason → `moderationStatus: 'rejected'`, `rejectionReason` stored, product does NOT appear in public browse, seller receives the rejection email with the reason.
  6. `GET /v1/admin/products?moderationStatus=pending` → correct filtering.
  7. A non-admin (including the product's own verified seller) hitting the moderate endpoint → `403`.
  8. Regression: confirm the Phase 11.5.3 deactivated-seller filter still correctly excludes products from a deactivated org's storefront, combined correctly with the new `moderationStatus` filter (both conditions must hold, not one overriding the other).

**Migration results (2026-08-22, staging):** baseline confirmed via direct count first (5 total products, 5 missing `moderationStatus`) — matched TASKS' "confirm the count before considering it done" requirement. First run correctly set `moderationStatus: approved` on all 5, but a real Mongoose gotcha surfaced: `ProductModel.updateMany()`'s schema-strict casting silently drops `$unset` (and `$set`) on fields no longer declared in the schema, so the stale `isApproved` field never actually got removed by the combined `$set`+`$unset` in one call. Split into two idempotent steps — the `$set` via the normal Mongoose model, the `$unset` via the raw driver collection (`ProductModel.collection.updateMany`) to bypass that casting — and re-ran; verified after: 5/5 `moderationStatus: approved`, 0/5 still carrying the stale `isApproved` field.

**Test results (2026-08-22):** 21/21 assertions passed via a throwaway HTTP-level integration script against staging Mongo+Redis (real Express server, real fetch, real multipart product creation through the actual endpoint for item 1, direct repository inserts for the other fixtures), script deleted after the run. Covered all 8 items, including the 409-on-re-moderation guard (not explicitly listed but added to match the Organizations/Campaigns "already reviewed" pattern per 19.7's own instruction) and the deactivated-seller + moderationStatus combined-filter regression.

Update `TASKS.md` checkboxes and add a "Product Moderation" note to `PROJECT_STATE.md`'s Products section (not a new section) when done — including the exact new field names/enum values, since the admin frontend's next phase depends on this being documented precisely.
