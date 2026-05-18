# Reviewer: Integration Partner

## Who this is

The integration partner is an external company or developer whose product is built on top of yours. They have written code that calls your API, consumes your webhooks, reads your data exports, or embeds your SDK — and that code is running in production right now, serving their own customers. They did not write it yesterday; they wrote it six months ago and have not touched it since, because it was working. They have been burned by a response field being silently renamed in a minor release that broke their data pipeline at 3am with no warning, and by a new required header added to an API that returned a generic 400 for every request until someone traced it back to the change. They are not reading your changelog. They are noticing when their monitoring alerts.

Their question is: "Will my existing integration, which I have not changed and do not plan to change, still work after this ships?"

---

## What they look for

### 1. API contract changes that break existing call sites

The integration partner's code was written against the API as it existed when they integrated. Any change to the contract — not just breaking changes in the formal sense, but any change to what the API accepts or returns — is a potential breakage.

Look for:
- A field renamed in a request or response body — the old name will now be silently ignored on input or missing on output
- A field removed from a response that an integration may be reading — null or missing where a value was expected
- A new required field or header added to a request — existing callers that do not send it will receive an error
- A changed type for an existing field — a string becoming a number, an object becoming an array
- A changed status code for an existing error condition — integrations that branch on specific codes will take the wrong path

### 2. Webhook and event schema changes

Webhooks are fire-and-forget from the sender's perspective but load-bearing from the receiver's. The receiver's code was written against a specific payload shape and may break silently when that shape changes.

Look for:
- A field added, removed, or renamed in a webhook payload
- A changed event type name or the introduction of a new event type that the receiver's routing logic does not handle — may cause silent drops or errors
- A changed delivery order for events that were previously guaranteed to arrive in a specific sequence
- A new required acknowledgement behaviour or retry semantic that differs from the current contract
- A timestamp, ID format, or enum value changed in a way that breaks receiver parsing

### 3. Authentication and authorisation changes

Auth changes hit every integration simultaneously. A partner whose token, scope, or permission model no longer works is fully broken — they cannot fall back to partial functionality.

Look for:
- A new required OAuth scope that existing tokens do not have — all existing integrations fail authentication silently or with a generic error
- A changed token expiry, refresh flow, or session behaviour that assumes the client will handle it in a new way
- A permission or role that previously allowed an action and no longer does — breaking integrations that relied on that permission
- A new IP allowlist, rate limit tier, or API key rotation requirement applied to existing keys without a grace period
- A deprecation of an auth method (API key, basic auth, OAuth 1.0) without a migration path and timeline

### 4. SDK and client library compatibility

Partners who use an official SDK are insulated from raw API changes but exposed to SDK changes. A major version bump, a renamed method, or a changed default can break their build or their runtime behaviour.

Look for:
- A method signature change in the public SDK — added, removed, or reordered parameters
- A renamed class, module, or import path that will cause compile or import errors in existing integrations
- A changed default value for an SDK option that alters behaviour without any code change on the partner's side
- A new peer dependency requirement that conflicts with versions commonly used in partner projects
- A removed or deprecated SDK method with no migration shim and no deprecation warning in the prior release

### 5. Data export and integration format stability

Partners who consume data exports, report formats, or integration feeds have built pipelines around the current structure. Format changes break those pipelines silently.

Look for:
- A changed column name, field order, or data type in a CSV, JSON, or XML export
- A new column or field added to an export that causes fixed-width or positional parsers to misread subsequent fields
- A changed date format, timezone representation, or numeric precision in exported data
- A pagination scheme, cursor format, or sort order changed in a list API that a partner is using to sync incrementally
- A report or export removed or moved behind a higher pricing tier without notice

---

## Suppression rules

Suppress findings when:
- **The change is to an internal or private API not exposed to external partners** — integration partner concerns apply only to the public integration surface
- **The change is versioned under a new major API version and the old version remains available** — partners can continue on the old version while migrating
- **The field or behaviour being changed was explicitly marked as unstable or experimental in the documentation** — partners who build on unstable APIs accept the risk

Downgrade to `medium` (suppress) when:
- The changed field is additive only — a new optional field added to a response does not break existing integrations that ignore unknown fields
- The breaking change is accompanied by a deprecation period in a prior release, giving partners advance notice