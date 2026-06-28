# Detection Patterns — Unnecessary Code Growth

Patterns where structurally present, reachable code serves no current requirement — branches for conditions that current inputs cannot satisfy, option slots always left at their default, exported extension points with zero callers, and support scaffolding for cases that do not exist. Unlike `remove-clutter`, which targets provably *unreachable* code (after a `return`, commented out, unused imports), this pass targets code that *can* run but never does given present requirements. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the unnecessary-code-growth suppression rules in `../shared/suppression-rules.md` before reporting.

## 1. Branch for a condition that current inputs cannot satisfy

```ts
function processOrder(order: Order) {
  if (order.currency === "USD") {
    return chargeUSD(order);
  } else if (order.currency === "EUR") {
    return chargeEUR(order);
  } else if (order.currency === "GBP") {
    return chargeGBP(order);
  } else {
    // "batch" mode — reserved for future multi-currency support
    return scheduleForBatch(order);
  }
}

// Order.currency is typed as "USD" | "EUR" | "GBP" — the else branch is dead at the type level
// but reachable via `as any` or future schema changes
```

A branch written for a case that no current input can reach adds cognitive load to every reader who must determine whether it is reachable, adds test surface that cannot be covered, and accumulates as dead support scaffolding. If the branch reflects a planned future requirement, it should not ship until that requirement exists.

## 2. Option object property that is always set to the same value

```ts
interface RenderOptions {
  theme: "light" | "dark";
  locale: string;
  compact: boolean;
  experimental_animations: boolean;
}

// Every call site:
render(template, { theme: "light", locale: "en", compact: false, experimental_animations: false });
render(template, { theme: "light", locale: "en", compact: false, experimental_animations: false });
render(template, { theme: "light", locale: "en", compact: false, experimental_animations: false });
```

A property in an options object that is always passed the same value across all visible call sites provides no configurability in practice. The field adds surface area to the type, forces every caller to state a value, and accumulates as requirements that exist on paper but are never exercised.

## 3. Exported function or method with zero internal callers and no external consumers visible

```ts
export function buildBatchPayload(orders: Order[]): BatchPayload {
  return {
    version: "2.0",
    orders: orders.map(serializeOrder),
    checksum: computeChecksum(orders),
  };
}

// buildBatchPayload is exported but never imported anywhere in the codebase
// No test references it; no external consumer is documented
```

An exported function that is never called inside the codebase and has no documented external consumer is dead API surface. It is maintained, typed, and tested (or should be) for a use case that does not exist. If the function was part of a feature that was not completed, it should be removed with the rest of the incomplete feature rather than left as dormant scaffolding.

## 4. Error handler or fallback for an error that cannot occur

```ts
function divide(a: number, b: number): number {
  if (b === 0) throw new DivisionByZeroError();
  const result = a / b;
  if (!Number.isFinite(result)) {
    // This cannot happen — b is guaranteed non-zero at this point
    throw new UnexpectedInfinityError(a, b);
  }
  return result;
}

async function fetchConfig(): Promise<Config> {
  const raw = await fs.readFile("./config.json", "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed) {
    // JSON.parse never returns null/undefined for valid JSON; this branch cannot execute
    throw new EmptyConfigError();
  }
  return parsed;
}
```

A defensive check written to guard against a condition that the type system, the logic above, or the semantics of the operation make impossible adds false documentation (implying the condition is possible), adds test burden, and adds reading noise. The check signals that the author was not certain, which may mislead future maintainers into adding more speculative guards.

## 5. Parameterised function where the parameter is always a constant

```ts
const PAGE_SIZE = computePageSize(process.env.MAX_ITEMS, "paginated");

function computePageSize(envValue: string | undefined, mode: "paginated" | "infinite" | "windowed"): number {
  if (mode === "paginated") return parseInt(envValue ?? "20");
  if (mode === "infinite") return Infinity;
  if (mode === "windowed") return 50;
  throw new Error("unknown mode");
}

// mode is always "paginated" across every call site — "infinite" and "windowed" branches never run
```

A parameter whose value is always the same literal at every call site provides no runtime variation. The branches for other values add complexity that is never exercised. If the function is not exported for external use, the parameter and its associated branches are unnecessary growth.

---

## Evidence required

Gather **at least two** before reporting:

1. **Presence evidence** — code is structurally present and syntactically reachable: a branch, an option property, an exported function, an error handler.
2. **Never-exercised evidence** — the code cannot be reached given current inputs: the type system makes the branch condition structurally impossible, the option is always its default, the export has no internal callers and no documented external consumers, the error condition cannot occur after the preceding guard.
3. **Requirement absence evidence** — no ticket, comment, or PR description identifies a current or imminent requirement the code serves; it appears to have been added for a case that does not yet exist.
4. **Maintenance cost evidence** — the unused code is not free: it adds cognitive load to every reader, creates test surface that cannot be covered, and will accumulate alongside future changes as dead scaffolding.

---

## Patterns to **not** flag

- **Defensive guards against technically-possible programmer errors** — `if (!array) throw` at the entry to a public API function is correct defensive programming even if the type system says the value is non-nullable. Public API callers may not use TypeScript.
- **Branches required by a protocol or standard** — an HTTP handler with a `501 Not Implemented` default case, a codec with a reserved-byte handler, a state machine with an `UNKNOWN` transition. The branch exists to comply with a specification, not to serve a current caller.
- **Feature flags or environment-based branches** — a `process.env.FEATURE_X === "true"` branch that is currently `false` in all environments is not unnecessary growth if the flag is expected to be enabled when the feature ships.
- **Future requirement explicitly tracked** — if the branch or option is accompanied by a ticket reference and a stated condition for enablement, the growth is intentional and tracked.
- **Exported from a library or shared package** — a zero-caller export may have consumers in other packages outside the visible codebase.
- **Test infrastructure and fixtures** — helper functions, factories, and fixtures in test files may be used by tests that are not yet written; suppress unless the test file itself is abandoned.

---

## Comment examples

**Good:**

> **Suggested:** `order.currency` is typed as `"USD" | "EUR" | "GBP"`, but the `else` branch at line 44 calls `scheduleForBatch` for a case the type system says cannot occur. TypeScript would flag this branch as unreachable. Could it be removed, or is it anticipating a future currency type that should be added to the union first?

> **Suggested:** `options.experimental_animations` is passed as `false` at every call site in the codebase. The branch at line 18 for `experimental_animations: true` has never run. Could the property be removed until the feature is ready, or is there a ticket tracking when it will be enabled?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Branch the type system makes structurally unreachable | Assert: "The `else` branch at line N is unreachable — `currency` is typed as `'USD' \| 'EUR' \| 'GBP'` and all three are handled above." |
| Option property always the same value across all call sites | Ask: "Is `experimental_animations` ever set to `true` anywhere? If not, could the property and its branch be removed until the feature ships?" |
| Exported function with zero internal callers | Ask: "Is `buildBatchPayload` used anywhere outside this codebase? It has no internal callers — if it's not part of a public API, could it be removed?" |
| Error handler for an impossible condition after a proven guard | Ask: "Can `result` be non-finite here? `b` is checked for zero on line N — if the check covers all infinite cases, could this handler be removed?" |