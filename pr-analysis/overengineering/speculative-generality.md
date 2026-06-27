# Detection Patterns — Speculative Generality

Patterns where structure is added in anticipation of future requirements that do not yet exist — type parameters with no second type, abstract base classes with one subclass, extension points with no consumers, and optional parameters never varied from their default. The defining signal is **presence without a current consumer**: the structure is there, but nothing in the codebase uses the flexibility it provides. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the speculative-generality suppression rules in `../shared/suppression-rules.md` before reporting.

## 1. Generic type parameter with only one concrete usage

```ts
function process<T>(data: T): T {
  // T is only ever called as process<Order>(order)
  return transform(data) as T;
}

class Repository<T> {
  findById(id: string): Promise<T> { ... }
  save(entity: T): Promise<void> { ... }
}
// Repository is only ever instantiated as new Repository<User>()
```

A type parameter that is only ever bound to one type provides no polymorphism — it is a concrete function with a type variable in place of the concrete type. The generic machinery adds complexity at the definition site and in error messages with no benefit at the call site. If a second type binding is not present in the diff, the parameter is speculative.

## 2. Abstract base class with a single concrete subclass

```ts
abstract class BaseNotifier {
  abstract send(recipient: string, message: string): Promise<void>;
  protected log(msg: string) { console.log(msg); }
}

class EmailNotifier extends BaseNotifier {
  async send(recipient: string, message: string) {
    await mailer.send(recipient, message);
    this.log(`Sent to ${recipient}`);
  }
}
// No other subclass exists anywhere in the codebase
```

An abstract class exists to define a contract that multiple implementations satisfy. With one implementation, the abstraction provides no runtime substitution and no compile-time constraint that the concrete class could not enforce directly. The abstract layer exists only to enable a second subclass that has not been written.

## 3. Interface with a single implementation never used for substitution

```ts
interface PaymentGateway {
  charge(amount: number, token: string): Promise<Receipt>;
  refund(transactionId: string): Promise<void>;
}

class StripeGateway implements PaymentGateway {
  async charge(...) { ... }
  async refund(...) { ... }
}

// PaymentGateway is only referenced as the type of StripeGateway
// Never mocked, never injected with an alternative, never used as a test double
```

An interface used as the type of its sole implementation — never swapped, never mocked, never injected with an alternative — adds a level of indirection with no current value. The interface would earn its existence when a second implementation is added or when tests mock it; until then, it is speculative.

## 4. Hook, event emitter, or plugin slot with no registered consumers

```ts
class Pipeline {
  private hooks: Array<(data: Data) => void> = [];

  registerHook(fn: (data: Data) => void) {
    this.hooks.push(fn);
  }

  run(data: Data) {
    this.hooks.forEach(h => h(data));
    return process(data);
  }
}
// registerHook is never called anywhere in the codebase
```

An extension mechanism — hook array, event emitter, plugin registry, middleware chain — that has no registered consumers in the codebase is a speculative API. It adds surface area, documentation burden, and maintenance cost for a flexibility that no caller has requested.

## 5. Optional parameter whose default is never overridden at any call site

```ts
async function fetchUser(
  id: string,
  options: { includeDeleted?: boolean; timeout?: number; retries?: number } = {}
) {
  const { includeDeleted = false, timeout = 5000, retries = 3 } = options;
  // ...
}

// Every call site:
fetchUser(userId)
fetchUser(id)
fetchUser(req.params.id)
// options is never passed
```

When an optional parameter or options object is never varied across all visible call sites, the flexibility it provides is unused. The defaults are the only values that ever run. The parameter adds surface area to the signature and cognitive overhead to callers who must understand an option they will never use.

## 6. Strategy, visitor, or policy object instantiated with only one concrete strategy

```ts
interface SortStrategy {
  sort(items: Item[]): Item[];
}

class AscendingSort implements SortStrategy {
  sort(items: Item[]) { return [...items].sort((a, b) => a.name.localeCompare(b.name)); }
}

class ItemList {
  constructor(private strategy: SortStrategy) {}
  sorted() { return this.strategy.sort(this.items); }
}

// Only ever constructed as new ItemList(new AscendingSort())
// No other SortStrategy implementation exists
```

The Strategy pattern earns its complexity when the strategy genuinely varies at runtime or when multiple concrete strategies exist. When only one strategy is instantiated anywhere in the codebase, the pattern is carrying the weight of a polymorphism that does not exist.

---

## Evidence required

Gather **at least two** before reporting:

1. **Presence-without-consumer evidence** — the structure exists (type parameter, abstract class, interface, hook slot, optional parameter) but nothing in the visible codebase exercises the flexibility it provides: no second type binding, no second subclass, no registered consumer, no call site that varies the parameter.
2. **Single-use evidence** — the generic, abstract, or extensible construct is only ever used in one concrete way across all visible call sites and implementations.
3. **Complexity cost evidence** — the speculative structure adds real overhead: type parameter noise in signatures and error messages, an extra layer of indirection through the abstract class, maintenance burden for a hook system that serves no consumer.
4. **No planned-use evidence** — no adjacent comment, ticket reference, or PR description explains what future requirement the structure anticipates; the generality appears to be preemptive rather than deliberate.

---

## Patterns to **not** flag

- **Interface or abstract class used in tests as a mock target** — testability is a concrete present use, not speculation. If the interface is injected and swapped in tests, the abstraction has a current consumer.
- **A second implementation is present in the same diff** — even if one implementation exists today, adding a second in the same PR justifies the abstraction retroactively.
- **Library or framework extension points** — a class designed to be extended by library consumers (e.g., a base `Controller`, an abstract `Middleware`) has external consumers the diff cannot see.
- **Public API surface for an exported package** — a library exporting a generic type or an interface for user implementations cannot be analyzed for "no current consumer" within the local codebase.
- **Generic with a meaningful constraint that carries behavior** — `function max<T extends Comparable>(a: T, b: T)` uses the constraint to express a real requirement. The type parameter is not purely speculative even if only one type is currently passed.
- **Optional parameter in a function called from outside the visible codebase** — an exported function's options may be used by callers in other packages.