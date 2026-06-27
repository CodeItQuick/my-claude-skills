# Detection Patterns — Awkward Construct

Patterns where code uses a verbose or indirect approach when a more direct idiom communicates the same intent more clearly. This is the complement to `overly-clever-one-liner`: where that pass targets expressions too *compressed* to read, this pass targets patterns too *roundabout* when a cleaner construct exists. The signal is not cleverness — it is indirection: the reader must mentally translate a verbose pattern into its modern equivalent before they can follow the intent. Each pattern is a *candidate*, not a finding — apply the evidence rules in `skill.md` and the awkward-construct suppression rules in `../shared/suppression-rules.md` before reporting.

## 1. `.then()` promise chain where `async/await` would flatten the structure

```ts
function loadUserProfile(userId: string) {
  return getUser(userId)
    .then(user => {
      return getPermissions(user.role)
        .then(permissions => {
          return getPreferences(user.id)
            .then(preferences => ({
              user,
              permissions,
              preferences,
            }));
        });
    });
}
```

Nested `.then()` callbacks re-introduce the same indentation pyramid that `async/await` was designed to eliminate. Each nesting level requires the reader to track a new closure scope. `async/await` flattens the chain to sequential lines where each step's result is immediately named and the control flow is visible at a glance.

## 2. Manual `for` loop accumulating into an array where `.map()` or `.filter()` would be direct

```ts
const activeEmails: string[] = [];
for (const user of users) {
  if (user.active) {
    activeEmails.push(user.email);
  }
}

const doubled: number[] = [];
for (let i = 0; i < numbers.length; i++) {
  doubled.push(numbers[i] * 2);
}
```

A `for` loop that initialises an empty array, conditionally pushes into it, and returns the array is a verbose encoding of `.filter().map()`. The imperative form requires the reader to simulate the loop mentally and infer the transformation; the declarative form names what each step does — filter, then project — and expresses the intent directly at the call site.

## 3. Manual `&&` chain for deep property access where optional chaining would be clearer

```ts
const city = user && user.address && user.address.location && user.address.location.city;

if (response && response.data && response.data.results && response.data.results.length > 0) {
  process(response.data.results);
}

const label = config && config.display && config.display.label || "Default";
```

A chain of `&&` guards to safely traverse nested properties requires the reader to confirm that each link is a null guard and not a meaningful boolean condition. Optional chaining (`user?.address?.location?.city`) communicates the intent — "navigate to this path if it exists" — in a single expression with no ambiguity about whether each `&&` is a guard or a logic condition.

## 4. `Object.keys().forEach()` accessing the value by re-indexing where `Object.entries()` pairs them

```ts
Object.keys(config).forEach(key => {
  const value = config[key];   // re-indexes to get what entries() gives directly
  applyOption(key, value);
});

Object.keys(handlers).forEach(eventName => {
  emitter.on(eventName, handlers[eventName]);
});
```

`Object.keys().forEach(k => obj[k])` retrieves the key, then re-looks up the value. `Object.entries()` yields `[key, value]` pairs directly. The re-indexing step adds noise and momentarily suggests the value lookup is doing something — it isn't. `Object.entries().forEach(([key, value]) => ...)` makes the pairing explicit and eliminates the intermediate lookup.

## 5. String concatenation with `+` where a template literal shows the structure directly

```ts
const message = "Hello " + user.firstName + " " + user.lastName + ", you have " + count + " unread messages.";

const url = baseUrl + "/api/v" + version + "/users/" + userId + "?format=" + format;

throw new Error("Expected " + expected + " but got " + actual + " at position " + pos);
```

String concatenation with `+` obscures the shape of the resulting string — the reader must mentally splice the literal segments and interpolated values to visualise the output. A template literal expresses the shape directly, with interpolated values visually embedded in their positions. The structure of the output is immediately legible.

## 6. Callback-style async API where a promise-based equivalent exists in the same environment

```ts
import fs from "fs";

fs.readFile(configPath, "utf8", (err, data) => {
  if (err) {
    handleError(err);
    return;
  }
  const config = JSON.parse(data);
  fs.writeFile(outputPath, JSON.stringify(config, null, 2), "utf8", (writeErr) => {
    if (writeErr) handleError(writeErr);
  });
});
```

The Node.js `fs.promises` API (`fs.promises.readFile`, `fs.promises.writeFile`) has been available since Node.js 10. When callback-style file I/O appears in a codebase that uses `async/await` elsewhere, the inconsistency forces the reader to switch between two async mental models in the same file. The promise-based equivalent allows `await`, uniform error handling, and the same flat structure used in the surrounding code.

---

## Patterns to **not** flag

- **Codebase-consistent style** — if the entire codebase uses `.then()` chains and `async/await` appears nowhere, flagging one `.then()` chain is inconsistency noise rather than a meaningful improvement signal. Flag the first appearance in new code written in a codebase that has already adopted the modern idiom.
- **`for` loop with non-trivial accumulated state across iterations** — a loop that builds state beyond a simple transform or filter, or whose iterations are not independent, cannot be mechanically replaced with `.map()` or `.filter()`. Only flag when the loop is a direct encoding of one of those operations.
- **`&&` chain used as a boolean condition, not a navigation expression** — `user && user.isAdmin && user.emailVerified` where the result is used as a boolean (not assigned to a variable expecting a string or object) is a valid pattern. Optional chaining returns `undefined`, not `false`, so the substitution changes semantics.
- **String concatenation inside a performance-critical loop** — where avoiding template literal parsing overhead is a known constraint, flag only if a comment explains the reason.
- **Callback-style required by a framework or legacy API contract** — event listeners, Node.js stream handlers, some test framework hooks, and integration points with callback-only third-party libraries. When the callee does not offer a promise interface, the callback is not awkward — it is required.
- **`for` loop expressing inherently sequential or order-dependent logic** — `async/await` in `.map()` does not run sequentially; a `for...of` with `await` inside is the correct pattern for sequential async iteration. Do not flag sequential async `for` loops as candidates for `.map()`.