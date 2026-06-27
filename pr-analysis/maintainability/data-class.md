# Detection Patterns — Data Class

Patterns where a `class` holds data but implements no behavior — leaving operations that belong to the class scattered across external functions that are repeatedly envious of its fields. Each pattern is a *candidate*, not a finding — apply the evidence rules in `skill.md` and the data-class suppression rules in `../shared/suppression-rules.md` before reporting.

This pass targets `class` declarations specifically. TypeScript `interface`, `type`, and plain object literals used as records or DTOs are intentionally data-only and are not candidates.

## 1. Class with only field declarations and a constructor

```ts
class Order {
  id: string;
  customerId: string;
  items: Item[];
  status: "pending" | "paid" | "shipped" | "cancelled";
  total: number;
  createdAt: Date;

  constructor(id: string, customerId: string, items: Item[]) {
    this.id = id;
    this.customerId = customerId;
    this.items = items;
    this.status = "pending";
    this.total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    this.createdAt = new Date();
  }
}
```

The class holds all the data for an `Order` but provides no behavior. Operations like `cancel()`, `ship()`, `addItem()`, `applyDiscount()`, and `isEligibleForRefund()` will inevitably end up as external functions that read and mutate `Order`'s fields directly — feature envy by construction.

## 2. Class whose behavior lives in external utility functions

```ts
class Customer {
  id: string;
  name: string;
  email: string;
  tier: "standard" | "premium" | "vip";
  totalSpend: number;
}

// Elsewhere in the codebase:
function getDiscountRate(customer: Customer): number {
  if (customer.tier === "vip") return 0.2;
  if (customer.tier === "premium") return 0.1;
  return 0;
}

function isEligibleForPromotion(customer: Customer): boolean {
  return customer.totalSpend > 1000 && customer.tier !== "vip";
}

function formatCustomerLabel(customer: Customer): string {
  return `${customer.name} (${customer.tier})`;
}
```

The class owns the data. The functions own the behavior. Any change to `Customer`'s fields requires hunting for all the external functions that depend on those fields. Moving these functions to `Customer` as methods co-locates the data and the operations that enforce its invariants.

## 3. Class with only getters and setters, no computed behavior

```ts
class Address {
  private _street: string;
  private _city: string;
  private _postalCode: string;
  private _country: string;

  get street() { return this._street; }
  set street(v: string) { this._street = v; }
  get city() { return this._city; }
  set city(v: string) { this._city = v; }
  // ... and so on for every field
}
```

Getters and setters that do no validation or computation are private fields with ceremony. The class provides no stronger invariant guarantee than a plain object, but it imposes getter/setter boilerplate on every access. Behavior such as `format()`, `validate()`, or `isInternational()` is missing and will be implemented externally.

## 4. Class that is the target of repeated feature envy

When multiple external functions each read three or more fields from the same class, the class is a data-class symptom even if the symptoms appear as `feature-envy` findings. The data-class pattern is confirmed when the envious functions cluster around one class and perform operations that belong inside it.

---

## Patterns to **not** flag

- **TypeScript `interface` or `type`** — these are structural descriptions, not implementation decisions. Data-only interfaces are correct TypeScript.
- **DTOs and API payload types** — objects whose explicit purpose is to carry data across a boundary (HTTP request/response, database row, message queue payload). Behavior belongs in the domain model, not in transport objects.
- **Value objects with identity based on all fields** — small immutable objects like `Money`, `Coordinate`, or `DateRange` may have minimal methods by design; flag only when observable behavior is missing and is known to be implemented elsewhere.
- **Framework model objects** — ORM entities, GraphQL input types, form models where the framework owns the lifecycle and behavior hooks. The framework constrains what methods are appropriate.
- **Configuration objects** — classes that aggregate settings for injection have no domain behavior to add.