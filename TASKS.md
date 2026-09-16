# TASKS — Fix: Product Update Silently Ignores Category and Image Changes

Found via mobile Phase 9: `PUT /v1/products/:id` returns success even when `category`/`images` are included in the payload, but neither actually changes — the update is silently partial. Mobile has worked around this by making those fields read-only on the edit form, but the real fix belongs here.

## Decide and fix

- [x] **Support genuinely updating `category`.** Confirmed root cause: no deliberate scope reason — `ProductController.update` simply destructured 8 named fields from `req.body` and never included `category` (`UpdateProductInput` never declared it either). A plain oversight, not a decision. Fixed by adding `category` to `UpdateProductInput`, the controller's destructure, and `updateProductValidation`.
- [x] **Support genuinely updating `images`.** `PUT /v1/products/:id` now accepts `multipart/form-data` (in addition to `application/json`, which every other field keeps using unchanged) — sending new `images` files uploads them to Cloudinary and replaces the product's entire image set, same pattern/folder as `createProduct`. Cloudinary cleanup of the old, now-orphaned images **was done** — see below, not left orphaned.
- [x] N/A — no scope reason existed, so the "explicitly reject" branch wasn't needed; both fields now genuinely update.

**Implementation:** `ProductRepository.updateById` already accepted an arbitrary `Partial<IProduct>`, so nothing needed to change there. The route (`PUT /v1/products/:id`) gained the `uploadProductImages` multer middleware, same as `POST /v1/products` — multer no-ops on non-multipart requests (calls `next()` untouched when `Content-Type` isn't `multipart/form-data`), so every existing JSON-only caller (price/quantity/location/etc.) is completely unaffected; this was verified, not assumed. `ProductService.updateProduct` gained an optional trailing `files` param: when files are present, it uploads the new set, builds the new `images` array, then best-effort deletes each of the product's *previous* images from Cloudinary (wrapped in try/catch — a cleanup failure is logged at error level and never fails the update itself, since the new images are already live either way). Added a `delete(publicId, resourceType)` method to the `DocumentStorage` contract + `CloudinaryDocumentStorage` (`cloudinary.uploader.destroy`) to support this — the contract previously only had `upload`.

**Known, deliberate limitation (not a new inconsistency):** a multipart update request (needed for images) can't also carry a nested `location: { state, lga }` object — multer/busboy doesn't parse nested bracket-notation fields, the exact same limitation `POST /v1/products` already has and works around with flat `state`/`lga` fields. Since this task only asked about `category`/`images`, `location`'s existing nested-JSON-only contract was left exactly as it was rather than redesigning it unprompted; a caller who needs to change images and location in the same request can't yet (two separate requests work fine). Flagging for whoever scopes that next, not fixing here.

## Also worth closing while in this area

- [x] **`GET /v1/products/mine/:id`** — bundled in, since it was small and directly adjacent (reuses the existing `getOwnedProduct` private method, already built for update/delete's ownership check). Same gating as `/mine` (`protect` + `requireVerifiedOrganization` + `requireSupplyOrganization`), returns the product regardless of `moderationStatus`/`isActive` as long as the caller owns it, `403` (not 404) if it exists but belongs to someone else — matching the existing `update`/`delete` ownership-check convention exactly, `404` if it doesn't exist at all.

## Test

- [x] Update a product's `category` → actually changes, confirmed via a fresh `GET`.
- [x] Update a product's `images` → actually changes to the new set (old images verifiably gone — checked the actual `publicId`s in the response, not just count).
- [x] Existing field updates (price, quantity, location, etc.) still work unchanged — regression confirmed, including the nested `location` JSON object specifically (the field most at risk from the multipart-middleware addition).
- [x] Honest either way — no silent partial success: both fields now genuinely persist; nothing is silently accepted-and-ignored anymore.

**Verified via a 16-assertion HTTP-level integration test** against staging Mongo+Redis+real Cloudinary uploads: `category` update, a JSON-only regression update (price/quantity/nested-location, confirming images stay untouched when no files are sent), a multipart image-replace update (2 new real images uploaded, old one's `publicId` confirmed absent from the result, a simultaneous text field (`name`) confirmed also applied in the same multipart request), `GET /products/mine/:id` for the owner (200, sees the `pending` product), for a different seller (403), and confirmation the public `GET /products/:id` is unaffected (still 404s for the same pending product). All passing. `npx tsc --noEmit` clean, script deleted after the run, no stray files.

Update `TASKS.md`/`PROJECT_STATE.md` when done — mobile's edit form can then remove the read-only restriction on these two fields once this ships.
