# Detection Patterns — Boolean State Machine

Patterns where multiple boolean fields or variables are used together to track a lifecycle or state that has a fixed set of valid phases. The core problem is that N booleans produce 2^N combinations, but only a few are meaningful — invalid combinations become possible and nothing in the type system prevents them. Each pattern is a *candidate*, not a finding — apply the evidence rules in `skill.md` and the suppression rules in `../maintainability/suppression-rules.md` before reporting.

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

## Patterns to **not** flag

- **Two fully independent booleans with no coordination** — `isVisible` and `isDisabled` where all four combinations (`visible+enabled`, `visible+disabled`, `hidden+enabled`, `hidden+disabled`) are all valid and meaningful; neither is set or checked in terms of the other
- **Feature flags and user preferences** — `notifications.emailEnabled`, `notifications.smsEnabled` — independent toggles, not lifecycle phases; all combinations are intentional
- **Single boolean with no siblings** — a lone `isLoading` flag with nothing to coordinate with is not a state machine
- **Boolean that controls a cross-cutting concern** — `isReadOnly`, `isArchived` — these are properties of an entity, not phases of a lifecycle; they are orthogonal to other state