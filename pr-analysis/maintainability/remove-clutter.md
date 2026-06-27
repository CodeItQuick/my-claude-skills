s# Detection Patterns — Remove Clutter

Patterns where code or comments add noise without adding information — dead code, commented-out blocks, unused declarations, and comments that restate what the code already clearly says. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the remove-clutter suppression rules in `../shared/suppression-rules.md` before reporting.

## 1. Dead code after an unconditional `return`, `throw`, or `continue`

```ts
function process(item: Item): Result {
  if (!item.active) {
    return { skipped: true };
    item.lastChecked = Date.now();   // never reached
  }

  throw new Error("unhandled");
  cleanup();                         // never reached
}
```

Any statement after an unconditional `return`, `throw`, `break`, or `continue` in the same block cannot execute. It will never run, never be tested, and never be maintained — it is noise that misleads readers into thinking it participates in the logic.

## 2. Commented-out code block

```ts
// const result = legacyProcess(data);
// if (result.error) throw new ProcessError(result.error);

const result = newProcess(data);
```

Commented-out code is not being executed and not being maintained. It creates a false suggestion that there is an alternative implementation, forces readers to determine whether it is an abandoned experiment or a preserved fallback, and accumulates until no one knows why it was kept. Delete it; version control preserves it.

## 3. Unused variable or import

```ts
import { formatDate, parseDate, isWeekend } from "./utils";
//              formatDate and isWeekend are never used

function buildReport(orders: Order[]) {
  const startTime = Date.now();   // assigned but never read
  const filtered = orders.filter(o => o.complete);
  return filtered;
}
```

An imported name or declared variable that is never referenced contributes nothing. If present after a refactor, it is leftover noise; if present in new code, it signals incomplete implementation.

## 4. Comment that restates what the code already clearly says

```ts
// increment i
i++;

// return the user
return user;

// check if the list is empty
if (items.length === 0) { ... }

/**
 * Gets the user by ID.
 * @param id The user ID.
 * @returns The user.
 */
async function getUserById(id: string): Promise<User> { ... }
```

A comment whose entire content is already communicated by the code it accompanies adds reading overhead without adding knowledge. The reader must read both the comment and the code; if they are identical, the comment is pure noise.

## 5. Empty block that adds no logic

```ts
if (condition) {
  doWork();
} else {
  // nothing to do
}

try {
  await operation();
} catch (e) {
  // handled elsewhere
}

function onDestroy() {}
```

An empty `else`, an empty `catch`, or an empty function body with a comment that the case is not handled here provides no information beyond what an absent branch would. It forces a reader to confirm there is nothing there. An absent branch is clearer than an explicitly empty one with no documentation.

## 6. Duplicate comment — same information stated twice in the same block

```ts
// Calculate the discount rate based on membership tier
// Determine discount based on user tier
const rate = TIER_RATES[user.tier];

/**
 * Processes the order.
 * This function processes the order.
 */
function processOrder(order: Order) { ... }
```

Two adjacent comments saying the same thing in different words. One will be updated when the code changes; the other will drift. The duplicate comment creates maintenance burden and eventual inconsistency without providing additional information.

---

## Evidence required

Gather **at least two** before reporting:

1. **Unreachability evidence** — a statement, block, or declaration is provably never executed or never referenced: after an unconditional `return`/`throw`, an unused import or variable, or a branch that is structurally impossible.
2. **No-information evidence** — a comment, empty block, or duplicate declaration adds no information that the code does not already express: a comment restating the operation, an empty `else` with a placeholder comment, or a duplicate adjacent comment.
3. **Maintenance burden evidence** — the clutter is not neutral: it creates a false impression of active alternatives (commented-out code), forces readers to confirm nothing is there (empty blocks), or will drift out of sync with the code it describes (restatement comments).
4. **No suppression applies** — the clutter is not a framework requirement, an intentional no-op, a type-only import, or a tracked placeholder.

---

## Patterns to **not** flag

- **Intentional no-op with documentation** — an empty `catch` or empty method body with a comment explaining why doing nothing is the correct behavior (`// intentional no-op — error is non-fatal and logged by the middleware`).
- **Placeholder methods required by an interface** — an interface or abstract class may require methods that a specific implementation intentionally does nothing with.
- **Type-only imports** — `import type { Foo }` used only in a type position may appear unused to a non-TypeScript-aware analysis.
- **`_` prefixed parameters** — a function parameter prefixed with `_` (`_event`, `_ctx`) explicitly signals intentional non-use.
- **Commented-out code with an adjacent TODO referencing a ticket** — preserved intentionally pending a tracked decision.
- **Structural empty blocks in framework scaffolding** — empty lifecycle hooks, empty test suites in newly scaffolded files before tests are written.