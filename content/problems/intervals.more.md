## merge-intervals

### Approach 1: Sweep line over start/end events
```cpp
class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& iv) {
        vector<pair<int, int>> ev;                  // (coordinate, +1 start / -1 end)
        for (auto& v : iv) { ev.push_back({v[0], +1}); ev.push_back({v[1], -1}); }
        ranges::sort(ev, [](auto& a, auto& b) {
            return a.first != b.first ? a.first < b.first : a.second > b.second;   // starts before ends at a tie
        });
        vector<vector<int>> out;
        int open = 0, start = 0;
        for (auto [x, d] : ev) {
            if (open == 0 && d == +1) start = x;   // a merged block begins
            open += d;
            if (open == 0) out.push_back({start, x});
        }
        return out;
    }
};
```

**Time:** O(n log n) · **Space:** O(n). Processing starts before ends at equal coordinates merges touching intervals like `[1,4],[4,5]`.

### Approach 2: Brute force — repeatedly merge any overlapping pair
```cpp
class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& iv) {
        vector<vector<int>> v = iv;
        bool changed = true;
        while (changed) {
            changed = false;
            for (size_t i = 0; i < v.size() && !changed; ++i)
                for (size_t j = i + 1; j < v.size() && !changed; ++j)
                    if (v[i][0] <= v[j][1] && v[j][0] <= v[i][1]) {          // overlap test
                        v[i] = {min(v[i][0], v[j][0]), max(v[i][1], v[j][1])};
                        v.erase(v.begin() + j);
                        changed = true;
                    }
        }
        return v;
    }
};
```

**Time:** O(n³) · **Space:** O(n). Shows the general overlap test `a.start ≤ b.end && b.start ≤ a.end`.

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

### Approach 1: Append and run Merge Intervals
```cpp
class Solution {
public:
    vector<vector<int>> insert(vector<vector<int>>& iv, vector<int>& nw) {
        iv.push_back(nw);
        ranges::sort(iv);
        vector<vector<int>> out;
        for (auto& v : iv) {
            if (out.empty() || out.back()[1] < v[0]) out.push_back(v);
            else out.back()[1] = max(out.back()[1], v[1]);
        }
        return out;
    }
};
```

**Time:** O(n log n) · **Space:** O(n). Reuses a known solution — fine as a first answer, then optimise.

### Approach 2: Binary search for the overlap range
```cpp
class Solution {
public:
    vector<vector<int>> insert(vector<vector<int>>& iv, vector<int>& nw) {
        // first interval that ends at/after nw.start, first that starts after nw.end
        auto lo = ranges::lower_bound(iv, nw[0], {}, [](const vector<int>& v) { return v[1]; });
        auto hi = ranges::upper_bound(iv, nw[1], {}, [](const vector<int>& v) { return v[0]; });
        vector<int> merged = nw;
        if (lo < hi) {                                   // [lo, hi) overlap the new interval
            merged[0] = min(merged[0], (*lo)[0]);
            merged[1] = max(merged[1], (*(hi - 1))[1]);
        }
        vector<vector<int>> out(iv.begin(), lo);
        out.push_back(merged);
        out.insert(out.end(), hi, iv.end());
        return out;
    }
};
```

**Time:** O(log n) to find the range (O(n) to build the output) · **Space:** O(n). Ranges projections make the searches one-liners.

### Walkthrough
**Goal:** insert into a sorted, disjoint list and merge in one pass.

1. **Before:** copy intervals that end before the new one starts (`end < nw.start`).
2. **Overlap:** while intervals start at or before the new one ends (`start ≤ nw.end`), absorb them: `nw.start = min(...)`, `nw.end = max(...)`.
3. Append the merged `nw`.
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

### Approach 1: Sort by start, drop the one that ends later on overlap
```cpp
class Solution {
public:
    int eraseOverlapIntervals(vector<vector<int>>& iv) {
        ranges::sort(iv);
        int removed = 0, prevEnd = iv[0][1];
        for (size_t i = 1; i < iv.size(); ++i) {
            if (iv[i][0] < prevEnd) {                  // overlap: remove one of the two
                ++removed;
                prevEnd = min(prevEnd, iv[i][1]);      // keep the one ending first
            } else prevEnd = iv[i][1];
        }
        return removed;
    }
};
```

**Time:** O(n log n) · **Space:** O(1). Equivalent greedy, different sort key.

### Approach 2: DP — longest chain of non-overlapping intervals (LIS-style)
```cpp
class Solution {
public:
    int eraseOverlapIntervals(vector<vector<int>>& iv) {
        ranges::sort(iv);
        int n = iv.size();
        vector<int> dp(n, 1);                         // dp[i] = max kept ending with interval i
        for (int i = 0; i < n; ++i)
            for (int j = 0; j < i; ++j)
                if (iv[j][1] <= iv[i][0]) dp[i] = max(dp[i], dp[j] + 1);
        return n - *ranges::max_element(dp);
    }
};
```

**Time:** O(n²) · **Space:** O(n). Correct but TLE for 10⁵ — shows why greedy matters.

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

### Approach 1: Check every pair
```cpp
class Solution {
public:
    bool canAttendMeetings(vector<vector<int>>& iv) {
        for (size_t i = 0; i < iv.size(); ++i)
            for (size_t j = i + 1; j < iv.size(); ++j)
                if (iv[i][0] < iv[j][1] && iv[j][0] < iv[i][1]) return false;   // half-open overlap
        return true;
    }
};
```

**Time:** O(n²) · **Space:** O(1).

### Approach 2: Sort by end, compare neighbours
```cpp
class Solution {
public:
    bool canAttendMeetings(vector<vector<int>>& iv) {
        ranges::sort(iv, {}, [](const vector<int>& v) { return v[1]; });
        for (size_t i = 1; i < iv.size(); ++i)
            if (iv[i][0] < iv[i - 1][1]) return false;
        return true;
    }
};
```

**Time:** O(n log n) · **Space:** O(1). Either sort key works for this yes/no question.

### Walkthrough
**Goal:** are all meetings disjoint?

1. Sort by start time.
2. If any meeting starts before the previous one ends, they overlap → false.
3. Meetings that touch (`[1,5]`, `[5,8]`) are fine — the end time is exclusive.

**Dry run** `[[0,30],[5,10],[15,20]]` → sorted the same; `5 < 30` → **false**. `[[7,10],[2,4]]` → sorted `[[2,4],[7,10]]`; `7 ≥ 4` → **true**.

## meeting-rooms-ii

### Approach 1: Min-heap of end times
```cpp
class Solution {
public:
    int minMeetingRooms(vector<vector<int>>& iv) {
        ranges::sort(iv);                                       // by start
        priority_queue<int, vector<int>, greater<>> ends;       // end times of rooms in use
        for (auto& m : iv) {
            if (!ends.empty() && ends.top() <= m[0]) ends.pop();   // reuse the room freed earliest
            ends.push(m[1]);
        }
        return ends.size();
    }
};
```

**Time:** O(n log n) · **Space:** O(n). Also tells you *which* room frees up next — useful for assigning rooms.

### Approach 2: Difference array / sweep map
```cpp
class Solution {
public:
    int minMeetingRooms(vector<vector<int>>& iv) {
        map<int, int> delta;                          // time -> change in rooms needed
        for (auto& m : iv) { ++delta[m[0]]; --delta[m[1]]; }
        int cur = 0, best = 0;
        for (auto& [t, d] : delta) { cur += d; best = max(best, cur); }   // ends at t cancel starts at t
        return best;
    }
};
```

**Time:** O(n log n) · **Space:** O(n). Summing deltas at the same timestamp first correctly lets a room be reused.

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

### Approach 1: Brute force per query
```cpp
class Solution {
public:
    vector<int> minInterval(vector<vector<int>>& iv, vector<int>& queries) {
        vector<int> ans;
        for (int q : queries) {
            int best = INT_MAX;
            for (auto& v : iv)
                if (v[0] <= q && q <= v[1]) best = min(best, v[1] - v[0] + 1);
            ans.push_back(best == INT_MAX ? -1 : best);
        }
        return ans;
    }
};
```

**Time:** O(n · q) · **Space:** O(1). TLE at 10⁵ × 10⁵.

### Approach 2: Process intervals by size with "next free query" union-find
```cpp
class Solution {
public:
    vector<int> minInterval(vector<vector<int>>& iv, vector<int>& queries) {
        int q = queries.size();
        vector<int> order(q);
        iota(order.begin(), order.end(), 0);
        ranges::sort(order, {}, [&](int i) { return queries[i]; });
        vector<int> sortedQ(q);
        for (int i = 0; i < q; ++i) sortedQ[i] = queries[order[i]];
        ranges::sort(iv, {}, [](const vector<int>& v) { return v[1] - v[0]; });   // smallest first
        vector<int> nxt(q + 1);                                // next unanswered sorted-query index
        iota(nxt.begin(), nxt.end(), 0);
        auto find = [&](int x) { while (nxt[x] != x) x = nxt[x] = nxt[nxt[x]]; return x; };
        vector<int> ans(q, -1);
        for (auto& v : iv) {
            int i = find(ranges::lower_bound(sortedQ, v[0]) - sortedQ.begin());
            while (i < q && sortedQ[i] <= v[1]) {
                ans[order[i]] = v[1] - v[0] + 1;               // smallest interval answers it first
                nxt[i] = i + 1;                                // skip answered query forever
                i = find(i + 1);
            }
        }
        return ans;
    }
};
```

**Time:** O((n + q) log + q·α) · **Space:** O(q). Each query is answered once, by the smallest interval covering it.

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
