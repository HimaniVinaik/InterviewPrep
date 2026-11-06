## merge-intervals

### Walkthrough
**Goal:** merge all overlapping intervals.

1. **Sort by start.** Now an interval can only overlap the *last merged* interval — anything earlier ended even sooner.
2. For each interval:
   1. If `out` is empty or `out.back().end < cur.start` → no overlap → append.
   2. Else overlap → extend: `out.back().end = max(out.back().end, cur.end)` (the `max` handles nested intervals).

**Dry run** `[[1,3],[2,6],[8,10],[15,18]]`:

| cur | last merged | overlap? | out |
|---|---|---|---|
| [1,3] | — | — | [1,3] |
| [2,6] | [1,3] | 2 ≤ 3 yes | [1,6] |
| [8,10] | [1,6] | no | [1,6],[8,10] |
| [15,18] | [8,10] | no | …,[15,18] |

## insert-interval

### Walkthrough
**Goal:** insert into a sorted, disjoint list and merge in one pass.

1. **Before:** copy intervals that end before the new one starts (`end < newInterval.start`).
2. **Overlap:** while intervals start at or before the new one ends (`start ≤ newInterval.end`), absorb them: `newInterval.start = min(...)`, `newInterval.end = max(...)`.
3. Append the merged `newInterval`.
4. **After:** copy the rest.

**Dry run** `[[1,2],[3,5],[6,7],[8,10],[12,16]]`, new `[4,8]`:

| interval | phase | new interval |
|---|---|---|
| [1,2] | before (2 < 4) | [4,8] |
| [3,5] | overlap | [3,8] |
| [6,7] | overlap | [3,8] |
| [8,10] | overlap (8 ≤ 8) | [3,10] |
| [12,16] | after | — |

Result `[[1,2],[3,10],[12,16]]`.

## non-overlapping-intervals

### Walkthrough
**Goal:** remove the fewest intervals so none overlap ⇔ **keep the most** non-overlapping intervals (activity selection).

1. Sort by **end** time.
2. Greedily keep an interval if it starts at or after the end of the last kept one.
3. **Why earliest end?** Among all choices for the first interval, the one ending earliest leaves the most room for the rest — swapping any optimal first choice for it can never reduce the count (exchange argument).
4. Answer = total − kept.

**Dry run** `[[1,2],[2,3],[3,4],[1,3]]` → by end: `[1,2],[2,3],[1,3],[3,4]`:

| interval | lastEnd | keep? | lastEnd after |
|---|---|---|---|
| [1,2] | −∞ | yes | 2 |
| [2,3] | 2 | yes (2 ≥ 2) | 3 |
| [1,3] | 3 | no | 3 |
| [3,4] | 3 | yes | 4 |

Kept 3 of 4 → remove **1**.

## meeting-rooms

### Walkthrough
**Goal:** are all meetings disjoint?

1. Sort by start time.
2. If any meeting starts before the previous one ends, they overlap → false.
3. Meetings that touch (`[1,5]`, `[5,8]`) are fine — the end time is exclusive.

**Dry run** `[[0,30],[5,10],[15,20]]` → sorted the same; `5 < 30` → **false**. `[[7,10],[2,4]]` → sorted `[[2,4],[7,10]]`; `7 ≥ 4` → **true**.

## meeting-rooms-ii

### Walkthrough
**Goal:** the maximum number of meetings happening at the same time.

1. Sort start times and end times **separately** — we only care about counts.
2. Walk through starts in order. Before counting a meeting that starts at `s`, release all rooms whose meetings ended at or before `s` (pointer `j` over sorted ends).
3. `rooms` = currently occupied; track the max.

**Dry run** `[[0,30],[5,10],[15,20]]`: starts `[0,5,15]`, ends `[10,20,30]`:

| start | ends ≤ start released | rooms | best |
|---|---|---|---|
| 0 | none | 1 | 1 |
| 5 | none | 2 | 2 |
| 15 | 10 | 2 | 2 |

Answer **2**.

## minimum-interval-to-include-each-query

### Walkthrough
**Goal:** for each query point, the smallest interval containing it.

1. **Offline:** sort intervals by start, and queries by value (remember original indices).
2. Sweep queries in increasing order. For the current query `q`:
   1. Push every interval with `start ≤ q` into a min-heap keyed by **size** (also store its end).
   2. Pop from the heap while the top's `end < q` — it can't contain this or any later query (lazy deletion).
   3. The heap top (if any) is the smallest interval containing `q`.

**Dry run** intervals `[[1,4],[2,4],[3,6],[4,4]]`, queries `[2,3,4,5]`:

| query | pushed | popped (ended) | top (size) | answer |
|---|---|---|---|---|
| 2 | [1,4](4), [2,4](3) | — | [2,4] | 3 |
| 3 | [3,6](4) | — | [2,4] | 3 |
| 4 | [4,4](1) | — | [4,4] | 1 |
| 5 | — | [4,4], [2,4], [1,4] | [3,6] | 4 |
