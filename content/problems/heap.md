# Heap / Priority Queue

**Recognise it when:** "k largest/smallest/closest", "merge k sorted", "schedule the next task", "running median", or you repeatedly need the current min/max of a changing set.

**C++ cheat sheet**

```cpp
priority_queue<int> maxHeap;                              // largest on top
priority_queue<int, vector<int>, greater<>> minHeap;      // smallest on top
auto cmp = [](const P& a, const P& b) { return a.d > b.d; };
priority_queue<P, vector<P>, decltype(cmp)> pq(cmp);      // custom
// Or build in O(n): make_heap / push_heap / pop_heap on a vector
```

- **Top-k largest → min-heap of size k** (pop when size > k). The top is the k-th largest.
- Push/pop: O(log n); top: O(1); heapify: O(n).
- `std::nth_element` gives the k-th element in average O(n) if you don't need streaming.

## Kth Largest Element in a Stream
- difficulty: Easy
- leetcode: 703
- slug: kth-largest-element-in-a-stream

Design a class that returns the k-th largest element after each `add(val)`.

### Hint
Keep a min-heap of the k largest so far.

### Solution
```cpp
class KthLargest {
    int k;
    priority_queue<int, vector<int>, greater<>> pq;   // min-heap of size <= k
public:
    KthLargest(int k, vector<int>& nums) : k(k) {
        for (int x : nums) add(x);
    }
    int add(int val) {
        pq.push(val);
        if ((int)pq.size() > k) pq.pop();
        return pq.top();
    }
};
```

### Explanation
The heap holds exactly the k largest elements seen; the smallest of those (top) is the k-th largest overall.

**Time:** O(log k) per add · **Space:** O(k)

## Last Stone Weight
- difficulty: Easy
- leetcode: 1046
- slug: last-stone-weight

Repeatedly smash the two heaviest stones: equal → both destroyed; else the difference remains. Return the last stone's weight (or 0).

### Hint
Max-heap simulation.

### Solution
```cpp
class Solution {
public:
    int lastStoneWeight(vector<int>& stones) {
        priority_queue<int> pq(stones.begin(), stones.end());   // O(n) heapify
        while (pq.size() > 1) {
            int a = pq.top(); pq.pop();
            int b = pq.top(); pq.pop();
            if (a != b) pq.push(a - b);
        }
        return pq.empty() ? 0 : pq.top();
    }
};
```

### Explanation
Constructing a `priority_queue` from a range heapifies in O(n), cheaper than n pushes.

**Time:** O(n log n) · **Space:** O(n)

## K Closest Points to Origin
- difficulty: Medium
- leetcode: 973
- slug: k-closest-points-to-origin

Return the `k` points closest to `(0,0)`.

### Hint
Compare squared distances (no `sqrt`). Max-heap of size k, or `nth_element`.

### Solution
```cpp
class Solution {
public:
    vector<vector<int>> kClosest(vector<vector<int>>& pts, int k) {
        auto d2 = [](const vector<int>& p) { return p[0] * p[0] + p[1] * p[1]; };
        nth_element(pts.begin(), pts.begin() + k, pts.end(),
                    [&](const auto& a, const auto& b) { return d2(a) < d2(b); });
        return {pts.begin(), pts.begin() + k};
    }
};
```

### Explanation
`nth_element` (introselect) partially partitions so that the first k elements are the k smallest — average O(n). The heap approach (O(n log k)) is better for streams. Squared distance preserves ordering and avoids floating point.

**Time:** O(n) average · **Space:** O(1)

## Kth Largest Element in an Array
- difficulty: Medium
- leetcode: 215
- slug: kth-largest-element-in-an-array

Find the k-th largest element (not necessarily distinct).

### Hint
Quickselect — or a size-k min-heap.

### Solution
```cpp
class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        priority_queue<int, vector<int>, greater<>> pq;
        for (int x : nums) {
            pq.push(x);
            if ((int)pq.size() > k) pq.pop();
        }
        return pq.top();
    }
};
```

### Explanation
Heap: O(n log k), predictable. Quickselect (`nth_element(nums.begin(), nums.begin()+k-1, nums.end(), greater<>())`) averages O(n) but can degrade without good pivots — be ready to implement Lomuto/Hoare partition by hand.

**Time:** O(n log k) · **Space:** O(k)

## Task Scheduler
- difficulty: Medium
- leetcode: 621
- slug: task-scheduler

Tasks (letters) must be separated by at least `n` intervals if identical. Return the minimum total intervals (idle allowed).

### Hint
The most frequent task dictates the frame: `(maxFreq - 1) * (n + 1) + countOfMaxFreq`.

### Solution
```cpp
class Solution {
public:
    int leastInterval(vector<char>& tasks, int n) {
        array<int, 26> f{};
        for (char t : tasks) ++f[t - 'A'];
        int mx = *ranges::max_element(f);
        int numMax = ranges::count(f, mx);
        int frame = (mx - 1) * (n + 1) + numMax;
        return max(frame, (int)tasks.size());
    }
};
```

### Explanation
Lay out the most frequent task with `n` gaps: `A _ _ A _ _ A`. Other tasks fill gaps; if there are more tasks than gaps, no idle time is needed and the answer is just `tasks.size()`. A max-heap + cooldown queue simulation also works (O(total · log 26)) and generalises better.

**Time:** O(n) · **Space:** O(1)

## Design Twitter
- difficulty: Medium
- leetcode: 355
- slug: design-twitter

Implement `postTweet`, `getNewsFeed` (10 most recent tweets from self + followees), `follow`, `unfollow`.

### Hint
Each user's tweets are already time-sorted → merge k sorted lists with a heap, stopping at 10.

### Solution
```cpp
class Twitter {
    int timer = 0;
    unordered_map<int, vector<pair<int, int>>> tweets;   // user -> [(time, id)]
    unordered_map<int, unordered_set<int>> follows;
public:
    void postTweet(int user, int id) { tweets[user].emplace_back(timer++, id); }

    vector<int> getNewsFeed(int user) {
        // heap entries: (time, tweetId, ownerUser, indexInOwnerVector)
        using T = tuple<int, int, int, int>;
        priority_queue<T> pq;
        auto addUser = [&](int u) {
            auto it = tweets.find(u);
            if (it != tweets.end() && !it->second.empty()) {
                int i = it->second.size() - 1;
                pq.emplace(it->second[i].first, it->second[i].second, u, i);
            }
        };
        addUser(user);
        for (int f : follows[user]) if (f != user) addUser(f);
        vector<int> feed;
        while (!pq.empty() && feed.size() < 10) {
            auto [t, id, u, i] = pq.top(); pq.pop();
            feed.push_back(id);
            if (i > 0) pq.emplace(tweets[u][i - 1].first, tweets[u][i - 1].second, u, i - 1);
        }
        return feed;
    }
    void follow(int a, int b)   { if (a != b) follows[a].insert(b); }
    void unfollow(int a, int b) { follows[a].erase(b); }
};
```

### Explanation
This is a mini "news feed" system design: fan-out-on-read via k-way merge. Discuss the trade-off with fan-out-on-write (precomputed timelines) for celebrities with millions of followers — see the HLD case studies.

**Time:** feed O(F + 10 log F) · **Space:** O(tweets + edges)

## Find Median from Data Stream
- difficulty: Hard
- leetcode: 295
- slug: find-median-from-data-stream

Support `addNum(x)` and `findMedian()`.

### Hint
Two heaps: a max-heap for the lower half and a min-heap for the upper half, balanced in size.

### Solution
```cpp
class MedianFinder {
    priority_queue<int> lo;                              // max-heap, lower half
    priority_queue<int, vector<int>, greater<>> hi;      // min-heap, upper half
public:
    void addNum(int x) {
        lo.push(x);
        hi.push(lo.top()); lo.pop();                     // keep every lo <= every hi
        if (hi.size() > lo.size()) { lo.push(hi.top()); hi.pop(); }  // lo may have +1
    }
    double findMedian() {
        return lo.size() > hi.size() ? lo.top() : (lo.top() + (double)hi.top()) / 2.0;
    }
};
```

### Explanation
Routing every number through `lo` then `hi` maintains the ordering invariant; the rebalance keeps sizes within one. Median is the top of `lo` (odd count) or the average of both tops. Cast to `double` *before* adding to avoid int overflow.

**Time:** add O(log n), median O(1) · **Space:** O(n)
