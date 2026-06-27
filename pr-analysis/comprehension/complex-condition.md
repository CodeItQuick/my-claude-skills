# Detection Patterns — Complex Condition

Patterns where a boolean expression requires significant mental effort to evaluate — not because it is compressed into a one-liner (that is `overly-clever-one-liner`), but because the logic itself is hard to reason about: double negatives, four-or-more-clause predicates, De Morgan violations, and flag variables whose purpose the name does not communicate. Each pattern is a *candidate*, not a finding — apply the evidence rules in `skill.md` and the complex-condition suppression rules in `../shared/suppression-rules.md` before reporting.

## 1. Double negative

```ts
if (!isNotReady) { ... }

if (!user.isInactive) { ... }

const shouldProceed = !item.isNotEligible && !isBlocked;
```

A negation applied to a name that already encodes a negative (`isNot*`, `isIn*`, `isDisabled`, `isBlocked`) forces the reader to resolve two layers of negation to determine what the branch does. `if (!isNotReady)` means "if ready", but the reader must arrive there by cancellation. A rename or a positive equivalent eliminates the detour.

## 2. Multi-clause predicate with four or more terms

```ts
if (
  user.role === "admin" &&
  !user.isBanned &&
  user.emailVerifiedAt !== null &&
  !isSessionExpired(user) &&
  featureFlags.newDashboard
) {
  showDashboard();
}

const isEligible =
  order.status === "pending" &&
  order.total > 0 &&
  order.items.length > 0 &&
  !order.isCancelled &&
  customer.creditScore >= MIN_SCORE &&
  !isBlacklisted(customer.id);
```

A compound condition with four or more terms requires the reader to hold all terms simultaneously and reason about their combined truth value. A named predicate (`canAccessDashboard(user)`, `isEligibleForProcessing(order, customer)`) documents the compound concept, makes it testable in isolation, and reduces the cognitive load at the call site to a single readable term.

## 3. Negated compound condition that violates De Morgan's law

```ts
// Written as:
if (!(user.isAdmin || user.isModerator)) { redirect(); }

// Equivalent but harder to reason about than:
if (!user.isAdmin && !user.isModerator) { redirect(); }

// Written as:
if (!(errors.length === 0 && warnings.length === 0)) { showBanner(); }

// Equivalent but clearer as:
if (errors.length > 0 || warnings.length > 0) { showBanner(); }
```

Negating a compound expression requires applying De Morgan's law mentally — flipping `||` to `&&` and `&&` to `||` while distributing the negation. Readers must run this transformation before they can evaluate the condition. Distributing the negation to each term produces a form that can be read directly.

## 4. Flag variable used as the sole exit condition for a loop

```ts
let found = false;
let i = 0;
while (!found && i < items.length) {
  if (items[i].id === targetId) found = true;
  i++;
}

let done = false;
while (!done) {
  const chunk = readChunk();
  if (chunk === null) done = true;
  else process(chunk);
}
```

A boolean flag named `found`, `done`, `finished`, or `stop` as the loop's exit condition describes the *state* without communicating the *condition* under which it flips. The loop's termination logic is split between the flag assignment and the `while` condition, requiring the reader to trace both. `Array.prototype.find`, `for...of` with `break`, or a named predicate communicates the exit condition at the loop declaration.

## 5. Condition mixing positive and negative checks on the same concept

```ts
if (user.isActive && !user.isSuspended && user.isVerified && !user.isDeleted) { ... }

if (!errors.has("email") && formIsValid && !isSubmitting && hasChanges) { ... }
```

Alternating between positive (`isActive`, `isVerified`) and negative (`!isSuspended`, `!isDeleted`) checks on the same domain concept forces the reader to mentally toggle polarity on each term. Normalizing to one polarity (`isActive && isVerified && !isSuspended && !isDeleted` → `isEligible(user)`) or extracting a named predicate makes the condition a single yes/no question.

## 6. Condition with implicit operator precedence between `&&` and `||`

```ts
if (isAdmin || isOwner && resource.isPublic) { ... }
// Evaluates as: isAdmin || (isOwner && resource.isPublic)
// Not as:       (isAdmin || isOwner) && resource.isPublic

if (a && b || c && d) { ... }
// Requires knowing && binds tighter than || to evaluate correctly
```

`&&` binds tighter than `||`, but most readers do not hold operator precedence rules in working memory when reading conditions. A condition mixing both operators without parentheses requires a precedence lookup to confirm the intended grouping. Explicit parentheses document the grouping at no cost.

---

## Patterns to **not** flag

- **Two-term conditions** — `if (a && b)` or `if (a || b)` are always readable regardless of the operators used.
- **Short-circuit null guard** — `user && user.isAdmin` or `items?.length > 0` are a common, readable idiom for guarding optional access. Do not flag as a double-check.
- **Named predicate at the call site** — `if (isEligible(order))` is already a named extraction. Do not flag the call; flag only the predicate body if it is complex.
- **Negation of a positive name** — `!isActive`, `!isEnabled`, `!isValid` are single negations of unambiguous positive names. The reader resolves them in one step.
- **Condition in a test `expect` or `assert`** — test assertions are often verbose to communicate exactly what is being verified. Complexity in assertions is expected.
- **Generated or schema-driven conditions** — permission systems, policy engines, and generated access-control code may produce multi-clause conditions by construction.