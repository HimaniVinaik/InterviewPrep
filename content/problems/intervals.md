# Intervals

**Recognise it when:** inputs are `[start, end]` pairs — meetings, bookings, ranges, timelines.

**Toolkit**
- **Sort by start** to merge/insert; **sort by end** for "max non-overlapping" (greedy activity selection).
- Two intervals `[a,b]` and `[c,d]` overlap iff `a <= d && c <= b` (adjust for open/closed ends).
- **Sweep line:** turn intervals into `+1` at start / `-1` at end events, sort, scan → max concurrency.
- A min-heap of end times tracks "rooms currently in use".

## Merge Intervals
- difficulty: Medium
- leetcode: 56
- slug: merge-intervals

Merge all overlapping intervals.

```text
[[1,3],[2,6],[8,10],[15,18]] -> [[1,6],[8,10],[15,18]]
```

### Hint
After sorting by start, an interval overlaps the last merged one iff its start ≤ last end.

### Solution
```cpp
class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& iv) {
        ranges::sort(iv);                                // lexicographic: by start
        vector<vector<int>> out;
        for (auto& cur : iv) {
            if (out.empty() || out.back()[1] < cur[0]) out.push_back(cur);
            else out.back()[1] = max(out.back()[1], cur[1]);
        }
        return out;
    }
};
```

### Explanation
Sorting makes overlap a local property between consecutive intervals. `max` handles nested intervals (`[1,10]` swallowing `[2,3]`).

**Time:** O(n log n) · **Space:** O(n)

## Insert Interval
- difficulty: Medium
- leetcode: 57
- slug: insert-interval

Insert `newIv` into a sorted, non-overlapping list, merging as needed.

### Hint
Three phases: intervals entirely before, overlapping (merge), entirely after.

### Solution
```cpp
class Solution {
public:
    vector<vector<int>> insert(vector<vector<int>>& iv, vector<int>& nw) {
        vector<vector<int>> out;
        size_t i = 0, n = iv.size();
        while (i < n && iv[i][1] < nw[0]) out.push_back(iv[i++]);          // before
        while (i < n && iv[i][0] <= nw[1]) {                                // overlap
            nw[0] = min(nw[0], iv[i][0]);
            nw[1] = max(nw[1], iv[i][1]);
            ++i;
        }
        out.push_back(nw);
        while (i < n) out.push_back(iv[i++]);                               // after
        return out;
    }
};
```

### Explanation
Since the input is already sorted, a linear scan suffices — no re-sorting.

**Time:** O(n) · **Space:** O(n)

## Non-overlapping Intervals
- difficulty: Medium
- leetcode: 435
- slug: non-overlapping-intervals

Return the minimum number of intervals to remove so the rest don't overlap.

### Hint
Keep the maximum number of non-overlapping intervals: greedily pick the one that **ends earliest**.

### Solution
```cpp
class Solution {
public:
    int eraseOverlapIntervals(vector<vector<int>>& iv) {
        ranges::sort(iv, {}, [](const auto& v) { return v[1]; });   // projection: sort by end
        int keep = 0, lastEnd = INT_MIN;
        for (auto& v : iv)
            if (v[0] >= lastEnd) { ++keep; lastEnd = v[1]; }
        return iv.size() - keep;
    }
};
```

### Explanation
Classic activity selection: finishing earliest leaves the most room for the rest (exchange argument). Note the C++20 **ranges projection** `{}, proj` — sort by a member without writing a comparator.

**Time:** O(n log n) · **Space:** O(1)

## Meeting Rooms
- difficulty: Easy
- leetcode: 252
- slug: meeting-rooms

Can a person attend all meetings?

### Hint
Sort by start; check each meeting starts after the previous ends.

### Solution
```cpp
class Solution {
public:
    bool canAttendMeetings(vector<vector<int>>& iv) {
        ranges::sort(iv);
        for (size_t i = 1; i < iv.size(); ++i)
            if (iv[i][0] < iv[i - 1][1]) return false;
        return true;
    }
};
```

### Explanation
Any overlap must show up between neighbours after sorting.

**Time:** O(n log n) · **Space:** O(1)

## Meeting Rooms II
- difficulty: Medium
- leetcode: 253
- slug: meeting-rooms-ii

Minimum number of conference rooms required.

### Hint
Max number of meetings in progress at once. Sweep sorted starts and ends with two pointers.

### Solution
```cpp
class Solution {
public:
    int minMeetingRooms(vector<vector<int>>& iv) {
        vector<int> s, e;
        for (auto& v : iv) { s.push_back(v[0]); e.push_back(v[1]); }
        ranges::sort(s); ranges::sort(e);
        int rooms = 0, best = 0;
        for (size_t i = 0, j = 0; i < s.size(); ++i) {
            while (j < e.size() && e[j] <= s[i]) { --rooms; ++j; }  // free rooms first
            best = max(best, ++rooms);
        }
        return best;
    }
};
```

### Explanation
Starts and ends can be sorted independently — we only care about counts. Processing ends `<= start` first lets a room be reused when one meeting ends exactly as another begins. Heap version: min-heap of end times; pop when `top <= start`; answer = max heap size.

**Time:** O(n log n) · **Space:** O(n)

## Minimum Interval to Include Each Query
- difficulty: Hard
- leetcode: 1851
- slug: minimum-interval-to-include-each-query

For each query `q`, return the size (`r - l + 1`) of the smallest interval containing `q`, or -1.

### Hint
Sort intervals by start and queries ascending (remember original indices). Push intervals that started; pop those that already ended; top of a min-heap by size is the answer.

### Solution
```cpp
class Solution {
public:
    vector<int> minInterval(vector<vector<int>>& iv, vector<int>& queries) {
        ranges::sort(iv);
        vector<int> order(queries.size());
        iota(order.begin(), order.end(), 0);
        ranges::sort(order, {}, [&](int i) { return queries[i]; });
        // (size, end)
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
        vector<int> ans(queries.size(), -1);
        size_t i = 0;
        for (int qi : order) {
            int q = queries[qi];
            while (i < iv.size() && iv[i][0] <= q) {
                pq.emplace(iv[i][1] - iv[i][0] + 1, iv[i][1]);
                ++i;
            }
            while (!pq.empty() && pq.top().second < q) pq.pop();   // lazy deletion
            if (!pq.empty()) ans[qi] = pq.top().first;
        }
        return ans;
    }
};
```

### Explanation
**Offline queries:** answering in sorted order lets a sweep reuse work. **Lazy deletion:** we don't remove expired intervals eagerly; we discard them only when they reach the top.

**Time:** O((n + q) log n) · **Space:** O(n + q)
