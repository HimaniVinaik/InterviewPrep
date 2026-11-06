## merge-intervals

### Approach 1: Brute force — repeatedly merge any overlapping pair
**The idea:** keep scanning for two intervals that overlap, merge them, and start again; stop when no pair overlaps.

```cpp
class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        vector<vector<int>> list = intervals;
        bool mergedSomething = true;

        while (mergedSomething) {
            mergedSomething = false;
            for (int i = 0; i < (int)list.size() && !mergedSomething; i++) {
                for (int j = i + 1; j < (int)list.size(); j++) {
                    // Two intervals overlap if each starts before the other ends.
                    if (list[i][0] <= list[j][1] && list[j][0] <= list[i][1]) {
                        list[i][0] = min(list[i][0], list[j][0]);
                        list[i][1] = max(list[i][1], list[j][1]);
                        list.erase(list.begin() + j);   // j is now part of i
                        mergedSomething = true;
                        break;
                    }
                }
            }
        }
        sort(list.begin(), list.end());
        return list;
    }
};
```

**How it works:** each merge removes one interval, so it stops after at most n merges.

**Think of it like this:** shuffling through a pile of calendar slots again and again, gluing together any two that overlap.

**Cost:** Time **O(n³)** worst case. Space **O(n)**.

### Approach 2: Sweep line over start/end events
**The idea:** turn each interval into a "+1 at start" and "−1 at end" event. Walking events in order, a merged interval begins when the count goes 0 → 1 and ends when it goes back to 0.

```cpp
class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        // (position, type): type 0 = start, 1 = end. Starts sort first at the same
        // position, so touching intervals like [1,4] and [4,5] merge.
        vector<pair<int, int>> events;
        for (const vector<int>& iv : intervals) {
            events.push_back({iv[0], 0});
            events.push_back({iv[1], 1});
        }
        sort(events.begin(), events.end());

        vector<vector<int>> out;
        int open = 0;            // how many intervals are currently "open"
        int start = 0;
        for (const pair<int, int>& e : events) {
            if (e.second == 0) {
                if (open == 0) {
                    start = e.first;           // a new merged interval begins
                }
                open++;
            } else {
                open--;
                if (open == 0) {
                    out.push_back({start, e.first});   // it ends here
                }
            }
        }
        return out;
    }
};
```

**How it works:** the counter says how many intervals cover the current point.

**Think of it like this:** counting how many people are in a room as they enter and leave; the room is "busy" from the first entry until it's empty again.

**Cost:** Time **O(n log n)**. Space **O(n)**.

### Optimal: Sort by start, then extend or append
**The idea:** after sorting by start, an interval can only overlap the last merged interval. Either extend it or start a new one.

```cpp
class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        // Sort by start time (vectors compare element by element).
        sort(intervals.begin(), intervals.end());

        vector<vector<int>> out;
        for (const vector<int>& cur : intervals) {
            if (out.empty() || out.back()[1] < cur[0]) {
                // No overlap with the last merged interval: start a new one.
                out.push_back(cur);
            } else {
                // Overlap: stretch the last merged interval's end if needed.
                // (max handles intervals completely inside it.)
                out.back()[1] = max(out.back()[1], cur[1]);
            }
        }
        return out;
    }
};
```

**How it works**
1. Sort by start.
2. If the current interval starts after the last merged one ends → append.
3. Otherwise extend the last merged interval's end with `max`.

**Think of it like this:** laying calendar blocks on a timeline from left to right; each new block either sticks to the previous one or starts a new group.

**Why it's optimal:** sorting dominates at O(n log n); the merge pass is linear.

**Cost:** Time **O(n log n)**. Space **O(n)** for the output (O(log n) sorting).

## insert-interval

### Approach 1: Append, then run Merge Intervals
**The idea:** add the new interval to the list and reuse the merge algorithm.

```cpp
class Solution {
public:
    vector<vector<int>> insert(vector<vector<int>>& intervals, vector<int>& newInterval) {
        vector<vector<int>> all = intervals;
        all.push_back(newInterval);
        sort(all.begin(), all.end());

        vector<vector<int>> out;
        for (const vector<int>& cur : all) {
            if (out.empty() || out.back()[1] < cur[0]) {
                out.push_back(cur);
            } else {
                out.back()[1] = max(out.back()[1], cur[1]);
            }
        }
        return out;
    }
};
```

**How it works:** correct, but sorting ignores that the list is already sorted.

**Think of it like this:** adding one book to a sorted shelf and then re-sorting the whole shelf.

**Cost:** Time **O(n log n)**. Space **O(n)**.

### Approach 2: Binary search for the overlap range
**The idea:** the list is sorted and disjoint, so binary search finds the first interval that could overlap and the first that starts after the new one ends.

```cpp
class Solution {
public:
    vector<vector<int>> insert(vector<vector<int>>& intervals, vector<int>& newInterval) {
        int n = intervals.size();

        // lo = first interval whose end >= newInterval start (may overlap).
        int lo = 0;
        int hi = n;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (intervals[mid][1] < newInterval[0]) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        int first = lo;

        // last = first interval whose start > newInterval end (no overlap after this).
        lo = first;
        hi = n;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (intervals[mid][0] <= newInterval[1]) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        int last = lo;

        // Everything in [first, last) overlaps the new interval: merge them.
        int start = newInterval[0];
        int end = newInterval[1];
        if (first < last) {
            start = min(start, intervals[first][0]);
            end = max(end, intervals[last - 1][1]);
        }

        vector<vector<int>> out(intervals.begin(), intervals.begin() + first);
        out.push_back({start, end});
        out.insert(out.end(), intervals.begin() + last, intervals.end());
        return out;
    }
};
```

**How it works:** two binary searches find the overlap block; copying is still O(n).

**Think of it like this:** using the index of a sorted book to jump straight to the right pages.

**Cost:** Time **O(n)** (O(log n) to locate, O(n) to build the output). Space **O(n)**.

### Optimal: One pass in three phases — before, overlap, after
**The idea:** walk the sorted list once: copy intervals that end before the new one, absorb all that overlap, then copy the rest.

```cpp
class Solution {
public:
    vector<vector<int>> insert(vector<vector<int>>& intervals, vector<int>& newInterval) {
        vector<vector<int>> out;
        int i = 0;
        int n = intervals.size();

        // 1. Before: intervals that end before the new one starts.
        while (i < n && intervals[i][1] < newInterval[0]) {
            out.push_back(intervals[i]);
            i++;
        }

        // 2. Overlap: intervals that start before (or when) the new one ends.
        while (i < n && intervals[i][0] <= newInterval[1]) {
            newInterval[0] = min(newInterval[0], intervals[i][0]);   // grow left
            newInterval[1] = max(newInterval[1], intervals[i][1]);   // grow right
            i++;
        }
        out.push_back(newInterval);

        // 3. After: everything that's left starts after the new one ends.
        while (i < n) {
            out.push_back(intervals[i]);
            i++;
        }
        return out;
    }
};
```

**How it works**
1. **Before:** `end < newInterval.start` → copy.
2. **Overlap:** `start ≤ newInterval.end` → widen `newInterval`.
3. Append `newInterval`, then copy the rest.

**Think of it like this:** inserting a new booking into a sorted schedule — earlier bookings stay, clashing ones fuse with it, later ones stay.

**Why it's optimal:** one linear pass, which is required anyway to build the output.

**Cost:** Time **O(n)**. Space **O(n)** for the output.

## non-overlapping-intervals

### Approach 1: Sort by start; on overlap, drop the one that ends later
**The idea:** walk intervals by start. When two overlap, remove one — the one that ends later, since it blocks more of the future.

```cpp
class Solution {
public:
    int eraseOverlapIntervals(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end());
        int removed = 0;
        int lastEnd = intervals[0][1];      // end of the last interval we kept

        for (int i = 1; i < (int)intervals.size(); i++) {
            if (intervals[i][0] < lastEnd) {
                removed++;                                  // overlap: remove one
                lastEnd = min(lastEnd, intervals[i][1]);    // keep the one ending sooner
            } else {
                lastEnd = intervals[i][1];                  // no overlap: keep it
            }
        }
        return removed;
    }
};
```

**How it works:** equivalent to the optimal greedy, but expressed as "which one to throw away".

**Think of it like this:** when two meetings clash, cancel the one that runs longer into the day.

**Cost:** Time **O(n log n)**. Space **O(1)**.

### Approach 2: DP — longest chain of non-overlapping intervals
**The idea:** after sorting, `best[i]` = most intervals you can keep ending with interval i. The answer is `n − max(best)`.

```cpp
class Solution {
public:
    int eraseOverlapIntervals(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end());
        int n = intervals.size();
        vector<int> best(n, 1);           // each interval alone is a chain of 1
        int longest = 1;

        for (int i = 1; i < n; i++) {
            for (int j = 0; j < i; j++) {
                if (intervals[j][1] <= intervals[i][0]) {
                    best[i] = max(best[i], best[j] + 1);   // extend j's chain with i
                }
            }
            longest = max(longest, best[i]);
        }
        return n - longest;
    }
};
```

**How it works:** like Longest Increasing Subsequence, where "increasing" means "starts after the previous ends".

**Think of it like this:** trying every possible "previous meeting" for each meeting.

**Cost:** Time **O(n²)**. Space **O(n)**.

### Optimal: Greedy by earliest end (activity selection)
**The idea:** removing the fewest = keeping the most. Always keep the interval that ends earliest — it leaves the most room for the rest.

```cpp
class Solution {
public:
    int eraseOverlapIntervals(vector<vector<int>>& intervals) {
        // Sort by END time.
        sort(intervals.begin(), intervals.end(),
             [](const vector<int>& a, const vector<int>& b) {
                 return a[1] < b[1];
             });

        int keep = 0;
        int lastEnd = INT_MIN;           // end of the last interval we kept
        for (const vector<int>& iv : intervals) {
            if (iv[0] >= lastEnd) {
                keep++;                  // fits after the last kept one
                lastEnd = iv[1];
            }
            // else: it overlaps, so we drop it.
        }
        return intervals.size() - keep;
    }
};
```

**How it works**
1. Sort by end time.
2. Keep an interval if it starts at or after `lastEnd`.
3. Answer = total − kept.
4. **Why earliest end:** swapping any optimal first choice for the earliest-ending interval never reduces how many fit afterwards.

**Think of it like this:** packing your day with as many meetings as possible — always pick the one that finishes soonest.

**Why it's optimal:** a proven greedy (exchange argument), O(n log n) from sorting.

**Cost:** Time **O(n log n)**. Space **O(1)** extra.

## meeting-rooms

### Approach 1: Check every pair
**The idea:** two meetings clash if each starts before the other ends.

```cpp
class Solution {
public:
    bool canAttendMeetings(vector<vector<int>>& intervals) {
        int n = intervals.size();
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                bool overlap = intervals[i][0] < intervals[j][1] &&
                               intervals[j][0] < intervals[i][1];
                if (overlap) {
                    return false;
                }
            }
        }
        return true;
    }
};
```

**How it works:** the overlap test uses strict `<` so touching meetings (`[1,5]`, `[5,8]`) are allowed.

**Think of it like this:** comparing every meeting with every other meeting in your calendar.

**Cost:** Time **O(n²)**. Space **O(1)**.

### Approach 2: Sort by end, compare neighbours
**The idea:** after sorting by end time, if meeting i starts before meeting i−1 ends, they clash.

```cpp
class Solution {
public:
    bool canAttendMeetings(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end(),
             [](const vector<int>& a, const vector<int>& b) {
                 return a[1] < b[1];
             });
        for (int i = 1; i < (int)intervals.size(); i++) {
            if (intervals[i][0] < intervals[i - 1][1]) {
                return false;
            }
        }
        return true;
    }
};
```

**How it works:** sorting by end works too: if there's any clash, some neighbouring pair clashes.

**Think of it like this:** listing meetings by when they finish and checking each against the one before.

**Cost:** Time **O(n log n)**. Space **O(1)**.

### Optimal: Sort by start, compare neighbours
**The idea:** after sorting by start, only neighbours can overlap first.

```cpp
class Solution {
public:
    bool canAttendMeetings(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end());     // by start time
        for (int i = 1; i < (int)intervals.size(); i++) {
            // Starts before the previous meeting ends → you can't attend both.
            if (intervals[i][0] < intervals[i - 1][1]) {
                return false;
            }
        }
        return true;
    }
};
```

**How it works**
1. Sort by start.
2. Any meeting starting before the previous one ends → overlap.
3. Touching meetings are fine (end time is exclusive).

**Think of it like this:** reading your calendar from morning to night and checking you're free when each meeting begins.

**Why it's optimal:** sorting is the main cost; the check is one pass.

**Cost:** Time **O(n log n)**. Space **O(1)** extra.

## meeting-rooms-ii

### Approach 1: Min-heap of end times
**The idea:** process meetings by start time; keep a min-heap of end times of rooms in use. If the earliest-ending room is free, reuse it.

```cpp
class Solution {
public:
    int minMeetingRooms(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end());          // by start
        priority_queue<int, vector<int>, greater<int>> ends;   // end times of busy rooms

        for (const vector<int>& m : intervals) {
            if (!ends.empty() && ends.top() <= m[0]) {
                ends.pop();               // the earliest room is free again: reuse it
            }
            ends.push(m[1]);              // this meeting occupies a room until m[1]
        }
        return ends.size();               // rooms ever needed at once
    }
};
```

**How it works:** the heap's size is the number of rooms in use; it only grows when no room is free.

**Think of it like this:** a receptionist who checks which room frees up first before opening a new one.

**Cost:** Time **O(n log n)**. Space **O(n)**.

### Approach 2: Sweep map of +1 / −1 changes
**The idea:** +1 at every start, −1 at every end; the largest running total is the answer.

```cpp
class Solution {
public:
    int minMeetingRooms(vector<vector<int>>& intervals) {
        map<int, int> change;            // time → change in the number of busy rooms
        for (const vector<int>& m : intervals) {
            change[m[0]]++;
            change[m[1]]--;              // same-time end and start cancel out: room reused
        }
        int rooms = 0;
        int best = 0;
        for (const pair<const int, int>& entry : change) {
            rooms += entry.second;
            best = max(best, rooms);
        }
        return best;
    }
};
```

**How it works:** `map` keeps times sorted; summing changes gives rooms in use at each time.

**Think of it like this:** a turnstile counter — +1 when someone enters, −1 when someone leaves.

**Cost:** Time **O(n log n)**. Space **O(n)**.

### Optimal: Two sorted arrays (starts and ends) with two pointers
**The idea:** we only need counts, not which meeting is which. Sort starts and ends separately; for each start, first release rooms whose meetings have ended.

```cpp
class Solution {
public:
    int minMeetingRooms(vector<vector<int>>& intervals) {
        vector<int> starts;
        vector<int> ends;
        for (const vector<int>& m : intervals) {
            starts.push_back(m[0]);
            ends.push_back(m[1]);
        }
        sort(starts.begin(), starts.end());
        sort(ends.begin(), ends.end());

        int rooms = 0;      // rooms busy right now
        int best = 0;       // the most rooms busy at once
        int j = 0;          // next meeting end to process
        for (int i = 0; i < (int)starts.size(); i++) {
            // Free every room whose meeting ended at or before this start.
            while (j < (int)ends.size() && ends[j] <= starts[i]) {
                rooms--;
                j++;
            }
            rooms++;                        // this meeting takes a room
            best = max(best, rooms);
        }
        return best;
    }
};
```

**How it works**
1. Sort starts and ends separately.
2. Before counting a meeting starting at `s`, release rooms that ended by `s`.
3. Track the maximum number of busy rooms.

**Think of it like this:** a list of "people arriving" times and "people leaving" times — you only need to know how many are inside at the busiest moment.

**Why it's optimal:** O(n log n) sorting with a tiny constant and O(n) simple arrays — no heap or map.

**Cost:** Time **O(n log n)**. Space **O(n)**.

## minimum-interval-to-include-each-query

### Approach 1: Brute force per query
**The idea:** for each query, check every interval and keep the smallest one that contains it.

```cpp
class Solution {
public:
    vector<int> minInterval(vector<vector<int>>& intervals, vector<int>& queries) {
        vector<int> ans;
        for (int q : queries) {
            int best = -1;
            for (const vector<int>& iv : intervals) {
                if (iv[0] <= q && q <= iv[1]) {
                    int size = iv[1] - iv[0] + 1;
                    if (best == -1 || size < best) {
                        best = size;
                    }
                }
            }
            ans.push_back(best);
        }
        return ans;
    }
};
```

**How it works:** direct check of the definition.

**Think of it like this:** for every address, checking every delivery zone on the map.

**Cost:** Time **O(n · q)**. Space **O(1)** extra.

### Approach 2: Smallest intervals first, assign each query once
**The idea:** process intervals from smallest to largest. Each interval answers every *still unanswered* query inside it. A "next unanswered query" union-find skips answered ones quickly.

```cpp
class Solution {
public:
    vector<int> minInterval(vector<vector<int>>& intervals, vector<int>& queries) {
        int m = queries.size();
        // Sorted distinct query values; nextFree[i] = first unanswered index >= i.
        vector<int> values = queries;
        sort(values.begin(), values.end());
        values.erase(unique(values.begin(), values.end()), values.end());
        int k = values.size();
        nextFree.resize(k + 1);
        for (int i = 0; i <= k; i++) {
            nextFree[i] = i;
        }
        vector<int> answerFor(k, -1);

        // Smallest intervals first.
        vector<vector<int>> sorted = intervals;
        sort(sorted.begin(), sorted.end(), [](const vector<int>& a, const vector<int>& b) {
            return a[1] - a[0] < b[1] - b[0];
        });

        for (const vector<int>& iv : sorted) {
            int size = iv[1] - iv[0] + 1;
            // First query value >= interval start.
            int idx = lower_bound(values.begin(), values.end(), iv[0]) - values.begin();
            idx = find(idx);
            while (idx < k && values[idx] <= iv[1]) {
                answerFor[idx] = size;        // the smallest interval covering this query
                nextFree[idx] = idx + 1;      // mark answered
                idx = find(idx + 1);
            }
        }

        vector<int> ans(m);
        for (int i = 0; i < m; i++) {
            int idx = lower_bound(values.begin(), values.end(), queries[i]) - values.begin();
            ans[i] = answerFor[idx];
        }
        return ans;
    }

private:
    vector<int> nextFree;

    int find(int x) {
        while (nextFree[x] != x) {
            nextFree[x] = nextFree[nextFree[x]];
            x = nextFree[x];
        }
        return x;
    }
};
```

**How it works:** each query is answered exactly once, by the first (smallest) interval that covers it.

**Think of it like this:** handing out the smallest umbrellas first; anyone who already has an umbrella is skipped.

**Cost:** Time **O(n log n + q log q)**. Space **O(q)**.

### Optimal: Sort both + sweep with a min-heap by size
**The idea:** answer queries in increasing order. Add intervals that have started; throw away intervals that have already ended; the smallest remaining one is the answer.

```cpp
class Solution {
public:
    vector<int> minInterval(vector<vector<int>>& intervals, vector<int>& queries) {
        sort(intervals.begin(), intervals.end());          // by start

        // Process queries from small to large, remembering where each came from.
        vector<int> order(queries.size());
        for (int i = 0; i < (int)order.size(); i++) {
            order[i] = i;
        }
        sort(order.begin(), order.end(), [&](int a, int b) {
            return queries[a] < queries[b];
        });

        // Min-heap of (size, end): the smallest interval is on top.
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
        vector<int> ans(queries.size(), -1);
        int i = 0;                                          // next interval to add

        for (int qi : order) {
            int q = queries[qi];

            // Add every interval that starts at or before q.
            while (i < (int)intervals.size() && intervals[i][0] <= q) {
                int size = intervals[i][1] - intervals[i][0] + 1;
                pq.push({size, intervals[i][1]});
                i++;
            }
            // Drop intervals that ended before q. They can't contain any later query either.
            while (!pq.empty() && pq.top().second < q) {
                pq.pop();
            }
            if (!pq.empty()) {
                ans[qi] = pq.top().first;                   // smallest interval containing q
            }
        }
        return ans;
    }
};
```

**How it works**
1. Sort intervals by start, queries by value (keeping original indices).
2. For query `q`: push intervals with `start ≤ q`; pop tops with `end < q` (lazy deletion).
3. The heap top is the smallest interval containing `q`.

**Think of it like this:** walking along a street; at each house you pick up the zones that have started and drop the ones you've walked past, and look at the smallest zone in your hand.

**Why it's optimal:** every interval is pushed and popped at most once.

**Cost:** Time **O(n log n + q log q)**. Space **O(n + q)**.
