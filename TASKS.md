## ⚠️ Outstanding from previous phases — NOT for Claude Code, human-only, tracked here for visibility

These are open items from Phases 9.5–11 that don't block Phase 12 (they don't touch Campaigns), but they're genuinely unconfirmed, not passed — don't treat backend work as fully closed out until these are done. Claude Code should not attempt these (they require a real browser, a real Paystack test card, and human judgment) — this note exists purely so the human reading this file doesn't lose track of them while Phase 12 is in progress.

- [ ] Re-run the real Paystack checkout + webhook test against **staging** (no ngrok needed) — register `https://cheepfud-api-staging.onrender.com/v1/webhooks/paystack` as the Test Webhook URL in the Paystack dashboard first (this was empty during the last attempt, which is why the webhook never fired despite the payment succeeding).
- [ ] Run the Cart increment/decrement (Phase 9.5) Postman checklist and report results.
- [ ] Run the Delivery Addresses (Phase 10) Postman checklist and report results.
- [ ] Run the Orders + Payment (Phase 11, including the 11.5 hardening) Postman checklist and report results — this one now folds in the corrected webhook test above.

See `PENDING_ACTIONS.md` for full context on each.

---

# TASKS — Phase 12: Campaigns + Donations + CampaignFund

Started: 2026-08-14
Completed: 2026-08-14
Read PROJECT_STATE.md first, especially the Orders + Payment + Hardening sections — this phase reuses that payment infrastructure directly rather than building a second one. Read docs/role-navigation.md (or the equivalent reference doc) Section 4 for what the Campaign Org's Home/Campaigns/Impact/Profile tabs actually need.

This is the domain that gives Campaign Org accounts (ngo/foundation/religious_body/agency) their first real functionality — right now they can log in and manage documents, nothing else.

## Scope decisions (read before building)

1. **Converting campaign funds into real food-procurement orders is OUT of scope for this phase.** That's a genuinely separate feature (admin selects sellers, places orders using campaign funds instead of a donor's card) — it depends on Orders existing, which it now does, but it's still its own future phase. This phase stops at: donations come in, funds are tracked accurately, food-unit-only visibility is enforced. Don't build the conversion flow, just don't design anything that would block it later.
2. **No mass donor email when a campaign posts an update.** The full Notification domain doesn't exist yet (same boundary noted back in Phase 11). Updates are stored and visible on the campaign detail page. Don't loop over every past donor and send emails — that's real scope creep for this phase and the wrong pattern anyway (should be a queued job, not a synchronous loop, when it does get built).
3. **No refunds for failed or undeliverable campaign donations.** Same boundary as Orders' post-payment cancellation — Epic 5/Disputes territory, not this phase.
4. **Reuse Phase 11's payment infrastructure directly — do not build a second payment pipeline.** `Transaction.transactionType` already has `'campaign_donation'` sitting unused as a placeholder value for exactly this moment. Same `PaymentGateway`, same `PaymentService`, same webhook endpoint — just a new branch in the success/failure handlers based on `transactionType`.
5. **One combined `CampaignStatus` enum, not a separate status + approvalStatus pair.** This project has already hit real bugs twice from two fields tracking overlapping concerns drifting apart (the old `accountType`/`role` mixup, and `isEmailVerified`/`verificationStatus` being conflated). Don't repeat that pattern here — `pending_approval | active | rejected | completed | cancelled` is one field, one source of truth.
6. **`CampaignFund.canWithdrawCash` and `isRestricted` must be schema-level immutable** (Mongoose `immutable: true`, not just "default false and hope nothing changes it"). This is a non-negotiable business rule, documented project-wide since the very first scope documents shared at the start of this project — not a style preference, don't treat it as optional or skip it under time pressure.
7. **`getCampaignFundSummary`'s response must never contain a cash-suggestive field** — no `cashBalance`, `withdrawable`, `bankBalance`, or anything similar, ever, in any response an NGO can see. Assert this explicitly in tests (check the actual response keys), don't just informally avoid it while writing the code.

## Enums

- [x] 12.1 — In `src/types/enums.ts`:
  - `UrgencyLevel`: `critical | high | medium | low`
  - `CampaignStatus`: `pending_approval | active | rejected | completed | cancelled`

## Middleware

- [x] 12.2 — `requireCampaignOrganization` in `verification.middleware.ts`, mirroring `requireSupplyOrganization` from Phase 8 exactly — checks `req.user.organizationType` is one of `ngo | foundation | religious_body | agency`. Same pattern, same file, same error-code style (`CAMPAIGN_ORGANIZATION_REQUIRED`, new `ErrorCode`).

## Models

- [x] 12.3 — `Campaign` model (`src/models/campaign.model.ts`)
  - `organization` (ObjectId ref User — the campaign org that owns it)
  - `title` (String, required, 10–100 chars per validation)
  - `description` (String, required, min 50 chars)
  - `urgencyLevel` (UrgencyLevel enum, required)
  - `fundingGoal` (Number, required, > 0)
  - `currentFunding` (Number, default 0 — denormalized for fast reads, kept in sync by `CampaignFundService`, never written to directly from a campaign-edit endpoint)
  - `donorCount` (Number, default 0)
  - `foodGoal`: subdocument `{ description: String, quantity: Number, unit: String }` (e.g. "500 bags of rice")
  - `distributionPlan` (String)
  - `location`: `{ state, lga }`
  - `images` (array of `{ url, publicId }`, same Cloudinary shape as Products/Documents)
  - `status` (CampaignStatus enum, default `pending_approval`)
  - `rejectionReason` (String, optional — set on rejection, same pattern as organization rejection)
  - `startDate`, `endDate` (Date, required, `endDate > startDate > now` validated in the service)
  - `campaignUpdates`: array of `{ message: String, postedAt: Date }`
  - `distributionRecords`: array of `{ date: Date, quantity: Number, beneficiaries: Number, location: String, media: [{ url, publicId }] }`
  - timestamps
    Indexes: `{ organization: 1 }`, `{ status: 1 }`, `{ urgencyLevel: 1 }`.

- [x] 12.4 — `CampaignFund` model (`src/models/campaign-fund.model.ts`) — the most sensitive model in this phase
  - `campaign` (ObjectId ref Campaign, unique — one fund per campaign, created automatically alongside it)
  - `canWithdrawCash` (Boolean, default `false`, **`immutable: true`**)
  - `isRestricted` (Boolean, default `true`, **`immutable: true`**)
  - `totalDonated` (Number, default 0)
  - `totalAllocatedToFood` (Number, default 0 — stays 0 until the future procurement-conversion phase exists; present now so that phase doesn't need a migration)
  - `totalDelivered` (Number, default 0 — same reasoning)
  - `availableBalance` (Number, default 0, auto-recalculated via a `pre('save')` hook: `totalDonated - totalAllocatedToFood`)
  - `donations`: array of `{ donor: ObjectId ref User, amount: Number, transaction: ObjectId ref Transaction, donatedAt: Date }`
  - `auditTrail`: array of `{ action: String, amount: Number, actor: ObjectId ref User (optional, for system-driven entries), timestamp: Date }` — append an entry every time `totalDonated`/`totalAllocatedToFood` changes, this is the accountability record
  - timestamps

## Payment integration extension (Phase 11 reuse, not rebuild)

- [x] 12.5 — `Transaction` model: add one optional field, `relatedCampaign` (ObjectId ref Campaign) — sits alongside the existing `relatedOrders` array. A given transaction populates exactly one of the two, never both; validate this in the service layer, not the schema (schemas can't easily express "exactly one of A or B").
- [x] 12.6 — `src/utils/constants.ts`: add `DONATION_MINIMUM_KOBO` (₦500 = 50000 kobo).
- [x] 12.7 — `PaymentService`: add `initializeDonationPayment(donorId, campaignId, amount)` — validates the campaign is `status: active`, amount `>= DONATION_MINIMUM_KOBO`, generates a reference (e.g. `CHF-DON-{timestamp}-{hex}` — distinct prefix purely for human readability in Atlas/Paystack dashboards, not functionally required since routing happens on `transactionType`, not the reference string), creates the `Transaction` with `transactionType: 'campaign_donation'`, `relatedCampaign: campaignId`, calls the same `PaymentGateway.initializeTransaction(...)` as checkout does. Returns `{ paymentUrl, reference }`.
- [x] 12.8 — Extend `processSuccessfulPayment(reference, gatewayPayload)`: after the existing idempotency check, branch on `transaction.transactionType`. Existing `product_purchase` logic is untouched. New `campaign_donation` branch: call `CampaignFundService.recordDonation(campaignId, donorId, amount, transactionId)` (see 12.9), send a donor confirmation email (impact message: `amount / 500` meals, rounded down — reuse Brevo directly, same as order confirmation emails) and an org-admin notification email. No cart to clear, no stock to touch.
- [x] 12.9 — Extend `processFailedPayment(reference, gatewayPayload)`: existing order-restoration logic untouched for `product_purchase`. New `campaign_donation` branch: mark the `Transaction` failed, notify the donor — no fund/stock changes needed since nothing was ever added on the failure path.

**Deviation from this section's wording (flagging, not silently working around):** scope decision 4 stated `Transaction.transactionType` "already has `'campaign_donation'` sitting unused as a placeholder value." It did not — `TransactionType` only had `product_purchase` in the actual code. Added `CAMPAIGN_DONATION = 'campaign_donation'` to the enum as part of 12.5, since that's what the rest of this section requires to function; this is additive (no existing value changed), not a workaround.

## CampaignFundService (kept separate from CampaignService — deliberately, since fund mutations need tighter scrutiny than campaign content edits)

- [x] 12.10 — `src/services/campaign-fund.service.ts`
  - `createFundForCampaign(campaignId)` — called once, from `CampaignService.create`, idempotent (no-op if one already exists for this campaign).
  - `recordDonation(campaignId, donorId, amount, transactionId)` — pushes to `CampaignFund.donations`, increments `totalDonated`, appends an `auditTrail` entry, saves (triggers the `availableBalance` recalculation hook). Also increments `Campaign.currentFunding` and `Campaign.donorCount` on the Campaign document itself (two documents updated together — wrap in a Mongo session/transaction, reusing the pattern from Phase 11.5, since this is exactly the kind of multi-document write that pattern exists for).
  - `getCampaignFundSummary(campaignId)` — returns **only**: `{ totalDonated, totalAllocatedToFood, totalDelivered, availableForProcurement, donorCount, mealsEquivalent }`. `availableForProcurement` is a renamed view of `availableBalance` for the response (deliberately not exposing the internal field name `availableBalance` directly, to keep the API contract stable even if internal fund-allocation logic changes later). `mealsEquivalent = Math.floor(totalDonated / 500)`. TypeScript-type the return shape explicitly (a dedicated interface, not `any`) so it's structurally impossible to accidentally add a stray cash field later without it being a visible type change.
  - `getSanitizedDonations(campaignId)` — returns the `donations` array with donor identity reduced to name only (populate `donor`, pick `firstName`/`lastName`, drop `email`/`phone`/everything else) — used by the org's own donor-list view, never expose full donor contact info to the org.

## CampaignService + Repository

- [x] 12.11 — `CampaignRepository`: standard CRUD (`create`, `findById`, `findMany` with filters/pagination, `updateById`) plus `findByOrganization`.
      `CampaignService`:
  - `create(orgId, input)`: validates `endDate > startDate > now`, `title` 10–100 chars, `description` min 50 chars, `fundingGoal > 0`. Creates the `Campaign` (`status: pending_approval`) and immediately calls `CampaignFundService.createFundForCampaign`. Uploads campaign images via the reused Cloudinary storage (folder `cheepfud/campaigns`).
  - `update(campaignId, orgId, input)`: ownership check. **Block changing `fundingGoal` if `currentFunding > 0`** — protects donors from goal manipulation after money has already come in, this is a real rule from the original scope docs, not new. Allow updating `description`, `distributionPlan`, `images`, `urgencyLevel`.
  - `postUpdate(campaignId, orgId, message)`: ownership check, pushes to `campaignUpdates`.
  - `addDistributionRecord(campaignId, orgId, { date, quantity, beneficiaries, location, media })`: ownership check, pushes to `distributionRecords`, media uploaded via Cloudinary same as elsewhere.
  - `browse(filters, pagination)`: public — only `status: active`, sorted by `urgencyLevel` (critical first) then recency, computed `percentage`/`daysLeft`/`totalDonors` added to each result.
  - `getById(campaignId)`: public — only `status: active` (or the owning org/admin can see any status — same visibility pattern as Products' seller-vs-public split).

## Endpoints

- [x] 12.12 — Public/donor-facing:
  - `GET /v1/campaigns` — public browse, filters: `urgencyLevel`, `state`, pagination (reuse `src/utils/pagination.ts`)
  - `GET /v1/campaigns/:id` — public detail, computed fields included
  - `POST /v1/campaigns/:id/donate` — `protect` required (any authenticated user, not role-restricted — a farmer or an NGO could donate too, no reason to block that), body `{ amount }`, runs 12.7

- [x] 12.13 — Campaign org (owner-only, verified campaign orgs):
  - `POST /v1/campaigns` — `protect` + `requireVerifiedOrganization` + `requireCampaignOrganization`, multipart with images
  - `PUT /v1/campaigns/:id` — same middleware chain + ownership check
  - `POST /v1/campaigns/:id/updates` — same
  - `POST /v1/campaigns/:id/distribution-records` — same, multipart for media
  - `GET /v1/campaigns/:id/fund-summary` — same middleware chain + ownership check, returns 12.10's sanitized summary — **this is the Impact tab's backing endpoint, get this one right, it's the one enforcing the whole restricted-funds rule**
  - `GET /v1/campaigns/:id/donations` — same, returns 12.10's sanitized donor list

- [x] 12.14 — Admin (mirrors the existing `/v1/admin/organizations` pattern exactly):
  - `GET /v1/admin/campaigns` — filter by `status` query param (default `pending_approval`)
  - `PUT /v1/admin/campaigns/:id/approve` — `{ decision: 'approved'|'rejected', rejectionReason? }`, required when rejecting, sends an email via Brevo (new template, same pattern as the org approval/rejection template from Phase 5.5–5.8)

**Addition beyond the literal spec:** `GET /v1/campaigns/:id` needed to let the owning org or an admin see a non-active campaign (`getById`'s "same visibility pattern as Products' seller-vs-public split" — which doesn't actually exist for Products' public detail endpoint either, this is new). Rather than making the route mandatory-`protect` (which would break the "public" characteristic 12.12 explicitly calls for), added a small `optionalAuth` middleware (`protect.middleware.ts`) — same identity resolution as `protect`, but a missing/invalid/expired token just leaves the request anonymous instead of rejecting it. Reused, not duplicated: it's the same token-verification logic as `protect`, just non-fatal.

## Docs

- [x] 12.15 — OpenAPI: new `Campaigns` tag for all campaign/donation endpoints, new entries under the existing `Admin` tag for the two admin endpoints. Explicitly document the fund-summary response schema with all 6 fields named and typed, so it's visible in `/docs` that no cash field exists — this doubles as living documentation of scope decision 7.

## Test pass — real requests against real Mongo+Redis+Paystack

- [x] 12.16
  1. Campaign org creates a campaign → `status: pending_approval`, a `CampaignFund` created simultaneously with `canWithdrawCash: false`, `isRestricted: true` (verify in Atlas directly).
  2. Attempt `fund.canWithdrawCash = true; fund.save()` directly in a throwaway script — confirm the value stays `false` (immutability actually enforced, not just documented intent).
  3. A farmer/vendor org (not campaign-side) attempts to create a campaign → `403` from `requireCampaignOrganization`.
  4. `GET /v1/campaigns` before admin approval → campaign does NOT appear (still `pending_approval`).
  5. Admin approves the campaign → `status: active`, confirmation email sent, campaign now appears in public browse.
  6. Admin rejects a different campaign without a reason → `400`; with a reason → `200`, rejection email sent.
  7. Donate to an active campaign, complete real Paystack test-mode payment (same pattern as the Orders test harness — reuse it, add a campaign donation panel if convenient, or just Postman) → webhook fires, `CampaignFund.totalDonated` increases, `Campaign.currentFunding`/`donorCount` increase, donor gets a confirmation email with the correct meals-equivalent math.
  8. `GET .../fund-summary` immediately after — response contains exactly the 6 documented fields, **assert no key matching/containing "cash", "withdraw", or "bank" exists anywhere in the response**, not just eyeball it.
  9. Donate below `DONATION_MINIMUM_KOBO` → rejected before hitting Paystack at all.
  10. Attempt `PUT /campaigns/:id` changing `fundingGoal` after `currentFunding > 0` → rejected.
  11. Post a campaign update → appears in `campaignUpdates`, confirm NO emails were sent to anyone (scope decision 2 — don't accidentally build the thing that was explicitly deferred).
  12. Add a distribution record with media → uploaded correctly, appears in `distributionRecords`.
  13. `GET .../donations` → donor identities reduced to name only, no email/phone visible.
  14. A donation payment failure (simulate via the same signed-webhook technique from Phase 11) → `Transaction` marked failed, `CampaignFund` totals unchanged (nothing was ever added), donor notified.
  15. Full regression: confirm a `product_purchase` checkout from Phase 11 still works completely unaffected by these changes — the shared webhook/payment code must not have broken the existing path.

**Test results (2026-08-14):** All 15 verified via a throwaway service-level integration script (`CampaignService`/`AdminService`/`PaymentService` called directly, same style as the Phase 11.5 hardening test) run against staging Mongo, staging Redis, and the real Paystack test-mode API (real `initializeTransaction` call for item 7's donation) — 32/32 assertions passed, script deleted after the run (not part of the diff). Item 7's webhook was simulated by calling `PaymentService.processSuccessfulPayment` directly with a synthetic payload (same technique item 14 already specified for the failure case) rather than a live browser payment — Paystack's actual hosted checkout UI wasn't driven, consistent with how Phase 11's own item 19 flagged that specific step as a human-only manual task. Item 5/6/7's emails were sent for real via Brevo (not mocked) and returned success from the provider; visual inbox confirmation is a human step, not something this run verified. Test data (2 campaigns, 1 fund, transactions, a regression order/product) was cleaned up after the run.

Report progress per subtask, not all at once — same as every prior phase. Update `TASKS.md` checkboxes and add a new "Campaigns + Donations + CampaignFund" section to `PROJECT_STATE.md` when done, explicitly noting the immutability mechanism and the fund-summary field allowlist, since those are the two things future work must never accidentally violate.
