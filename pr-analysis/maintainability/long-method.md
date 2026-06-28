# Detection Patterns — Long Method

Patterns where a function or method has grown to the point where no single reader can hold its full purpose in working memory — functions that handle multiple distinct concerns inline, where named extraction would make each concern independently readable and testable. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the long-method suppression rules in `../shared/suppression-rules.md` before reporting.

## 1. Function that validates, transforms, persists, and notifies — all inline

```ts
async function submitOrder(raw: unknown): Promise<OrderResult> {
  // 15 lines of validation
  if (!raw || typeof raw !== "object") throw new Error("...");
  const { userId, items, coupon } = raw as any;
  if (!userId) throw new Error("...");
  // ...

  // 20 lines of price calculation
  const prices = items.map((i: any) => catalog[i.id].price * i.qty);
  const subtotal = prices.reduce((a, b) => a + b, 0);
  const discount = coupon ? await getCouponDiscount(coupon, subtotal) : 0;
  // ...

  // 10 lines of persistence
  const order = await db.orders.create({ userId, items, total: subtotal - discount });
  await db.inventory.reserveAll(items);
  // ...

  // 8 lines of notification
  await email.send(userId, confirmationTemplate(order));
  await analytics.track("order_placed", { orderId: order.id });
}
```

The function name says "submit order" but it is actually four functions: validate, price, persist, notify. Each step is a named concept and a potential test boundary. Buried inline, each step is harder to test in isolation, harder to reuse, and harder to change without reading the full function.

## 2. Function with long sequential steps sharing almost no intermediate state

```ts
async function generateReport(params: ReportParams): Promise<Report> {
  // fetch raw data — 12 lines
  const users = await db.users.findAll(params.filter);
  const orders = await db.orders.forPeriod(params.startDate, params.endDate);
  // ...

  // enrich — 15 lines
  const enriched = users.map(u => ({
    ...u,
    orders: orders.filter(o => o.userId === u.id),
    // ...
  }));

  // aggregate — 18 lines
  const byRegion = enriched.reduce((acc, u) => {
    // ...
  }, {} as Record<string, AggregateRow>);

  // format — 14 lines
  const rows = Object.entries(byRegion).map(([region, data]) => ({
    // ...
  }));

  return { rows, generatedAt: new Date() };
}
```

Each step produces a result consumed by the next, but the steps are conceptually independent and named: fetch, enrich, aggregate, format. Extraction into helpers makes each step testable with a fixed input and reveals the data flow at the orchestration level.

## 3. Function with a large `if`/`else` or `switch` whose branches each contain substantial logic

```ts
function handleEvent(event: Event): void {
  if (event.type === "order_placed") {
    // 20 lines
    const order = deserializeOrder(event.payload);
    const customer = await getCustomer(order.customerId);
    // ...
  } else if (event.type === "order_cancelled") {
    // 18 lines
    const order = await db.orders.findById(event.payload.orderId);
    await inventory.releaseAll(order.items);
    // ...
  } else if (event.type === "payment_failed") {
    // 15 lines
    // ...
  }
}
```

A dispatcher whose branches each contain non-trivial logic is a long method with a structural disguise. Each branch is a candidate for extraction; the dispatcher becomes a routing function whose branches are named calls.

## 4. Test function that exercises multiple unrelated scenarios without parametrisation

```ts
it("processes orders", async () => {
  // scenario 1 — happy path
  const order = buildOrder();
  const result = await processOrder(order);
  expect(result.status).toBe("complete");

  // scenario 2 — out of stock
  const oos = buildOrder({ items: [{ id: "X", qty: 100 }] });
  const oosResult = await processOrder(oos);
  expect(oosResult.status).toBe("failed");
  expect(oosResult.reason).toBe("out_of_stock");

  // scenario 3 — invalid coupon
  // ...
});
```

A single test that covers multiple independent scenarios cannot be run in isolation. When it fails, the failure does not identify which scenario broke. Each scenario is a separate test with a separate name and a separate failure message.

---

## Evidence required

Gather **at least two** before reporting:

1. **Phase evidence** — the function body contains two or more distinct phases — validate, transform, persist, notify, fetch, enrich, aggregate — each of which is a named concept in the domain and a natural test boundary.
2. **Independence evidence** — the phases share little intermediate state; each phase could be extracted to a function that accepts a clear input and returns a clear output with no implicit dependency on the other phases.
3. **Length evidence** — the function is long enough that no single reader can hold its full purpose in working memory without scrolling: more than 30–40 lines as a rough guide, but phase count is the primary signal.
4. **Testability evidence** — the inline logic cannot be tested in isolation without exercising the full function; extraction would create independently testable units.

---

## Patterns to **not** flag

- **Long functions that are a single cohesive operation** — a parser, a codec, a mathematical transformation with many steps that share tight intermediate state. The length reflects the problem, not the design.
- **Generated code** — ORM migrations, protocol buffer serialisers, scaffolded CRUD handlers. Length is the generator's output.
- **Exhaustive `switch` or `if`/`else` chains where each branch is a one- or two-liner** — a 20-case switch whose cases are each a single assignment is long in line count but not in complexity.
- **Framework-imposed handler structure** — request handlers, reducers, saga workers whose length is dictated by the required handling of multiple action types.
- **Configuration or builder chains** — long but declarative; each line is a setting, not a step in a computation.

---

## Comment examples

**Good:**

> **Suggested:** `submitOrder` at line 8 validates the input, calculates the price, persists the order, and sends a confirmation email — all inline. Each step is a named concept and a natural test boundary. Could `validateOrderInput`, `calculateOrderTotal`, `persistOrder`, and `sendConfirmation` be extracted so each can be tested and changed independently?

> **Suggested:** `handleEvent` at line 22 dispatches on `event.type` with `if`/`else if` branches that each contain 15–20 lines of logic. Each branch is effectively a separate handler. Could `handleOrderPlaced`, `handleOrderCancelled`, and `handlePaymentFailed` replace the branches so `handleEvent` becomes a router?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Function does validate + transform + persist + notify inline | Ask: "Could each phase (`validateInput`, `calculateTotal`, `persist`, `notify`) extract to a named function so each is independently testable?" |
| Long sequential steps with little shared state | Ask: "The steps here — fetch, enrich, aggregate, format — share almost no intermediate state. Could each become a named helper so the data flow is visible at the orchestration level?" |
| `if`/`else` dispatcher with substantial branch logic | Ask: "Each branch in this dispatcher is 15–20 lines. Could the branches become named handlers so `handleEvent` is purely routing?" |
| Test covering multiple unrelated scenarios | Ask: "This test exercises three independent scenarios. Could they become separate `it` blocks so each fails independently?" |