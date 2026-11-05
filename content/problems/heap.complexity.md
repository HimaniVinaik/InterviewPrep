## kth-largest-element-in-a-stream
### Complexity
**Time, step by step**
- **Constructor:** n calls to `add` → O(n log k).
- **add:** one `push` O(log k) + at most one `pop` O(log k) on a heap of size ≤ k + 1 → **O(log k)**.
- **Reading the answer:** `top()` → O(1).

**Space:** the heap never exceeds k + 1 elements → **O(k)**.

## last-stone-weight
### Complexity
**Time, step by step**
1. Heapify from a range: **O(n)** (bottom-up heap construction, not n log n).
2. Each round pops twice and pushes at most once: O(log n).
3. Each round removes at least one stone, so there are at most n − 1 rounds.
4. Total: O(n) + O(n log n) = **O(n log n)**.

**Space:** heap of n stones → **O(n)**.

## k-closest-points-to-origin
### Complexity
**Time, step by step**
1. `nth_element` (introselect) partitions around pivots, recursing into only one side: expected n + n/2 + n/4 + … = **O(n)** average, with O(n log n) worst-case fallback in typical implementations.
2. Each comparison computes two squared distances → O(1).
3. Copying k points out: O(k).
4. Total: **O(n)** average.

**Space:** in-place partitioning → **O(1)** extra (output excluded).

**Comparison:** max-heap of size k is O(n log k) time, O(k) space — the right choice for a stream of points.

## kth-largest-element-in-an-array
### Complexity
**Time, step by step**
1. For each of the n numbers: `push` O(log k), and when the heap exceeds k, `pop` O(log k).
2. Total: **O(n log k)**. With k close to n this approaches O(n log n); with k = 1 it's O(n).

**Space:** heap of at most k + 1 → **O(k)**.

**Comparison:** quickselect is O(n) average / O(n²) worst (random pivots make the worst case very unlikely), O(1) space; counting is O(n + range).

## task-scheduler
### Complexity
**Time, step by step** (T = number of tasks)
1. Counting frequencies: O(T).
2. `max_element` and `count` over 26 letters: O(26) = O(1).
3. The frame formula: O(1).
4. Total: **O(T)**.

**Space:** `array<int, 26>` → **O(1)**.

**Comparison:** the heap simulation is O(answer · log 26) — it actually walks through every time slot, including idle ones.

## design-twitter
### Complexity
**Time, step by step** (F = number of followees, T = tweets per user)
- **postTweet:** `emplace_back` → amortised **O(1)**.
- **follow / unfollow:** hash-set insert/erase → average **O(1)**.
- **getNewsFeed:**
  1. Seed the heap with one tweet per relevant user: O(F log F).
  2. Pop at most 10 times, each followed by at most one push: O(10 log F).
  3. Total: **O(F log F)** — independent of how many tweets each user has posted.

**Space:**
- All tweets: O(total tweets). Follow graph: O(total follow edges).
- Per feed request: heap of ≤ F + 1 entries → O(F).

## find-median-from-data-stream
### Complexity
**Time, step by step**
- **addNum:** push to `lo` (O(log n)), move `lo.top()` to `hi` (pop + push, O(log n)), maybe move one back (O(log n)) → a constant number of heap operations → **O(log n)**.
- **findMedian:** reads one or two heap tops → **O(1)**.

**Space:** every number is stored once, in one of the two heaps → **O(n)**.

**Comparison:** sorted vector is O(n) per insertion (shifting) but O(1) median; multiset with a median iterator is O(log n) insertion and also supports deletion (sliding-window median).
