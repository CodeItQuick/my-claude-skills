# A held read needs a wait for the state that it checks

**Rule:** In an e2e test, a one-time read held in a variable is correct only
when an awaited step before it waits for the same state that the read checks.

**Apply it:** What, before this read, waits for the state that the read
checks?

- An awaited step waits for that same state: a web-first matcher, a helper that
  ends on one, or a `locator` read of a value that is fixed once the element
  attaches. Keep the read.
- Nothing, or only a fixed sleep: poll the read with `expect.poll`.
- The read wants one moment of a transition: observe that moment, for example
  with a `MutationObserver`. A poll and a one-time read both miss it.

`locator.evaluate` waits for its element. `page.evaluate` does not wait, and
that difference often decides the class.

**Backed in code:** the `held` warning in `scripts/validate-tests.mjs` finds
the candidates. It exempts a read that comes after an awaited `expect`.

**Evidence:** software_testing-14 and -15 (strong) say that async wait is a
main cause of flaky JavaScript tests. They grade the failure, not the deciding
question. software_testing-59 (moderate) grades the detector.

**Found by:** a `page.evaluate` ran right after `goto`, but the app mounted
only after an asynchronous sign-in setup. With sign-in configured, the mount
came after `load`, so the read raced the mount. The same count found a read
after a fixed sleep and an 80 ms transition probe. This repository's instance
is in `.claude/writing-tests/found-by.md`, where that file exists.

**Why no script:** the past hits, from snapshots across the fix commits in the
source repository:

| Class | Count |
|---|---|
| Race: nothing waits for the state before the read | 1 |
| Waited only by a fixed sleep | 1 |
| Transient sample: the read wants one moment of a transition | 1 |
| Waited by an earlier step that the validator cannot see | 3 |
| Locator read of a value fixed once the element attaches | 1 |

The script is right 3 times in 7. It cannot see that a helper such as
`completeCheckout` ends on a visible element, so it cannot tell a waited read
from a race.
