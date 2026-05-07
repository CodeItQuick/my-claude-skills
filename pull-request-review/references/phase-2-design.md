# Phase 2 — Design

Assess whether the approach is sound before diving into implementation details. A correct implementation of the wrong design still needs to be called out.

## Questions to Ask

- Does the change solve the right problem, or does it paper over a symptom?
- Is the abstraction level appropriate — not over-engineered for the problem, not under-engineered for the scale?
- Are responsibilities correctly separated? Does each function/module/class do one thing?
- Does the change introduce unnecessary coupling between components that should be independent?
- Is the change doing too much work that should be delegated to the framework, library, or database?
- Are there simpler approaches that would achieve the same result with less code or less risk?
- Does the change fit the existing architecture, or does it cut against established patterns in the codebase?
- Is mutable state introduced where immutable state would work?

## APIs and Interfaces

Pay extra attention to public-facing boundaries — function signatures, HTTP endpoints, event schemas, exported types. These are expensive to change later. Ask:

- Is the interface stable and sensible given likely future use?
- Does the naming accurately reflect what the interface does?
- Are inputs and outputs typed or validated at the boundary?

---

Design findings belong here even when the implementation is technically correct. Flag them before the author invests further in the wrong approach.