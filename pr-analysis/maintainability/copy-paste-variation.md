# Detection Patterns — Copy-Paste Variation

Patterns where two or more blocks are structurally identical except for one or two varying values, field names, or expressions. The risk is not the duplication itself but the change coupling it creates: a future fix to the shared logic must be applied to every copy, and there is nothing to remind the author that other copies exist. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the suppression rules in `../maintainability/suppression-rules.md` before reporting.

## 1. Two functions with identical bodies differing only in a field name

```ts
function getTotalPrice(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getTotalCost(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.cost * item.quantity, 0);
}
```

The only difference is `item.price` vs `item.cost`. The reduce structure, the accumulator, and the return type are identical. A shared `sumBy(items, field)` helper or a single `getTotal(order, key: 'price' | 'cost')` would make a future change to the accumulator logic apply once.

## 2. Consecutive if/else branches with the same body structure

```ts
if (event.type === 'click') {
  logger.info('click event', { userId: event.userId, timestamp: event.timestamp });
  metrics.increment('events.click');
}
if (event.type === 'submit') {
  logger.info('submit event', { userId: event.userId, timestamp: event.timestamp });
  metrics.increment('events.submit');
}
if (event.type === 'scroll') {
  logger.info('scroll event', { userId: event.userId, timestamp: event.timestamp });
  metrics.increment('events.scroll');
}
```

Three blocks with the same two-operation body, varying only in the event type string. A dispatch table or a single parameterised call (`trackEvent(event.type, event)`) replaces all three.

## 3. Two event handlers that differ only in which field they update

```ts
const handleFirstNameChange = (e: ChangeEvent) => {
  setErrors(prev => ({ ...prev, firstName: undefined }));
  setForm(prev => ({ ...prev, firstName: e.target.value }));
};

const handleLastNameChange = (e: ChangeEvent) => {
  setErrors(prev => ({ ...prev, lastName: undefined }));
  setForm(prev => ({ ...prev, lastName: e.target.value }));
};
```

Identical structure; only the field key changes. A factory `makeFieldHandler(field)` or a single `handleChange(field, value)` would reduce four handlers to one.

## 4. Two class methods with the same logic but different properties

```ts
class ReportBuilder {
  addSalesSection() {
    this.sections.push({ type: 'sales', data: this.data.sales, title: 'Sales' });
    this.dirty = true;
  }

  addCostsSection() {
    this.sections.push({ type: 'costs', data: this.data.costs, title: 'Costs' });
    this.dirty = true;
  }
}
```

The push and the `dirty` flag are duplicated. `addSection(type, data, title)` would consolidate them, and adding a new section type would not require a new method.

## 5. Two branches of a switch that have the same body shape

```ts
switch (format) {
  case 'csv':
    const csvResult = transform(data);
    writeFile(`output.csv`, csvResult);
    notify('csv', csvResult.rowCount);
    break;
  case 'tsv':
    const tsvResult = transform(data);
    writeFile(`output.tsv`, tsvResult);
    notify('tsv', tsvResult.rowCount);
    break;
}
```

The three-step pattern (transform, write, notify) is identical; only the format string and extension vary. A helper `exportAs(format, ext, data)` would express this once.

## 6. Two loops over different collections with the same body

```ts
for (const admin of admins) {
  if (!admin.emailVerified) {
    await sendVerificationEmail(admin.email);
    await logPendingVerification(admin.id, 'admin');
  }
}

for (const moderator of moderators) {
  if (!moderator.emailVerified) {
    await sendVerificationEmail(moderator.email);
    await logPendingVerification(moderator.id, 'moderator');
  }
}
```

Two loops with the same conditional and the same two-step body, varying only in the collection and the role string. A single `sendPendingVerifications(users, role)` function would cover both.

## 7. Duplicated validation blocks

```ts
if (!input.name || input.name.length < 2) {
  errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
}
if (!input.title || input.title.length < 2) {
  errors.push({ field: 'title', message: 'Title must be at least 2 characters' });
}
if (!input.bio || input.bio.length < 2) {
  errors.push({ field: 'bio', message: 'Bio must be at least 2 characters' });
}
```

The same minimum-length check, duplicated three times with different field names and labels. A `validateMinLength(field, label, min)` helper or a declarative rules array would centralise the logic and make adding a new field a one-line change.

---

## Evidence required

Gather **at least two** before reporting:

1. **Structural identity evidence** — two or more blocks share the same control flow, operations, and return shape; the blocks are recognisably the same code with values swapped out.
2. **Variation evidence** — the difference between the blocks is confined to one or two values, field names, or string literals that could become parameters with no change to the surrounding logic.
3. **Locality evidence** — the duplicate blocks appear in the same function, class, or file, making the duplication visible and unambiguous rather than a coincidental resemblance across distant modules.
4. **Change-coupling evidence** — a modification to the shared logic (the accumulator, the error push, the two-step body) would need to be applied identically to every copy, with nothing to prompt the author that other copies exist.

---

## Patterns to **not** flag

- **Two blocks that differ in more than two axes** — if abstracting requires three or more parameters to capture all the variation, the shared structure may be too thin and the extracted function harder to read than the duplicates
- **Generated or scaffolded code** — migration files, ORM model stubs, and code produced by a generator; the duplication is the generator's responsibility
- **Test cases with the same structure but different inputs and expectations** — parameterised test data is a better fix than extraction, and even unparameterised tests are conventionally allowed to repeat structure for readability
- **Framework boilerplate where the pattern is idiomatic** — Redux reducers, React lifecycle methods, and similar patterns where the duplication is prescribed by the framework
- **Two instances only, where the variation is the entire meaningful difference** — `formatDate(date)` and `formatTime(date)` share almost nothing once you remove the format string; extraction would add an abstraction with no useful name

---

## Comment examples

**Good:**

> **Suggested:** `getTotalPrice` and `getTotalCost` at lines 12 and 18 are identical except for `item.price` vs `item.cost`. If the reduce logic ever needs to change — rounding, currency conversion, filtering zero-quantity items — it would need to be updated in both places. Could these share a `sumBy(items, key: 'price' | 'cost')` helper?

> **Suggested:** The three event-type blocks at lines 24–36 follow the same two-step pattern (`logger.info` + `metrics.increment`) with only the type string varying. A fourth event type would require a fourth copy. Could `trackEvent(type, event)` replace all three?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Three or more copies of the same block | Assert: "This pattern appears N times with only X varying — a future logic change must be applied to all N copies." |
| Two copies where variation is a single field name | Ask: "Could `getTotalPrice` and `getTotalCost` share a `sumBy(items, key)` helper so the reduce logic lives once?" |
| Two event handlers differing only in field key | Ask: "Could `makeFieldHandler(field)` produce both handlers so the clear-error and set-value logic is defined once?" |
| Duplicated validation with different field names | Ask: "Could these three length checks become `validateMinLength(field, label, min)` calls so the rule is defined once?" |