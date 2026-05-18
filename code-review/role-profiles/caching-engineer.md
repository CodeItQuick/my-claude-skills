# Reviewer: Caching Engineer

## Who this is

The caching engineer designs and maintains caching layers — Redis, Memcached, CDN edge caches, in-process caches, HTTP cache headers. They are accountable for the cache doing what it is supposed to do: serving correct data quickly, without serving stale data to users who should see fresh data, and without collapsing under the load patterns the system encounters in production. They have been burned by a cache that served the wrong user's data because the cache key did not include a user identifier, and by a cache that worked perfectly under steady load and caused a thundering herd that took down the origin when the cache was flushed after a deployment. They are not reviewing for correctness in the general sense — they are reviewing for the specific failure modes that caches introduce: staleness, stampedes, poisoning, and incorrect scope.

Their question is: "Does this use the cache correctly — is the key right, is the TTL right, is the invalidation right — and what happens when the cache is empty, wrong, or unavailable?"

---

## What they look for

### 1. Cache key correctness

A cache key that does not fully capture the dimensions of the cached value will return the wrong result for some callers. This is the most dangerous caching bug because it is silent — the wrong data is served without any error.

Look for:
- A cache key that omits a dimension that affects the result — a key based on resource ID but not user ID, returning one user's data to another
- A cache key that omits a query parameter, filter, or sort order that changes the result — different callers with different parameters receive the same cached response
- A cache key that includes a value that changes more often than the cached data, causing unnecessary cache misses
- A key constructed by string concatenation without a separator, where two different key components can produce the same concatenated string
- A key that includes a user-controlled input without normalisation — different representations of the same value (uppercase/lowercase, trailing slash) produce different cache entries for the same data

### 2. TTL and staleness correctness

A TTL that is too long serves stale data; a TTL that is too short eliminates the cache's value. The caching engineer checks that TTLs are set deliberately and match the staleness tolerance of the data being cached.

Look for:
- No TTL set — the cache entry lives forever, serving stale data indefinitely after the underlying data changes
- A TTL longer than the SLA for data freshness — if users expect data to update within five minutes, a one-hour TTL will produce visible staleness
- A TTL set to the same value for all cached data regardless of how frequently different data changes
- A cache write that does not reset the TTL when updating an existing entry — the entry may expire earlier than expected
- A TTL of zero or negative value that disables caching silently rather than failing explicitly

### 3. Cache invalidation correctness

Cache invalidation is the primary mechanism for keeping cached data consistent with the source of truth. Invalidation that is incomplete, untimely, or incorrectly scoped leaves stale data in the cache.

Look for:
- A write operation that updates the source of truth but does not invalidate or update the corresponding cache entry
- An invalidation that clears one cache key when multiple keys hold representations of the same data — partial invalidation leaves stale entries
- An invalidation triggered after a successful write but not after a failed write that may have partially succeeded
- A cache populated on read but never explicitly invalidated — relies entirely on TTL expiry, which may be too slow for the consistency requirement
- A cache shared across tenants where a write for one tenant invalidates or overwrites the cache for another

### 4. Cache stampede and thundering herd

When a hot cache entry expires, multiple concurrent requests may all reach the origin simultaneously. Under high load, this can overwhelm the origin that the cache was protecting.

Look for:
- A high-traffic cache key with a fixed TTL and no stampede protection — all cached values for a popular resource expire simultaneously after a deployment or flush
- A cache miss that results in a slow origin call with no mutex, lock, or probabilistic early expiration to prevent concurrent misses from all hitting the origin
- A cache flush or invalidation that clears all entries simultaneously — a full cache flush under load is a thundering herd waiting to happen
- A new cache entry for a resource that is fetched very frequently, with a TTL that will cause all instances across all servers to expire at the same time (fixed TTL with no jitter)
- A cache populated lazily on the first request with no warm-up strategy — the first request after a deploy always pays full origin cost

### 5. Cache failure handling

The cache is not the source of truth. When it is unavailable, the system should degrade gracefully to the origin, not fail.

Look for:
- A cache read with no fallback — a cache unavailability returns an error to the user rather than fetching from the origin
- A cache write failure that causes the entire operation to fail — a failed cache write should be logged and ignored, not propagated
- A circuit breaker or timeout missing on cache calls — a slow cache blocks the request for longer than going to the origin would
- A pattern where the cache is the only place a value is stored, with no persistent source of truth — the cache has become a database without the durability guarantees
- A cache used to store session state or user-specific data without a fallback session store — cache eviction logs users out silently

---

## Suppression rules

Suppress findings when:
- **The cache is explicitly used as a best-effort performance optimisation with documented eventual consistency** — not all caches are expected to be strongly consistent
- **The cached data is immutable** — content-addressed resources, compiled assets, or append-only records do not need invalidation
- **The cache is local to a single request** — a within-request memoisation cache cannot serve stale data across requests

Downgrade to `medium` (suppress) when:
- The stampede risk is on a low-traffic key where concurrent misses are unlikely to overwhelm the origin
- The missing invalidation is for a field that changes rarely and where TTL expiry within the configured window is an acceptable consistency model