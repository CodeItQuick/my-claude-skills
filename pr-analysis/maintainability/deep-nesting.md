# Detection Patterns — Deep Nesting

Patterns where control flow is indented four or more levels deep, making it hard to track which conditions apply at the deepest point and which branch handles the common case. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the suppression rules in `../maintainability/suppression-rules.md` before reporting.

## 1. Pyramid of doom — successive if checks wrapping the whole body

```ts
function processOrder(order: Order) {
  if (order) {
    if (order.items.length > 0) {
      if (order.customer) {
        if (order.customer.isVerified) {
          // actual logic here — four levels deep
          charge(order);
        }
      }
    }
  }
}
```

Each guard wraps all subsequent code rather than returning early. Inverting each condition to a guard clause and returning immediately collapses all four levels to zero extra indentation.

## 2. Nested loops with inner logic

```ts
for (const department of departments) {
  for (const team of department.teams) {
    for (const member of team.members) {
      if (member.isActive) {
        results.push(transform(member));
      }
    }
  }
}
```

Three nested loops put the inner logic four levels deep. The inner body is a candidate for extraction into a named function (`collectActiveMembers(teams)`) that can be read and tested independently.

## 3. Callback pyramid

```ts
fs.readFile(path, (err, data) => {
  if (!err) {
    parse(data, (err, parsed) => {
      if (!err) {
        validate(parsed, (err, result) => {
          if (!err) {
            save(result, (err) => { ... });
          }
        });
      }
    });
  }
});
```

Three levels of nested callbacks, each with an error branch. `async/await` with `try/catch` would flatten this entirely.

## 4. Try/catch nested inside another try/catch

```ts
try {
  const data = fetch(url);
  try {
    const parsed = JSON.parse(data);
    try {
      save(parsed);
    } catch (e) { handleSaveError(e); }
  } catch (e) { handleParseError(e); }
} catch (e) { handleFetchError(e); }
```

Each operation has its own error type, but nested try/catch blocks stack indentation and make the happy path hard to follow. Sequential `try/catch` blocks or helper functions with specific error handling are flatter alternatives.

## 5. Conditional inside a loop inside a conditional

```ts
if (isEnabled) {
  for (const item of items) {
    if (item.active) {
      if (item.value > threshold) {
        process(item);
      }
    }
  }
}
```

The outer `isEnabled` check and the inner two conditions together create four levels. The outer guard could be an early return; the inner conditions could be a filter or a named predicate.

## 6. Switch inside a loop inside an if

```ts
if (mode === "batch") {
  for (const record of records) {
    switch (record.type) {
      case "A":
        if (record.valid) { handleA(record); }
        break;
      case "B":
        handleB(record);
        break;
    }
  }
}
```

The switch case bodies sit four levels in. Extracting `processRecord(record)` would bring the loop body to one level.

## 7. Guard clause opportunity missed

```ts
function render(user: User) {
  if (user.isActive) {
    if (user.hasPermission) {
      const data = prepareData(user);
      return <View data={data} />;
    }
  }
  return null;
}
```

The function's entire positive path is wrapped in two nested conditionals. Inverting to guard clauses (`if (!user.isActive) return null`) brings the main path to level zero.

---

## Evidence required

Gather **at least two** before reporting:

1. **Depth evidence** — the function contains four or more levels of indentation from control flow constructs (`if`/`else`, `for`/`while`/`forEach`, `try`/`catch`, `switch`).
2. **Inversion evidence** — the outermost condition or one of the intermediate conditions could be inverted to an early return, collapsing one or more nesting levels with no change to behavior.
3. **Extractability evidence** — a contiguous nested block could be extracted to a named function, reducing the depth at the call site and making the extracted logic independently readable.
4. **Happy-path burial evidence** — the main success path is the deepest branch, forcing a reader to trace through all enclosing conditions before reaching the code that runs in the common case.

---

## Patterns to **not** flag

- **Three or fewer levels** — below the threshold; the fix is not clearly worth the disruption
- **Recursive algorithms** — recursion depth tracks problem decomposition, not control flow complexity; it does not benefit from the same flattening techniques
- **State machine implementations** — a `switch` inside a `while` loop is idiomatic for state machines; the nesting is structural, not accidental
- **Intentionally nested data transformation** — nested `map`/`filter`/`reduce` over nested data structures where the shape of the code mirrors the shape of the data
- **Test describe/it blocks** — nesting in test files groups related cases; this is conventional and expected