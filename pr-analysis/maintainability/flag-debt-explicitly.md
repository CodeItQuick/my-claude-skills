# Detection Patterns — Flag Debt Explicitly

Patterns where technical debt is introduced or left in place without being made trackable — TODO and FIXME markers with no owner or resolution condition, temporary workarounds with no ticket, and disabled tests with no explanation. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the flag-debt-explicitly suppression rules in `../shared/suppression-rules.md` before reporting.

## 1. TODO with no ticket reference or stated resolution condition

```ts
// TODO: fix this
const result = expensiveOperation();

// TODO: make this configurable
const TIMEOUT_MS = 5000;

// TODO: handle error case
await db.save(record);
```

A TODO without a ticket number, an owner, or a clear condition under which it can be resolved is invisible to project tracking. It will remain in the codebase indefinitely because there is no mechanism to resurface it. The concern is not the debt itself but the lack of tracking.

## 2. FIXME or HACK with no explanation of the workaround

```ts
// FIXME: broken
function parseDate(raw: string) {
  return new Date(raw + "T00:00:00Z");   // FIXME: timezone
}

// HACK
const user = await getUser(id) ?? { id, name: "Unknown" };
```

`FIXME` and `HACK` signal known problems but without context — what is broken, why the workaround exists, what the correct fix would be, and when it becomes safe to make. A future maintainer encountering the code has no way to know whether the workaround is still necessary.

## 3. Disabled test with no explanation

```ts
it.skip("processes refunds correctly", async () => { ... });

xit("handles concurrent writes", () => { ... });

describe.skip("payment integration", () => { ... });
```

A skipped test is not running and is not protecting the code it was written to test. Without a comment explaining why it was disabled and what condition would re-enable it, it will remain skipped indefinitely. A ticket reference or a condition ("re-enable after PROJ-123 is merged") makes the debt trackable.

## 4. Hardcoded value marked as temporary

```ts
const API_KEY = "sk-prod-abc123";   // TODO: move to env

const BASE_URL = "https://api.example.com/v1";   // FIXME: should come from config

const RETRY_COUNT = 3;   // temp - should be configurable per environment
```

The author has already identified that the value should not be hardcoded. The debt is acknowledged but not tracked. Without a ticket, these hardcoded values become permanent despite the expressed intent to change them.

## 5. Commented-out code with no explanation of why it is preserved

```ts
// function processLegacyOrder(order: LegacyOrder) {
//   const mapped = mapLegacyFields(order);
//   return processOrder(mapped);
// }

const result = newProcessor(data);
// const result = oldProcessor(data);
```

Commented-out code that is not preceded by an explanation ("kept for reference until PROJ-456 is verified in production") is debt with no resolution path. It signals uncertainty about whether the deleted code is safe to remove, but that uncertainty is not tracked anywhere.

## 6. `@ts-ignore` or `@ts-expect-error` with no explanation

```ts
// @ts-ignore
const value = legacyModule.getData();

// @ts-expect-error
container.register(ServiceImpl);
```

Type suppression directives silence the compiler without explaining what error is being suppressed or why suppression is the right solution. A comment explaining the underlying type system limitation or the library version that causes the error makes the suppression reviewable and removable when the root cause is resolved.

---

## Evidence required

Gather **at least two** before reporting:

1. **Marker evidence** — a `TODO`, `FIXME`, `HACK`, `XXX`, `@ts-ignore`, `@ts-expect-error`, `it.skip`, `xit`, or hardcoded value with an inline comment marking it as temporary is present in the diff.
2. **Missing resolution path evidence** — the marker has no ticket number, no owner, and no stated condition under which the debt can be resolved.
3. **Trackability evidence** — the debt cannot be surfaced by a project management system because it is not linked to any tracked work item.
4. **Permanence risk evidence** — without a resolution path, the debt is structurally indistinguishable from debt that is intended to remain indefinitely.

---

## Patterns to **not** flag

- **TODO with a ticket number and clear ownership** — `// TODO(PROJ-123): remove after migration is complete`. The debt is tracked.
- **FIXME that explains the issue and the fix** — `// FIXME: relies on Node.js 18 behavior; update when we drop Node.js 16 support`. The condition for removal is stated.
- **Skipped test with an explanation and a linked issue** — `it.skip("flaky on CI — tracked in PROJ-456")`. The debt is explicit and trackable.
- **`@ts-ignore` with a comment citing the library bug or version** — suppression with an explanation is acceptable when the type system limitation is documented.
- **In-progress branches or draft PRs** — TODOs in a WIP commit that will be resolved before merge are ephemeral work-in-progress, not permanent debt.

---

## Comment examples

**Good:**

> **Suggested:** `// TODO: fix this` at line 18 has no ticket reference or resolution condition. It will remain indefinitely with no mechanism to resurface it. Could we add a ticket number or a stated condition (`// TODO(PROJ-123): remove after migration completes`)?

> **Suggested:** `it.skip("handles concurrent writes")` at line 44 has no explanation of why it is disabled. A future contributor has no way to know whether it is safe to re-enable. Could we add a reason and a ticket reference so the skip is trackable?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| TODO with no ticket or condition | Ask: "Could we add a ticket reference or a stated condition so this is traceable?" |
| FIXME with no explanation | Ask: "What is the workaround working around? A one-line explanation would let a future maintainer know when it's safe to remove." |
| Skipped test with no reason | Ask: "Why is this test skipped? A brief comment or ticket would make the skip intentional rather than mysterious." |
| `@ts-ignore` with no comment | Ask: "What error is being suppressed here? A comment citing the root cause would make this reviewable when the library updates." |