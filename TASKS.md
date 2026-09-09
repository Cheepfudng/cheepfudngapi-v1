# TASKS — Fix: Cart Doesn't Enforce Product minimumOrder

Found during mobile Phase 5: `POST /v1/cart/add` accepts `quantity: 1` for a product with `minimumOrder: 300` and returns `200`. This was originally specified behavior for cart (reject below a product's `minimumOrder` on first add) — confirm it never actually got implemented, or regressed at some point, then fix it either way.

## Fix

- [ ] `CartService`'s add-to-cart logic: reject with `VALIDATION_ERROR` if the requested quantity is below the target product's `minimumOrder` on first add to the cart.
- [ ] Confirm the same check applies to `PUT /v1/cart/update` (setting an exact quantity) and `PATCH /v1/cart/increment` (in case a decrement could bring an existing line below the minimum — decide whether that's even reachable given increment only moves by 1, but confirm rather than assume).
- [ ] Audit whether this same gap exists at checkout (`POST /v1/orders/checkout`) — a cart item that somehow ended up below minimum (e.g. from before this fix shipped) shouldn't be allowed to proceed to a real order either.

## Test

- [ ] Add a quantity below `minimumOrder` → `400 VALIDATION_ERROR` with a clear message stating the actual minimum.
- [ ] Add a quantity at or above `minimumOrder` → succeeds, unchanged from current behavior.
- [ ] Confirm existing cart tests (accumulate-on-repeat-add, over-stock rejection) still pass — this shouldn't change any other cart behavior.

Update `TASKS.md`/`PROJECT_STATE.md` when done.
