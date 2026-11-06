## kth-largest-element-in-a-stream

### Walkthrough
**Goal:** after each insertion, report the k-th largest.

1. Keep a **min-heap containing exactly the k largest values** seen so far.
2. The heap's top is the smallest of those k → by definition the k-th largest overall.
3. `add(val)`: push; if size exceeds k, pop the top (it's no longer among the k largest).

**Dry run** `k = 3`, initial `[4, 5, 8, 2]`, then add 3, 5, 10, 9, 4:

| op | heap (k largest) | top = answer |
|---|---|---|
| init | {4, 5, 8} (2 popped) | |
| add 3 | {4,5,8} (3 popped) | 4 |
| add 5 | {5,5,8} | 5 |
| add 10 | {5,8,10} | 5 |
| add 9 | {8,9,10} | 8 |
| add 4 | {8,9,10} | 8 |

## last-stone-weight

### Walkthrough
**Goal:** repeatedly take the two heaviest stones — the max-heap's job.

1. Heapify all stones into a max-heap (O(n) from a range).
2. While ≥ 2 stones: pop `a` (heaviest), pop `b` (second). If `a != b`, push `a − b`.
3. Return the remaining stone or 0.

**Dry run** `[2, 7, 4, 1, 8, 1]`:

| heap (max first) | smash | push |
|---|---|---|
| 8,7,4,2,1,1 | 8 vs 7 | 1 |
| 4,2,1,1,1 | 4 vs 2 | 2 |
| 2,1,1,1 | 2 vs 1 | 1 |
| 1,1,1 | 1 vs 1 | — |
| 1 | done | **1** |

## k-closest-points-to-origin

### Walkthrough
**Goal:** the k smallest distances; full sorting is unnecessary.

1. Compare **squared** distances — same order, no `sqrt`, exact integers.
2. `nth_element(begin, begin + k, end, cmp)` rearranges so that the first k elements are the k smallest (in arbitrary order), using quickselect: average O(n).
3. Return those k.

**Quickselect idea, dry run** on distances `[10, 2, 13, 5]` (points), k = 2:

| step | pivot | partition | kept side |
|---|---|---|---|
| 1 | 10 | [2, 5] [10] [13] | left part has 2 elements = k → done |

Result: points with distances 2 and 5.

## kth-largest-element-in-an-array

### Walkthrough
**Goal:** k-th largest without fully sorting.

1. Keep a **min-heap of the k largest** elements seen.
2. Push each number; if the heap grows past k, pop the smallest.
3. After all numbers, the heap holds the k largest; its top (the smallest of them) is the k-th largest.

**Dry run** `[3, 2, 1, 5, 6, 4]`, `k = 2`:

| x | heap after push | pop? | heap |
|---|---|---|---|
| 3 | {3} | no | {3} |
| 2 | {2,3} | no | {2,3} |
| 1 | {1,2,3} | pop 1 | {2,3} |
| 5 | {2,3,5} | pop 2 | {3,5} |
| 6 | {3,5,6} | pop 3 | {5,6} |
| 4 | {4,5,6} | pop 4 | {5,6} |

Top = **5**.

## task-scheduler

### Walkthrough
**Goal:** minimum length when identical tasks must be ≥ n apart.

1. Let `mx` = highest frequency, `numMax` = how many tasks have that frequency.
2. Lay out the most frequent task `mx` times with gaps of n between them: there are `mx − 1` full frames of size `n + 1`, plus a final partial frame containing all `numMax` tasks.
3. `frame = (mx − 1)(n + 1) + numMax`.
4. Other tasks fill the idle slots. If there are more tasks than slots, no idling is needed at all → the answer is `tasks.size()`.
5. Answer = `max(frame, tasks.size())`.

**Dry run** `tasks = [A,A,A,B,B,B]`, `n = 2`: `mx = 3`, `numMax = 2`.

```text
A B _ | A B _ | A B
frame = (3-1)*(2+1) + 2 = 8
```

Answer **8**. With `n = 0`: frame = 2·1 + 2 = 4 < 6 → **6** (no idle).

## design-twitter

### Walkthrough
**Goal:** the 10 most recent tweets among the user and their followees = **merge k sorted lists**, stopping after 10.

1. Each user's tweets are stored in posting order, so each list is sorted by time (newest at the back).
2. Seed a max-heap with the newest tweet of each relevant user: `(time, tweetId, user, index)`.
3. Pop the newest; add it to the feed; push that same user's previous tweet (`index − 1`).
4. Stop after 10 or when the heap is empty.

**Dry run:** user 1 posted t0 (id 5), t2 (id 7); user 2 posted t1 (id 6), t3 (id 8); user 1 follows 2.

| heap (time) | pop | push |
|---|---|---|
| {t2(u1), t3(u2)} | t3 → id 8 | t1(u2) |
| {t2, t1} | t2 → id 7 | t0(u1) |
| {t1, t0} | t1 → id 6 | — |
| {t0} | t0 → id 5 | — |

Feed `[8, 7, 6, 5]`.

## find-median-from-data-stream

### Walkthrough
**Goal:** median in O(1) while numbers stream in.

1. `lo`: **max-heap** with the smaller half. `hi`: **min-heap** with the larger half.
2. **Invariants:** every element of `lo` ≤ every element of `hi`; `lo.size()` is equal to or one more than `hi.size()`.
3. `addNum(x)`: push to `lo`, then move `lo`'s max to `hi` (this fixes the ordering invariant), then if `hi` became bigger, move its min back to `lo` (fixes the size invariant).
4. `findMedian`: odd count → `lo.top()`; even → average of both tops.

**Dry run** add 5, 15, 1, 3:

| add | lo (max-heap) | hi (min-heap) | median |
|---|---|---|---|
| 5 | {5} | {} | 5 |
| 15 | {5} | {15} | 10 |
| 1 | {1, 5} | {15} | 5 |
| 3 | {1, 3} | {5, 15} | (3+5)/2 = 4 |

(For "add 3": push to lo → {1,3,5}; move 5 to hi → {5,15}; sizes 2/2 OK.)
