# Cheepfud Backend — Claude Code Instructions

Cheepfud.ng is a Nigerian food access, marketplace, and donation platform. This is the backend (Node/Express/TypeScript/MongoDB/Redis), currently in MVP Phase 1.

See @BACKEND_RULES.md for the full architecture constitution — layering rules, naming, error handling, security requirements. Follow it strictly, no exceptions without a documented reason.

See @PROJECT_STATE.md for what's already built, the key design decisions behind it, and which files implement what. Read this before writing any code — most new work extends an existing pattern rather than inventing one.

See @TASKS.md for the current task queue. This is the active work order.

## Working agreement

- **Follow existing patterns exactly.** Before building a new domain, look at how Onboarding, Auth, Organizations, or Admin are structured (model → repository → service → controller → validator → routes) and mirror it. Don't introduce a new pattern for something an existing domain already solved (pagination, file upload, ownership checks, etc.).
- **Reuse, don't duplicate.** `asyncHandler`, `sendSuccess`/`sendError`, `AppError`/`ErrorCode`, `validateRequest`, `protect`, `requireRole`, `requireVerifiedOrganization`, the Cloudinary upload pattern from `document.service.ts` — all of these already exist. Extend `ErrorCode` rather than inventing ad hoc error shapes.
- **TypeScript strict, no `any`.** Match the existing repo's `tsconfig.json` settings.
- **Every new domain needs:** model, repository, service, controller, validator, routes file, wired into `service-container.ts` and `app.ts`, and an OpenAPI entry in `src/docs/openapi.ts` (paths + schemas, matching the existing style — see how Auth/Organizations are documented there).
- **Test before marking a task done:** run `npx tsc --noEmit` clean, then actually exercise the endpoint (curl or a quick script is fine) against a local/staging Mongo+Redis, not just "it compiles." Note what you tested in your summary.
- **Update `TASKS.md` as you go** — check off `[ ]` → `[x]` for each subtask as it's completed and verified, don't wait until the end.
- **Don't silently change an existing decision** documented in `PROJECT_STATE.md` (e.g. response shape, enum values, verification flow). If something there seems wrong or blocking, stop and flag it rather than working around it.
- **Ask before:** changing anything in `BACKEND_RULES.md` itself, changing the DB connection/deployment config, or any decision that would affect the mobile/admin frontend's existing API contract (breaking a field name, changing a status code meaning, etc.).
- **Small commits, one logical piece at a time** — same phase-based approach as the rest of this project. Don't build ahead into Cart/Orders/Campaigns even if it seems convenient; those are separate upcoming phases.
