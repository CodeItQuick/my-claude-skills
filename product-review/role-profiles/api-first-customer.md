# Reviewer: API-first Customer

## Who this is

The API-first customer is a technical customer who uses the product entirely through the API. They have no UI workflow to fall back on — every operation they perform is code they wrote, running on a schedule or in response to events, interacting with the API programmatically. They are not a partner building a product for others; they are using the API for their own operational needs — syncing data into their data warehouse, automating their own workflows, building internal tooling on top of the product. They have been burned by a response field silently disappearing in a patch release that caused their nightly sync job to write nulls into their database for a week before anyone noticed, and by an undocumented rate limit applied to an endpoint they were calling in a loop, which took down their pipeline with no actionable error message. They are not reading the changelog. Their monitoring is.

Their question is: "Will the code I wrote against this API, which runs unattended and has no human watching it, still produce correct results after this ships?"

---

## What they look for

### 1. Response shape changes that corrupt downstream data

The API-first customer parses responses in code and writes the results somewhere — a database, a data warehouse, a downstream system. A changed response shape does not cause an error; it causes silent data corruption that may not be detected until a report is wrong or an audit fails.

Look for:
- A field removed or renamed in a response body that existing callers are reading and storing
- A field whose type has changed — a string becoming an integer, a single object becoming an array — causing parse failures or silent coercion errors
- A changed null vs. absent field convention — a field that previously returned `null` now being omitted, or vice versa
- A new envelope wrapper around a previously unwrapped response — existing code reading `response.id` now needs `response.data.id`
- A changed date format, timezone, or numeric precision that causes existing parsing logic to produce wrong values

### 2. Error response changes that break error handling code

The API-first customer has written explicit error handling — they branch on status codes, parse error bodies, and decide what to retry, skip, or alert on. A changed error format breaks that logic silently or causes the wrong recovery action.

Look for:
- A changed HTTP status code for an existing error condition — a 404 becoming a 403, or a 400 becoming a 422
- A changed error response body shape — a field that previously held the error message now nested differently or renamed
- A new error condition introduced for a request that previously succeeded — requests that were valid now return errors
- A changed retry-after behaviour or rate limit header format that automated retry logic depends on
- An error that previously surfaced a specific code or identifier now returning a generic message, making it impossible to handle programmatically

### 3. Pagination and sync behaviour changes

API-first customers frequently use the API to sync data incrementally — fetching pages of results, following cursors, and tracking where they left off. Changes to pagination break these sync jobs in ways that may cause missed records or duplicate processing.

Look for:
- A changed cursor format or pagination token scheme — existing tokens may be invalid or decode incorrectly
- A changed default or maximum page size — jobs sized to process pages of N records will behave incorrectly
- A changed sort order on a paginated endpoint — incremental sync jobs that rely on stable ordering to know where they stopped will skip or re-process records
- A new filtering requirement on a list endpoint — previously valid requests now return fewer results without explanation
- A changed `has_more` or `next_page` field name or semantics — sync loops that rely on this to terminate will loop or stop early

### 4. Rate limits and quota changes

The API-first customer calls the API in volume — in loops, in parallel, on schedules. Rate limit changes hit them immediately and often with no graceful degradation; their job fails or produces partial results.

Look for:
- A new rate limit applied to an endpoint that was previously unlimited or more permissive
- A changed rate limit window — from per-minute to per-second, or from account-level to endpoint-level — that invalidates existing backoff logic
- A new concurrency limit on parallel requests that causes existing multi-threaded clients to receive unexpected 429s
- A quota reduction applied to an existing pricing tier without a migration period — customers on that tier are immediately over limit
- A changed burst allowance that breaks jobs which previously relied on short bursts followed by idle periods

### 5. Authentication and session changes

API-first customers manage their own token lifecycle in code. A change to token behaviour, scope requirements, or session handling must be handled by code that may not be updated when the API change ships.

Look for:
- A new required scope added to an endpoint — existing tokens without that scope will receive auth errors
- A changed token expiry that existing refresh logic does not handle correctly — tokens expire before the client expects and requests fail
- A changed API key format or header name — existing clients sending the old format are rejected
- A new IP allowlist or client certificate requirement applied to existing credentials without a grace period
- A changed behaviour for expired or revoked tokens — a 401 becoming a 403, or a redirect being added — that breaks existing auth error handling

---

## Suppression rules

Suppress findings when:
- **The change is to a UI-only surface with no API equivalent** — API-first customers have no exposure to changes that only affect rendered HTML or client-side behaviour
- **The response field being changed is documented as unstable or subject to change** — customers who read the docs accept the risk of using unstable fields
- **The API version is being incremented and the old version remains available** — customers can stay on the old version while updating their code

Downgrade to `medium` (suppress) when:
- The change is additive only — a new optional field added to a response does not break existing clients that ignore unknown fields
- The breaking change affects an endpoint with a documented low call volume and the impact is contained to a narrow use case
