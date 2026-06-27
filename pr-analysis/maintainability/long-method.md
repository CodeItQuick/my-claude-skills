# Detection Patterns — Long Method

Patterns where a function or method has grown to the point where no single reader can hold its full purpose in working memory — functions that handle multiple distinct concerns inline, where named extraction would make each concern independently readable and testable. Each pattern is a *candidate*, not a finding — apply the evidence rules in `skill.md` and the long-method suppression rules in `../shared/suppression-rules.md` before reporting.

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

## Patterns to **not** flag

- **Long functions that are a single cohesive operation** — a parser, a codec, a mathematical transformation with many steps that share tight intermediate state. The length reflects the problem, not the design.
- **Generated code** — ORM migrations, protocol buffer serialisers, scaffolded CRUD handlers. Length is the generator's output.
- **Exhaustive `switch` or `if`/`else` chains where each branch is a one- or two-liner** — a 20-case switch whose cases are each a single assignment is long in line count but not in complexity.
- **Framework-imposed handler structure** — request handlers, reducers, saga workers whose length is dictated by the required handling of multiple action types.
- **Configuration or builder chains** — long but declarative; each line is a setting, not a step in a computation.