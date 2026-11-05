## kth-largest-element-in-a-stream

### Approach 1: Keep a sorted vector
```cpp
class KthLargest {
    int k;
    vector<int> v;                                     // sorted ascending
public:
    KthLargest(int k, vector<int>& nums) : k(k), v(nums) { ranges::sort(v); }
    int add(int val) {
        v.insert(upper_bound(v.begin(), v.end(), val), val);   // O(n) shift
        return v[v.size() - k];
    }
};
```

**Time:** add O(n) · **Space:** O(n). Stores everything — the heap only needs k elements.

### Approach 2: Multiset of the k largest
```cpp
class KthLargest {
    int k;
    multiset<int> s;
public:
    KthLargest(int k, vector<int>& nums) : k(k) { for (int x : nums) add(x); }
    int add(int val) {
        s.insert(val);
        if ((int)s.size() > k) s.erase(s.begin());     // drop the smallest
        return *s.begin();
    }
};
```

**Time:** O(log k) · **Space:** O(k). Same idea as the heap; a balanced BST also supports deletions if the problem extended to them.

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

### Approach 1: Sort every round
```cpp
class Solution {
public:
    int lastStoneWeight(vector<int>& stones) {
        while (stones.size() > 1) {
            ranges::sort(stones);
            int a = stones.back(); stones.pop_back();
            int b = stones.back(); stones.pop_back();
            if (a != b) stones.push_back(a - b);
        }
        return stones.empty() ? 0 : stones[0];
    }
};
```

**Time:** O(n² log n) · **Space:** O(1).

### Approach 2: Bucket counts (weights ≤ 1000)
```cpp
class Solution {
public:
    int lastStoneWeight(vector<int>& stones) {
        int maxW = *ranges::max_element(stones);
        vector<int> cnt(maxW + 1, 0);
        for (int s : stones) ++cnt[s];
        int w = maxW, carry = 0;                     // carry = heaviest unmatched stone so far
        while (w > 0) {
            if (cnt[w] == 0) { --w; continue; }
            if (carry == 0) {                        // pair stones of equal weight
                if (cnt[w] % 2) carry = w;
                cnt[w] = 0; --w;
            } else {                                 // smash carry with one stone of weight w
                --cnt[w];
                int d = carry - w;
                carry = 0;
                if (d > 0) {
                    if (d > w) carry = d;            // still the heaviest: keep carrying it
                    else ++cnt[d];                   // otherwise drop it back into its bucket
                }
            }
        }
        return carry;
    }
};
```

**Time:** O(n + W) · **Space:** O(W). A counting-sort style solution when weights are bounded.

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

### Approach 1: Sort by distance
```cpp
class Solution {
public:
    vector<vector<int>> kClosest(vector<vector<int>>& pts, int k) {
        ranges::sort(pts, {}, [](const vector<int>& p) { return p[0] * p[0] + p[1] * p[1]; });
        return {pts.begin(), pts.begin() + k};
    }
};
```

**Time:** O(n log n) · **Space:** O(log n).

### Approach 2: Max-heap of size k
```cpp
class Solution {
public:
    vector<vector<int>> kClosest(vector<vector<int>>& pts, int k) {
        priority_queue<pair<int, int>> pq;                 // (dist², index), farthest on top
        for (int i = 0; i < (int)pts.size(); ++i) {
            pq.emplace(pts[i][0] * pts[i][0] + pts[i][1] * pts[i][1], i);
            if ((int)pq.size() > k) pq.pop();              // evict the farthest
        }
        vector<vector<int>> out;
        while (!pq.empty()) { out.push_back(pts[pq.top().second]); pq.pop(); }
        return out;
    }
};
```

**Time:** O(n log k) · **Space:** O(k). Best for streaming points.

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

### Approach 1: Sort
```cpp
class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        ranges::sort(nums, greater<>{});
        return nums[k - 1];
    }
};
```

**Time:** O(n log n) · **Space:** O(log n).

### Approach 2: Quickselect (hand-written, random pivot, 3-way partition)
```cpp
class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        int target = nums.size() - k;                     // index in ascending order
        int lo = 0, hi = nums.size() - 1;
        mt19937 rng(42);
        while (true) {
            int pivot = nums[uniform_int_distribution<int>(lo, hi)(rng)];
            // Dutch national flag: [lo, lt) < pivot, [lt, gt] == pivot, (gt, hi] > pivot
            int lt = lo, i = lo, gt = hi;
            while (i <= gt) {
                if (nums[i] < pivot) swap(nums[lt++], nums[i++]);
                else if (nums[i] > pivot) swap(nums[i], nums[gt--]);
                else ++i;
            }
            if (target < lt) hi = lt - 1;
            else if (target > gt) lo = gt + 1;
            else return pivot;
        }
    }
};
```

**Time:** O(n) average · **Space:** O(1). The 3-way partition avoids O(n²) on arrays full of duplicates.

### Approach 3: Counting (values bounded to ±10⁴)
```cpp
class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        const int OFF = 10000;
        vector<int> cnt(20001, 0);
        for (int x : nums) ++cnt[x + OFF];
        for (int v = 20000; v >= 0; --v) {
            k -= cnt[v];
            if (k <= 0) return v - OFF;
        }
        return -1;
    }
};
```

**Time:** O(n + range) · **Space:** O(range).

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

### Approach 1: Greedy simulation with a max-heap + cooldown queue
```cpp
class Solution {
public:
    int leastInterval(vector<char>& tasks, int n) {
        array<int, 26> f{};
        for (char t : tasks) ++f[t - 'A'];
        priority_queue<int> ready;                    // remaining counts, most first
        for (int c : f) if (c) ready.push(c);
        queue<pair<int, int>> cooling;                // (remaining count, time it becomes ready)
        int time = 0;
        while (!ready.empty() || !cooling.empty()) {
            ++time;
            if (!ready.empty()) {
                int c = ready.top() - 1; ready.pop();
                if (c) cooling.push({c, time + n});
            }
            if (!cooling.empty() && cooling.front().second == time) {
                ready.push(cooling.front().first); cooling.pop();
            }
        }
        return time;
    }
};
```

**Time:** O(T · log 26) · **Space:** O(26). Produces an actual schedule; generalises to variants (e.g. print the order).

### Approach 2: Frame counting per round
```cpp
class Solution {
public:
    int leastInterval(vector<char>& tasks, int n) {
        array<int, 26> f{};
        for (char t : tasks) ++f[t - 'A'];
        int time = 0;
        while (true) {
            ranges::sort(f, greater<>{});
            if (f[0] == 0) break;
            int slot = 0;
            for (int i = 0; i <= n; ++i) {            // one frame of n+1 slots
                if (f[0] == 0) break;
                if (i < 26 && f[i] > 0) { --f[i]; ++slot; }
                ++time;
                if (all_of(f.begin(), f.end(), [](int x) { return x == 0; })) return time;
            }
        }
        return time;
    }
};
```

**Time:** O(T · 26 log 26) · **Space:** O(1). Each round fills a frame of n+1 slots with the most frequent remaining tasks.

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

### Approach 1: Collect all candidate tweets and sort
```cpp
class Twitter {
    int timer = 0;
    unordered_map<int, vector<pair<int, int>>> tweets;     // user -> (time, id)
    unordered_map<int, unordered_set<int>> follows;
public:
    void postTweet(int u, int id) { tweets[u].emplace_back(timer++, id); }
    vector<int> getNewsFeed(int u) {
        vector<pair<int, int>> all = tweets[u];
        for (int f : follows[u]) if (f != u) all.insert(all.end(), tweets[f].begin(), tweets[f].end());
        int k = min<int>(10, all.size());
        partial_sort(all.begin(), all.begin() + k, all.end(), greater<>{});   // 10 newest
        vector<int> feed;
        for (int i = 0; i < k; ++i) feed.push_back(all[i].second);
        return feed;
    }
    void follow(int a, int b) { if (a != b) follows[a].insert(b); }
    void unfollow(int a, int b) { follows[a].erase(b); }
};
```

**Time:** feed O(T log 10) where T = all tweets of followees · **Space:** O(T) temporary. Simple; wasteful for prolific users.

### Approach 2: Same, but only the last 10 tweets per user
Since a feed never shows more than 10 tweets, each user's contribution can be capped at their 10 most recent — copy `min(10, size)` from the end of each vector. Time drops to O(F · 10 log 10). Storing only the last 10 tweets per user (a ring buffer) also bounds memory if older tweets are never needed.

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

### Approach 1: Sorted vector with insertion
```cpp
class MedianFinder {
    vector<int> v;
public:
    void addNum(int x) { v.insert(upper_bound(v.begin(), v.end(), x), x); }     // O(n)
    double findMedian() {
        size_t n = v.size();
        return n % 2 ? v[n / 2] : (v[n / 2 - 1] + (double)v[n / 2]) / 2.0;
    }
};
```

**Time:** add O(n) (binary search + shifting), median O(1) · **Space:** O(n). Often fine in practice thanks to `memmove` speed.

### Approach 2: Multiset with a median iterator
```cpp
class MedianFinder {
    multiset<int> s;
    multiset<int>::iterator mid;                      // lower median
public:
    void addNum(int x) {
        s.insert(x);
        if (s.size() == 1) { mid = s.begin(); return; }
        if (s.size() % 2 == 0) { if (x < *mid) --mid; }   // even: lower median may shift left
        else { if (x >= *mid) ++mid; }                    // odd: median may shift right
    }
    double findMedian() {
        if (s.size() % 2) return *mid;
        return (*mid + (double)*next(mid)) / 2.0;
    }
};
```

**Time:** O(log n) add · **Space:** O(n). Equal values are inserted after existing equals (upper bound), which keeps the iterator logic consistent. Supports removals too (sliding-window median).

### Approach 3: Counting buckets (bounded values)
If all numbers are in [0, 100], keep `cnt[101]` and walk the buckets to find the middle: O(1) add, O(100) median. A common follow-up.

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
