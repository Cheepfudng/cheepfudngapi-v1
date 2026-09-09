# TASKS — URGENT: Double-Checkout Lock Appears Missing

Mobile Phase 7 testing fired two `POST /v1/orders/checkout` calls back to back against the local server: both returned `201`, creating two separate orders with different `checkoutReference`s. Phase 11.5 built and verified a Redis-based lock specifically to prevent exactly this (`checkout:lock:{buyerId}`, one succeeds with `2xx`, the other gets `409`). This needs to be understood, not just re-implemented blindly.

## Investigate, in this order — determine the actual scope before fixing anything

- [x] **Reproduce the same test against staging, not just local.**

  **Finding — this repo has no environment difference to test between "local" and "staging" in the first place:** `.env` and `.env.staging` contain byte-identical `MONGODB_URI` and `REDIS_URL` values (same Mongo Atlas cluster, same managed Redis instance at `start-quartzlike-candied-84231.db.redis.io`). `env.ts` loads plain `.env` via `dotenv.config()` regardless of `NODE_ENV`. So "local" and "staging" in this codebase are the same live infrastructure — there was never a separate, possibly-unreachable local Redis to be the culprit.

- [x] Check whether `RedisLock`'s acquire logic fails open or fails closed on a Redis connection error/exception.

  **Finding — fails closed, correctly, by code inspection AND empirical test:** `RedisLock.acquire()` (`src/integrations/redis/redis.lock.ts`) has no try/catch around `redis.set(...)` — a connection error propagates as a rejected promise. `OrderService.checkout()` calls `acquire()` *before* its own try/finally block starts, so a thrown error there isn't swallowed anywhere in `checkout()` either; it propagates straight out through `asyncHandler` (`Promise.resolve(handler(...)).catch(next)`) to the global error handler, which returns an error response — checkout is never silently allowed through. Verified empirically: pointed a throwaway `ioredis` client at an unreachable host with the same `SET NX` command `RedisLock` uses — it threw rather than resolving a truthy token.

- [x] Check whether the lock code path is even being called at all in the current `checkout()` flow.

  **Finding — it's live and wired in correctly**, `checkout()` (`order.service.ts:76-84`) acquires `checkout:lock:{buyerId}` as its very first action and releases it in the outermost `finally` (line 242), wrapping the entire method including the Paystack call — nothing bypasses it. Confirmed empirically too: a true concurrent double-checkout (`Promise.all`) against this same shared infrastructure produced exactly one `201` and one `409 CONFLICT`, with exactly one `Order`/`checkoutReference` in Mongo afterward.

**Root cause of the actual mobile report — not a lock regression:** the lock only blocks *overlapping* checkout calls; it does nothing to prevent a *second, later* checkout call once the first has fully finished (which releases the lock). Checkout deliberately does **not** clear the buyer's cart — only a confirmed payment does (documented in the Orders section of `PROJECT_STATE.md` since Phase 11) — so if a buyer's cart is still non-empty after a first checkout attempt, a second, sequential checkout call is a **legitimate, correctly-authorized** request that creates a second real Order set. Reproduced this exact scenario directly: two checkout calls awaited one-after-another (not concurrently) against the same non-empty cart both returned `201`, creating 2 separate orders — matching mobile's report precisely. This is not new; it's the "adjacent risk" `PROJECT_STATE.md`'s Orders section already flagged back in Phase 11.5 ("rapid double-checkout on the *same* still-non-empty cart... can currently create multiple independent pending unpaid Order sets... This wasn't guarded against") and explicitly deferred alongside the auto-expiry job. Mobile's "back to back" test was almost certainly two sequential taps/requests, not two truly simultaneous ones — which is exactly the gap that was already known and named, not a new one.

## Fix

- [x] "The lock genuinely prevents a second concurrent checkout... and fails closed if Redis is unavailable" — **already true, verified empirically above, no code change required.** Nothing regressed; Phase 11.5's original implementation and its historical note both stand uncorrected — the lock was never broken.

  **Not fixed as part of this task, flagged instead:** the sequential/cart-not-cleared gap that mobile actually hit is real, but it's a distinct, already-documented, already-deliberately-deferred problem (see the Orders section of `PROJECT_STATE.md`) — not what this URGENT investigation was scoped to fix, and not something to silently bundle in here per the "no unrelated refactors" rule. Recommend scoping it as its own task (likely alongside the still-not-built auto-expiry-adjacent stock-release work it was originally deferred with).

## Test

- [x] Concurrent (`Promise.all`) checkout ×2 against this shared local/staging infrastructure → one `201` + one `409`, confirmed.
- [x] Only one Order/`checkoutReference` created after the concurrent test → confirmed (1, not 2).
- [x] Simulated a Redis connection failure → the underlying `SET NX` call throws rather than resolving a token → checkout would be rejected, not silently allowed through.

**Report:** this did **not** reproduce as a lock failure on the real (single, shared) infrastructure this repo runs against — the Phase 11.5 concurrency lock is working exactly as designed today, verified fresh. What mobile actually observed is the already-known, already-documented "double-checkout on a still-non-empty cart via two sequential requests" gap, which was explicitly deferred back in Phase 11.5 and is unrelated to the lock. No historical note needed correcting. Update `TASKS.md`/`PROJECT_STATE.md` when done, and correct Phase 11.5's own historical note if this turns out to have been broken for longer than just now — n/a, see above.
