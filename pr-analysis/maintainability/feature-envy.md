# Detection Patterns — Feature Envy

Patterns where a function or method is more interested in the data of another module or class than its own, suggesting it belongs elsewhere. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the shared suppression rules in `../shared/suppression-rules.md` before reporting.

## 1. Function accesses many fields of a single foreign object

```ts
function formatInvoiceLine(item: OrderItem, order: Order): string {
  const tax = order.taxRate * item.price * item.quantity;
  const subtotal = item.price * item.quantity;
  const discount = order.discountCode ? order.discountAmount : 0;
  return `${item.name}: ${subtotal + tax - discount}`;
}
```

`formatInvoiceLine` reads `order.taxRate`, `order.discountCode`, `order.discountAmount`, and three fields of `item`. It uses more of `Order` and `OrderItem` than any data of its own. The function likely belongs as a method on `OrderItem` that accepts an `Order`, or on `Order` itself.

## 2. Method uses another class's data more than `this`

```ts
class ReportGenerator {
  generate(user: User): string {
    const age = new Date().getFullYear() - user.birthYear;
    const tier = user.subscriptionLevel === "premium" ? "P" : "S";
    const initials = user.firstName[0] + user.lastName[0];
    return `${initials}-${tier}-${age}`;
  }
}
```

`generate` references `this` zero times and `user` five times. The formatting logic belongs on `User` or a `UserFormatter` that is in the `User` module. `ReportGenerator` is acting as a surrogate for logic that another class should own.

## 3. Helper function that exists only to extract fields from one type

```ts
function getOrderSummary(order: Order) {
  return {
    total: order.subtotal + order.tax - order.discount,
    itemCount: order.items.length,
    isPaid: order.status === "paid",
  };
}
```

This function is a projection of `Order` — it computes derived values entirely from `Order`'s own data. It would be cleaner as a method or getter on `Order`, keeping the derivation logic next to the data it derives from.

## 4. Algorithm split across a caller and a foreign object with no clear ownership

```ts
class PricingEngine {
  applyPromotion(cart: Cart, promo: Promotion): number {
    const eligibleItems = cart.items.filter(i => promo.categories.includes(i.category));
    const discountBase = eligibleItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const discount = discountBase * promo.discountRate;
    return cart.subtotal - discount;
  }
}
```

The entire calculation is driven by `Cart` and `Promotion` data. `PricingEngine` contributes no state. The method could move to `Cart` (`cart.applyPromotion(promo)`) or `Promotion` (`promo.applyTo(cart)`), keeping the algorithm with the data it operates on.

## 5. Utility function that is really a missing method on a domain type

```ts
// utils/user-utils.ts
function isUserActive(user: User): boolean {
  return user.status === "active" && !user.deletedAt && user.emailVerified;
}

function getUserDisplayName(user: User): string {
  return user.preferredName ?? `${user.firstName} ${user.lastName}`;
}
```

When a utility file accumulates functions that each take a single domain object and derive a value from its fields, those functions are displaced methods. `user.isActive()` and `user.displayName` are more discoverable, easier to test in isolation, and keep the `User` invariants centralized.

## 6. Transformer that reaches deep into a nested structure

```ts
function buildNotificationPayload(order: Order): Payload {
  return {
    recipientEmail: order.customer.contactInfo.email,
    recipientName: order.customer.profile.displayName,
    subject: `Order ${order.id} from ${order.merchant.businessName}`,
    amount: order.pricing.total.formatted,
  };
}
```

Reaching three levels deep into `order.customer.contactInfo.email` and `order.pricing.total.formatted` means this function is tightly coupled to the internal structure of `Order`, `Customer`, `ContactInfo`, and `Pricing`. Each navigation step is a dependency on an internal implementation detail. The function would be more stable if `Order` exposed a `notificationContext()` method that returned the values it needs without exposing its internals.

## 7. Function parameter used only to pass to another function

```ts
function processCheckout(cart: Cart, user: User, paymentMethod: PaymentMethod) {
  const tax = calculateTax(cart.subtotal, user.address.state);
  const total = cart.subtotal + tax;
  return chargeCard(paymentMethod, total, user.email);
}
```

`processCheckout` touches `user.address.state` and `user.email` — two fields from deep inside `User` — but adds no logic of its own beyond connecting calls. The scattered field accesses suggest either `User` should expose higher-level methods (`user.taxState()`, `user.billingEmail()`), or the function belongs in a module that already has both `Cart` and `User` in scope as first-class concepts.

---

## Evidence required

Gather **at least two** before reporting:

1. **Access count evidence** — the function reads three or more distinct fields or methods from a single foreign object, while referencing its own class's data (`this`) zero or one times.
2. **Derivation evidence** — the function's return value or side effect is computed entirely from one foreign object's data, with no contribution from the function's own module or state.
3. **Displacement evidence** — moving the function to the foreign object would require passing fewer arguments and would remove the need to expose internal fields through a public interface.
4. **Deep navigation evidence** — the function traverses two or more levels into a foreign object's structure (`order.customer.contactInfo.email`), coupling it to implementation details the foreign object should encapsulate.

---

## Patterns to **not** flag

- **Legitimate orchestration functions** — a function whose job is explicitly to coordinate between multiple objects (a service layer, a use-case handler, a command handler) is supposed to touch multiple domains. Flag envy only when the function's logic is dominated by one foreign object's data, not when it is genuinely orchestrating several.
- **Mappers and serializers at boundaries** — functions that convert domain objects to DTOs, API payloads, or database rows necessarily read many fields. The conversion is the job; the field access is expected.
- **Functions that genuinely belong to the caller's abstraction level** — a `ReportService.generate(user)` that formats a report may legitimately access user fields if reporting is the `ReportService`'s core responsibility and the data access is what callers expect.
- **Functions constrained by a framework interface** — controllers, resolvers, and event handlers must accept the types the framework provides. The envy may be real but the fix requires restructuring beyond the diff.
- **Short accessor functions (1–2 field accesses)** — a function that reads one or two fields from a foreign object is not yet envious. Envy requires a clear pattern of repeated access to many fields of the same object.
- **Read-only access through a well-defined public API** — if the foreign object exposes the accessed fields as intentional public interface (not internal implementation details), the access is legitimate consumption of a public contract.

---

## Comment examples

**Good:**

> **Suggested:** `formatInvoiceLine` at line 15 reads `order.taxRate`, `order.discountCode`, and `order.discountAmount` while referencing no state of its own — the logic is entirely derived from `Order`. Could this move to `Order` as a method, or to an `OrderFormatter` class in the same module?

> **Suggested:** `isUserActive` in `user-utils.ts` at line 8 reads `user.status`, `user.deletedAt`, and `user.emailVerified`. This looks like a displaced method — `user.isActive()` would be more discoverable and keep the `User` invariants centralized. Is there a reason this lives outside the `User` class?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Function reads 3+ fields of one object, `this` not referenced | Ask: "Could this move to `X` as a method, since it's entirely derived from `X`'s data?" |
| Utility file accumulating single-type projections | Ask: "These helpers each take `User` and derive a value — would they be more discoverable as `User` methods?" |
| Deep navigation into a nested structure | Ask: "Does `order.customer.contactInfo.email` need to be accessed here, or could `Order` expose a `recipientEmail` property?" |