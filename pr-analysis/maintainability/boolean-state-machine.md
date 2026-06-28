# Detection Patterns — Boolean State Machine

Patterns where multiple boolean fields or variables are used together to track a lifecycle or state that has a fixed set of valid phases. The core problem is that N booleans produce 2^N combinations, but only a few are meaningful — invalid combinations become possible and nothing in the type system prevents them. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the suppression rules in `../maintainability/suppression-rules.md` before reporting.

## 1. Lifecycle booleans with impossible combinations

```ts
class Request {
  isLoading = false;
  isLoaded = false;
  hasFailed = false;
  isRetrying = false;
}
```

Four booleans produce sixteen combinations, but `isLoading && isLoaded`, `isLoaded && hasFailed`, and `isLoading && isRetrying && isLoaded` are all meaningless. A union type makes the valid states explicit and the invalid ones unrepresentable:

```ts
type RequestState = 'idle' | 'loading' | 'retrying' | 'loaded' | 'failed';
```

## 2. Booleans set in tandem at multiple sites

```ts
// In startFetch():
this.isLoading = true;
this.hasFailed = false;
this.isLoaded = false;

// In onSuccess():
this.isLoading = false;
this.isLoaded = true;

// In onError():
this.isLoading = false;
this.hasFailed = true;
```

Every transition requires resetting multiple booleans in sync. Missing one reset at any site leaves the object in an invalid combination. A single state assignment (`this.state = 'loading'`) is atomic and impossible to leave half-updated.

## 3. Compound boolean checks to determine current state

```ts
if (!isLoading && !hasFailed && data !== null) {
  renderSuccess(data);
} else if (isLoading && !hasFailed) {
  renderSpinner();
} else if (hasFailed) {
  renderError();
}
```

The reader must mentally evaluate combinations to determine what state the system is in. `switch (state)` on an enum makes each branch self-describing.

## 4. Mutually exclusive booleans

```ts
let isAdmin = false;
let isModerator = false;
let isGuest = true;
```

At most one should be true at a time, but nothing enforces this. A user with `isAdmin: true` and `isModerator: true` is an invalid state the code must defensively handle everywhere. A `role: 'admin' | 'moderator' | 'guest'` field eliminates the class of invalid states.

## 5. Boolean reset block in cleanup or reset method

```ts
reset() {
  this.isOpen = false;
  this.isAnimating = false;
  this.isDisabled = false;
  this.isPending = false;
}
```

A reset function that sets four booleans to their default values is strong evidence that these booleans collectively describe a state. If a new phase is added, the reset must be updated in lockstep — a single `this.state = 'idle'` assignment would not require coordination.

## 6. Two booleans where one is only valid when the other is false

```ts
let isSaving = false;
let isSaved = false;

// isSaving and isSaved being true at the same time is invalid
```

Two booleans with one impossible combination (`isSaving && isSaved`) is the minimal form. Even here, a three-state enum (`'unsaved' | 'saving' | 'saved'`) is clearer and prevents the invalid case.

## 7. Boolean used as a progress flag inside an operation

```ts
let started = false;
let finished = false;
let failed = false;

try {
  started = true;
  await runJob();
  finished = true;
} catch {
  failed = true;
}
```

Three booleans tracking a single operation's lifecycle. `'pending' | 'running' | 'completed' | 'failed'` would carry the same information with no invalid combinations.

---

## Evidence required

Gather **at least two** before reporting:

1. **Multiplicity evidence** — two or more boolean fields or variables whose values are coordinated: set together, checked together, or reset together in at least one place.
2. **Invalid combination evidence** — at least one combination of the boolean values represents an impossible or meaningless state (e.g., `isLoading: true` and `isLoaded: true` simultaneously), confirming the booleans are not independent.
3. **Tandem-set evidence** — the booleans are assigned in groups at two or more sites (`isLoading = false; isLoaded = true`), meaning every transition requires keeping multiple writes in sync.
4. **Discriminant evidence** — the code checks combinations of booleans to determine behavior (`if (!isLoading && !hasFailed)`) rather than reading a single named state value.

---

## Patterns to **not** flag

- **Two fully independent booleans with no coordination** — `isVisible` and `isDisabled` where all four combinations (`visible+enabled`, `visible+disabled`, `hidden+enabled`, `hidden+disabled`) are all valid and meaningful; neither is set or checked in terms of the other
- **Feature flags and user preferences** — `notifications.emailEnabled`, `notifications.smsEnabled` — independent toggles, not lifecycle phases; all combinations are intentional
- **Single boolean with no siblings** — a lone `isLoading` flag with nothing to coordinate with is not a state machine
- **Boolean that controls a cross-cutting concern** — `isReadOnly`, `isArchived` — these are properties of an entity, not phases of a lifecycle; they are orthogonal to other state

---

## Comment examples

**Good:**

> **Suggested:** `Request` at line 8 tracks its lifecycle with four booleans — `isLoading`, `isLoaded`, `hasFailed`, `isRetrying`. Combinations like `isLoading && isLoaded` are structurally possible but meaningless, and every transition requires resetting multiple flags in sync. Could these collapse to a single `state: 'idle' | 'loading' | 'retrying' | 'loaded' | 'failed'` field?

> **Suggested:** `startFetch`, `onSuccess`, and `onError` at lines 14, 22, and 31 each set `isLoading`, `isLoaded`, and `hasFailed` in tandem. If any transition omits a reset, the object lands in an invalid combination with no type-level protection. Would a single `this.status` assignment make each transition atomic?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Three or more booleans reset together in a method | Assert: "`reset()` zeros four booleans in sync — a single `state = 'idle'` assignment would be atomic and exhaustive." |
| Compound boolean check to determine current state | Ask: "Could `if (!isLoading && !hasFailed && data)` become `if (state === 'loaded')`?" |
| Mutually exclusive booleans (only one true at a time) | Ask: "Could `isAdmin`, `isModerator`, and `isGuest` become `role: 'admin' \| 'moderator' \| 'guest'` to make the mutual exclusion enforced rather than assumed?" |
| Two booleans with one impossible combination | Ask: "Is `isSaving && isSaved` ever possible? If not, a three-state enum would make that unrepresentable." |