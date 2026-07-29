# Cheepfud Backend Engineering Rules

> **Status:** Mandatory
>
> This document is the engineering contract for the Cheepfud backend.
> It applies to all human developers and AI coding assistants, including
> ChatGPT, Codex, Claude, and any future development tool used on the project.
>
> Before creating, modifying, reviewing, refactoring, or generating backend
> code, these rules must be followed.

---

## 1. Purpose

The Cheepfud backend must remain:

- Modular
- Testable
- Maintainable
- Secure
- Explicit
- Independently deployable
- Easy for frontend clients to consume
- Resistant to accidental business-rule violations

The backend must be built so that business rules remain independent of:

- HTTP
- Express
- MongoDB/Mongoose
- Redis
- Brevo
- Paystack
- Cloudinary
- Termii
- Resend
- Sentry
- Any other third-party provider

The core principle is:

> **Separate what the business does from how data is stored, how external systems are accessed, and how HTTP requests are handled.**

---

# 2. Mandatory Layered Architecture

The default application flow is:

```text
HTTP Request
    ↓
Routes
    ↓
Middleware
    ↓
Controllers
    ↓
Services / Application Logic
    ↓
Repositories / Data Access
    ↓
Database
```

External integrations follow a separate boundary:

```text
Services
    ↓
Internal Interfaces / Capabilities
    ↓
Integration Adapters
    ↓
External Providers
```

Examples:

```text
OnboardingService
    ↓
UserRepository
    ↓
MongoDB / Mongoose
```

```text
OnboardingService
    ↓
OtpService
    ↓
OtpRepository
    ↓
Redis
```

```text
OnboardingService
    ↓
EmailService
    ↓
BrevoEmailAdapter
    ↓
Brevo API
```

The layers have distinct responsibilities.

---

# 3. Dependency Direction

Dependencies should flow toward business/application logic.

Preferred direction:

```text
Presentation
    ↓
Application / Service Layer
    ↓
Domain Rules
    ↓
Infrastructure Implementations
```

Rules:

- Routes may depend on controllers and middleware.
- Controllers may depend on services.
- Services may depend on repository abstractions and integration abstractions.
- Repository implementations may depend on Mongoose/models.
- Integration implementations may depend on third-party SDKs/APIs.
- Services must not depend on Express `Request` or `Response`.
- Business logic must not depend directly on Mongoose.
- Business logic must not depend directly on third-party SDKs.
- Infrastructure details must not leak unnecessarily into the domain/application layer.

When practical, higher-level services should depend on interfaces or internal capabilities rather than concrete infrastructure implementations.

---

# 4. Presentation Layer

The presentation layer handles HTTP concerns.

It consists primarily of:

- Routes
- Controllers
- HTTP middleware
- Request validation

## 4.1 Routes

Routes are responsible for:

- Defining HTTP methods.
- Defining URL paths.
- Applying middleware.
- Connecting requests to controllers.

Example:

```text
Route
    ↓
Authentication Middleware
    ↓
Validation Middleware
    ↓
Controller
```

Routes must not contain business logic.

Routes must not:

- Query MongoDB.
- Call Mongoose models directly.
- Call Brevo, Paystack, Redis, Cloudinary, Termii, Resend, or other providers.
- Perform complex calculations.
- Decide business eligibility.
- Implement workflows.

---

## 4.2 Controllers

Controllers handle HTTP concerns only.

Controllers may:

- Read request parameters.
- Read request body data.
- Read query parameters.
- Read authenticated user context.
- Call the appropriate service.
- Map service results to HTTP responses.
- Pass errors to centralized error handling.

Controllers must not:

- Query the database directly.
- Import and call Mongoose models directly.
- Contain business rules.
- Call external APIs directly.
- Generate OTPs.
- Hash passwords.
- Process payments.
- Send emails.
- Call Redis directly.
- Perform complex calculations.
- Contain reusable business logic.

### Preferred Controller Pattern

```typescript
export const exampleController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await exampleService.execute(req.body);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
```

Controllers should remain thin.

---

# 5. Service / Application Layer

The service layer contains application use cases and business orchestration.

Services are responsible for:

- Business rules.
- Application workflows.
- Business-state transitions.
- Validating business conditions.
- Coordinating repositories.
- Coordinating integrations.
- Enforcing domain invariants.
- Orchestrating multi-step operations.

Example:

```text
OnboardingService
    ↓
UserRepository
    ↓
User Database

OnboardingService
    ↓
OtpService
    ↓
OtpRepository
    ↓
Redis

OnboardingService
    ↓
EmailService
    ↓
Brevo Adapter
```

Services must not:

- Depend on Express `Request`.
- Depend on Express `Response`.
- Return Express responses.
- Contain route definitions.
- Directly call Mongoose models where a repository abstraction exists.
- Directly call third-party SDKs where an integration abstraction exists.

Services should be testable without starting an Express server.

---

# 6. Domain and Business Rules

Business rules must live in the service/domain layer.

Examples include:

- Whether an email can request another OTP.
- Whether an OTP is expired.
- Whether an OTP has exceeded its maximum attempts.
- Whether an email already belongs to an account.
- Whether an organization can perform a specific action.
- Whether a campaign can accept donations.
- Whether campaign funds may be withdrawn.
- Whether an organization is verified.
- Whether a user is permitted to perform an operation.
- Whether an order can transition to a new status.

Business rules must not be hidden inside:

- Controllers.
- Routes.
- Mongoose schemas.
- Database queries.
- UI code.
- External provider adapters.

Database-level constraints may be used for data integrity, but business decisions must remain explicit in the service/domain layer.

---

# 7. Repository / Data Access Layer

Repositories encapsulate persistence and data access.

Repositories may:

- Query MongoDB.
- Use Mongoose models.
- Create records.
- Update records.
- Delete records.
- Find records.
- Handle persistence-specific concerns.
- Handle database transactions where required.

Example:

```typescript
const user = await userRepository.findByEmail(email);
```

The service should not need to know whether data came from:

- MongoDB.
- Mongoose.
- A cache.
- A test database.
- A future storage implementation.

Repositories must not:

- Contain business rules.
- Decide whether an operation is allowed.
- Send emails.
- Process payments.
- Call unrelated external APIs.
- Return Express responses.
- Know about HTTP.

---

# 8. Database Models

Mongoose models define persistence structure and database-specific behavior.

Models are responsible for:

- Schema definitions.
- Field types.
- Indexes.
- Database-level validation.
- Persistence-related configuration.
- Appropriate database-level constraints.

Models must not become a dumping ground for application business logic.

Complex business workflows belong in services.

---

# 9. External Integrations

All third-party providers must be isolated behind integration boundaries.

Examples:

```text
src/integrations/
├── brevo/
├── paystack/
├── redis/
├── cloudinary/
├── termii/
└── sentry/
```

Business logic should not directly depend on vendor SDKs where practical.

Preferred pattern:

```text
Application Service
    ↓
Internal Interface / Capability
    ↓
Provider Adapter
    ↓
External API
```

Example:

```typescript
interface EmailService {
  sendOtp(input: SendOtpInput): Promise<void>;
}
```

The onboarding service should depend on the capability:

```text
Send an OTP email
```

It should not need to know:

```text
This is Brevo.
This is the Brevo SDK.
This is the Brevo API request format.
```

This allows providers to be replaced without rewriting business logic.

---

# 10. Configuration and Environment Variables

Configuration must be centralized.

Application code should not repeatedly access `process.env` throughout the codebase.

Prefer:

```text
config/env.ts
```

The configuration layer should:

- Load environment variables.
- Validate required configuration.
- Apply safe defaults only where appropriate.
- Expose typed configuration to the application.

Secrets must never be hardcoded.

Examples of configuration:

- `NODE_ENV`
- `PORT`
- `API_VERSION`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`
- `PAYSTACK_SECRET_KEY`
- `CLOUDINARY_*`
- `TERMII_*`
- `SENTRY_DSN`

The application should fail fast when required configuration is missing.

---

# 11. Validation

All external input must be validated at the application boundary.

Never trust:

- `req.body`
- `req.params`
- `req.query`
- Headers
- Third-party webhook payloads

Preferred flow:

```text
Request
    ↓
Validation Schema
    ↓
Validated Input
    ↓
Controller
    ↓
Service
```

Validation should cover:

- Required fields.
- Data types.
- String lengths.
- Formats.
- Allowed enum values.
- Input constraints.

Validation should not replace business rules.

For example:

```text
Validation:
"email must be a valid email address"

Business Rule:
"this verified email cannot create another account"
```

These are different responsibilities.

---

# 12. TypeScript Rules

The backend is TypeScript-first.

Avoid `any`.

Do not use `any` to silence a type error.

Instead:

- Define an appropriate type.
- Use `unknown` when the type is genuinely unknown.
- Narrow types safely.
- Create interfaces or type aliases where appropriate.

Use strongly typed domain values.

Examples:

```text
AccountType
UserRole
UserStatus
OrganizationType
VerificationStatus
OtpPurpose
```

Types should communicate domain intent.

Avoid unnecessary duplication of types across files.

---

# 13. Enums and Domain Constants

Use enums or equivalent strongly typed constants for fixed domain values.

Examples:

```text
AccountType
UserRole
UserStatus
OrganizationType
VerificationStatus
OtpPurpose
OrderStatus
PaymentStatus
CampaignStatus
```

Rules:

- Do not scatter magic strings throughout the codebase.
- Do not duplicate the same domain value in multiple unrelated files.
- Keep domain vocabulary centralized.
- Use values that match the API and database contract intentionally.

---

# 14. Error Handling

The backend must use centralized error handling.

Application errors should be represented consistently.

Errors should contain, where appropriate:

- Stable error code.
- Human-readable message.
- HTTP status code.
- Optional structured details.

Example:

```json
{
  "success": false,
  "error": {
    "code": "OTP_EXPIRED",
    "message": "The OTP has expired."
  }
}
```

Do not:

- Return random error formats from individual controllers.
- Expose stack traces in production.
- Leak sensitive provider or database details.
- Use generic errors when a meaningful application error is appropriate.

Unexpected errors must be handled by the global error middleware.

---

# 15. API Response Contract

API responses must follow a consistent structure.

Successful response:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

Collection response:

```json
{
  "success": true,
  "data": [],
  "meta": {}
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message.",
    "details": []
  }
}
```

The response format must remain consistent across API modules.

---

# 16. Authentication and Authorization

Authentication and authorization are different concerns.

Authentication answers:

```text
Who is this user?
```

Authorization answers:

```text
Is this user allowed to perform this action?
```

Do not treat authentication as authorization.

Middleware may:

- Verify access tokens.
- Establish authenticated identity.
- Attach authenticated user context to the request.

Services must still enforce important business rules.

Authorization must consider:

- User identity.
- User role.
- Organization verification status.
- Resource ownership.
- Resource state.
- Business-specific permissions.

---

# 17. Security

Security is mandatory.

Never:

- Store plaintext passwords.
- Store plaintext OTPs where hashing is appropriate.
- Log passwords.
- Log OTPs.
- Log access tokens.
- Log refresh tokens.
- Expose secrets in API responses.
- Commit secrets to source control.
- Trust client-provided authorization claims without verification.

Sensitive values must be handled securely.

External webhook signatures must be verified.

Security-sensitive operations must be designed to prevent:

- Replay attacks.
- Brute-force attempts.
- OTP abuse.
- Duplicate processing.
- Unauthorized access.

---

# 18. OTP Rules

OTP functionality must:

- Use cryptographically secure random generation.
- Have a defined expiration time.
- Have a maximum verification-attempt limit.
- Support rate limiting.
- Prevent unlimited resend abuse.
- Avoid storing plaintext OTPs where possible.
- Support purpose-specific OTPs.
- Prevent replay after successful verification.

OTP purposes should be explicit.

Examples:

```text
EMAIL_VERIFICATION
PASSWORD_RESET
PHONE_VERIFICATION
```

OTP storage should use an appropriate temporary storage abstraction.

---

# 19. Authentication Token Rules

Authentication tokens must:

- Be generated securely.
- Have defined expiration policies.
- Be validated before use.
- Avoid exposing secrets.
- Support refresh-token security requirements.

Refresh-token handling must account for:

- Revocation.
- Expiration.
- Token rotation where required.
- Logout/invalidation.
- Compromise scenarios.

---

# 20. Cheepfud Restricted Funds Rule

This is a critical business invariant.

Campaign donations are restricted funds.

Campaign funds:

- Must be used for food-related procurement and distribution.
- Must not be withdrawn as unrestricted cash by organizations.
- Must not be treated as ordinary organization wallet balances.
- Must maintain an auditable trail.

The business flow is:

```text
Donation
    ↓
Restricted Fund
    ↓
Procurement Order
    ↓
Seller Fulfillment
    ↓
Delivery
    ↓
Seller Release
    ↓
Food Distribution
```

The following invariants must never be violated:

```text
isRestricted === true
canWithdrawCash === false
```

These rules must be enforced in the service/domain layer and protected from accidental mutation.

Any future feature involving:

- Donations
- Campaigns
- Procurement
- Organization balances
- Payments
- Refunds

must be reviewed against this rule.

---

# 21. External API Reliability

External integrations must account for failure.

Services interacting with external providers should consider:

- Timeouts.
- Provider failures.
- Retry strategy where appropriate.
- Idempotency.
- Duplicate requests.
- Partial failures.
- Logging without exposing secrets.

Payment and webhook operations must be idempotent.

A retried request must not accidentally:

- Create duplicate payments.
- Send duplicate business-critical notifications.
- Create duplicate orders.
- Process the same webhook twice.

---

# 22. Logging and Observability

Logs must be useful and safe.

Log:

- Important application events.
- Errors.
- Integration failures.
- Authentication events where appropriate.
- Important state transitions.

Do not log:

- Passwords.
- OTPs.
- Access tokens.
- Refresh tokens.
- API keys.
- Sensitive personal data unnecessarily.

Use the existing logger instead of scattered production `console.log` statements.

Errors should contain enough context to diagnose failures without exposing secrets.

---

# 23. API Documentation

Every public API endpoint must be documented.

Documentation should include:

- HTTP method.
- URL.
- Description.
- Authentication requirements.
- Request body.
- Query parameters.
- Path parameters.
- Success response.
- Error responses.
- Validation rules.
- Relevant business rules.

Scalar/OpenAPI is the preferred API documentation interface.

Documentation must remain aligned with the actual implementation.

Documentation should be updated as part of endpoint development, not as an afterthought.

---

# 24. Testing

Every endpoint should be tested.

At minimum, tests should cover:

## Happy Path

The operation succeeds with valid input.

## Validation Failure

Invalid input is rejected correctly.

## Authentication

Unauthenticated requests are rejected where required.

## Authorization

Unauthorized users cannot perform restricted actions.

## Business Rules

Important domain rules are enforced.

## Edge Cases

Examples include:

- Duplicate requests.
- Expired OTPs.
- Invalid states.
- Missing records.
- Provider failures.
- Repeated requests.
- Concurrent requests where relevant.

Tests should test behavior, not implementation details unnecessarily.

---

# 25. API Endpoint Development Standard

A new endpoint should generally follow this sequence:

```text
1. Understand the use case.
2. Identify required domain types/enums.
3. Define validation schema.
4. Identify required repository operations.
5. Identify required integration capabilities.
6. Implement service/business logic.
7. Implement controller.
8. Register route.
9. Add middleware.
10. Add tests.
11. Add API documentation.
12. Test manually with Postman or equivalent.
13. Review the complete request flow.
```

Do not start by putting all logic inside a controller and planning to refactor later.

---

# 26. File and Module Responsibilities

Each file should have a clear responsibility.

Avoid giant files that contain:

- Routes.
- Controllers.
- Business logic.
- Database queries.
- External API calls.
- Validation.
- Types.

all together.

Prefer small, focused modules.

A module should have a clear reason to change.

---

# 27. Naming Conventions

Use clear and consistent names.

Prefer names that communicate responsibility.

Examples:

```text
user.repository.ts
onboarding.service.ts
onboarding.controller.ts
onboarding.routes.ts
onboarding.schema.ts
brevo.client.ts
brevo.email.adapter.ts
otp.service.ts
otp.repository.ts
```

Avoid vague names such as:

```text
helper.ts
misc.ts
stuff.ts
common2.ts
```

unless the file has a clearly defined and genuinely shared responsibility.

---

# 28. Dependency and Package Rules

Do not introduce a new dependency without a clear reason.

Before adding a package:

1. Check whether the project already has an equivalent capability.
2. Check whether the requirement can be solved with existing dependencies.
3. Consider maintenance and security.
4. Consider bundle/runtime impact.
5. Consider whether the dependency is necessary for the MVP.

Do not add packages merely for convenience.

---

# 29. Database and Persistence Rules

Database access must be isolated.

Rules:

- Controllers must not access models.
- Services should use repositories where repository abstraction exists.
- Database queries should not contain hidden business decisions.
- Indexes should be created intentionally.
- Unique constraints should be used where data integrity requires them.
- Data mutations should be explicit.
- Multi-document operations requiring atomicity should use appropriate transaction strategies.
- Sensitive fields should not be returned unnecessarily.

---

# 30. API Design Rules

API endpoints should:

- Use clear resource-oriented naming.
- Use appropriate HTTP methods.
- Use consistent status codes.
- Return predictable response structures.
- Validate inputs.
- Return stable error codes.
- Document authentication requirements.

Avoid:

- Inconsistent naming.
- Random response shapes.
- Exposing internal database structures unnecessarily.
- Returning sensitive internal fields.

---

# 31. Idempotency and Duplicate Processing

Operations that may be retried must be designed for safe repetition.

This is especially important for:

- Payments.
- Payment webhooks.
- Donations.
- Orders.
- Procurement.
- Notifications.
- OTP operations.

The system must consider:

```text
What happens if this request is sent twice?
```

before implementing the operation.

---

# 32. AI and Codex Development Rules

Before generating or modifying code, an AI coding assistant must:

1. Inspect the existing project structure.
2. Inspect relevant existing files.
3. Understand existing conventions.
4. Check whether the requested capability already exists.
5. Avoid creating duplicate utilities.
6. Avoid bypassing architectural layers.
7. Avoid placing business logic in controllers.
8. Avoid accessing database models directly from controllers.
9. Avoid directly calling external providers from business logic where an abstraction exists.
10. Reuse existing types, utilities, and services where appropriate.
11. Avoid introducing dependencies without justification.
12. Preserve existing functionality unless a change is intentional.
13. Consider security implications.
14. Consider validation.
15. Consider error handling.
16. Consider testing.
17. Consider API documentation.
18. Consider backward compatibility where applicable.
19. Consider the effect on existing frontend consumers.
20. Check relevant Cheepfud business invariants before changing related logic.

When generating code, the AI should be able to explain:

- Which layer the code belongs to.
- Why the code belongs there.
- What dependencies it introduces.
- What business rules it enforces.
- What tests are needed.
- What documentation must be updated.

The AI must not silently bypass these rules for convenience.

---

# 33. AI Task Execution Protocol

For non-trivial backend tasks, the AI should work in this order:

```text
1. Understand the task.
2. Inspect relevant files.
3. Identify affected layers.
4. Identify existing reusable code.
5. Identify business rules.
6. Identify security concerns.
7. Identify data access requirements.
8. Identify integration requirements.
9. Propose the implementation plan.
10. Implement in the correct layer.
11. Update types and validation.
12. Update tests.
13. Update API documentation.
14. Review for architectural violations.
15. Report what changed and what remains.
```

The AI should not make unrelated refactors while implementing a focused task unless explicitly requested.

---

# 34. Definition of Done

A backend task is not complete merely because the code compiles.

A task is complete when appropriate:

- Code has been implemented.
- Architecture rules are followed.
- Types are correct.
- Input is validated.
- Errors are handled.
- Security considerations are addressed.
- Business rules are enforced.
- Tests are added or updated.
- API documentation is updated.
- Manual API testing is performed where applicable.
- No unnecessary duplication has been introduced.
- Existing functionality has not been accidentally broken.
- The implementation is consistent with Cheepfud business rules.

---

# 35. Final Principle

Prefer:

```text
Clear code
over clever code.

Explicit rules
over hidden behavior.

Small focused modules
over giant files.

Testable services
over tightly coupled logic.

Stable abstractions
over vendor-specific business logic.

Correct architecture
over fast architectural debt.

Deliberate changes
over accidental complexity.
```

The goal is to build a backend that can evolve with Cheepfud without making every future feature harder to implement.

---

## End of Backend Engineering Rules
