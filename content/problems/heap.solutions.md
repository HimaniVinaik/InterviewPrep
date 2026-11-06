## kth-largest-element-in-a-stream

### Approach 1: Keep every value in a sorted vector
**The idea:** keep all values sorted (largest first); the k-th largest is at index `k − 1`.

```cpp
class KthLargest {
public:
    KthLargest(int k, vector<int>& nums) {
        this->k = k;
        for (int x : nums) {
            insertSorted(x);
        }
    }

    int add(int val) {
        insertSorted(val);
        return values[k - 1];          // values is sorted from largest to smallest
    }

private:
    int k;
    vector<int> values;                // descending order

    void insertSorted(int x) {
        // Find the first position whose value is smaller than x, and insert before it.
        auto pos = upper_bound(values.begin(), values.end(), x, greater<int>());
        values.insert(pos, x);
    }
};
```

**How it works:** binary search finds the spot in O(log n), but `insert` shifts everything after it.

**Think of it like this:** a leaderboard where every new score is slotted into its exact place.

**Cost:** `add` **O(n)** (shifting). Space **O(n)** — keeps values we'll never need.

### Approach 2: A multiset holding only the k largest
**The idea:** a balanced tree (`multiset`) that never holds more than k values; its smallest element is the answer.

```cpp
class KthLargest {
public:
    KthLargest(int k, vector<int>& nums) {
        this->k = k;
        for (int x : nums) {
            add(x);
        }
    }

    int add(int val) {
        top.insert(val);
        if ((int)top.size() > k) {
            top.erase(top.begin());     // drop the smallest: it's not in the top k
        }
        return *top.begin();            // smallest of the k largest = k-th largest
    }

private:
    int k;
    multiset<int> top;                  // sorted ascending, at most k values
};
```

**How it works:** the set always holds the current top k; `begin()` is the smallest of them.

**Think of it like this:** a VIP room with k seats — when someone better arrives, the weakest person leaves.

**Cost:** `add` **O(log k)**. Space **O(k)**.

### Optimal: Min-heap of size k
**The idea:** exactly Approach 2's idea, with a min-heap — simpler and faster in practice because we only ever need the smallest of the k.

```cpp
class KthLargest {
public:
    KthLargest(int k, vector<int>& nums) {
        this->k = k;
        for (int x : nums) {
            add(x);
        }
    }

    int add(int val) {
        minHeap.push(val);
        // More than k values? The smallest one can't be among the k largest.
        if ((int)minHeap.size() > k) {
            minHeap.pop();
        }
        // The top is the smallest of the k largest = the k-th largest.
        return minHeap.top();
    }

private:
    int k;
    // greater<int> turns the default max-heap into a min-heap.
    priority_queue<int, vector<int>, greater<int>> minHeap;
};
```

**How it works**
1. The heap holds exactly the k largest values seen so far.
2. Its top is the smallest of those k — by definition the k-th largest.
3. Push the new value; if size > k, pop the top.

**Think of it like this:** a bouncer who keeps the k tallest people in the club; the shortest one inside is always the k-th tallest.

**Why it's optimal:** O(log k) per add and only k values stored.

**Cost:** `add` **O(log k)**. Space **O(k)**.

## last-stone-weight

### Approach 1: Sort every round
**The idea:** sort, smash the two largest (the last two), put the remainder back, repeat.

```cpp
class Solution {
public:
    int lastStoneWeight(vector<int>& stones) {
        while (stones.size() > 1) {
            sort(stones.begin(), stones.end());       // largest at the back
            int a = stones.back();
            stones.pop_back();
            int b = stones.back();
            stones.pop_back();
            if (a != b) {
                stones.push_back(a - b);              // what's left of the bigger one
            }
        }
        if (stones.empty()) {
            return 0;
        }
        return stones[0];
    }
};
```

**How it works:** follows the rules literally.

**Think of it like this:** lining up all the stones by weight before every single smash.

**Cost:** Time **O(n² log n)**. Space **O(1)**.

### Approach 2: Counting buckets (weights ≤ 1000)
**The idea:** weights are small, so count how many stones have each weight and walk down from the heaviest.

```cpp
class Solution {
public:
    int lastStoneWeight(vector<int>& stones) {
        vector<int> count(1001, 0);
        for (int s : stones) {
            count[s]++;
        }

        int w = 1000;
        while (true) {
            // Find the heaviest stone.
            while (w > 0 && count[w] == 0) {
                w--;
            }
            if (w == 0) {
                return 0;                              // no stones left
            }
            count[w]--;
            int a = w;

            // Find the second heaviest (could be the same weight).
            int v = w;
            while (v > 0 && count[v] == 0) {
                v--;
            }
            if (v == 0) {
                return a;                              // a was the last stone
            }
            count[v]--;
            int b = v;

            if (a != b) {
                count[a - b]++;                         // the remainder is lighter
            }
        }
    }
};
```

**How it works:** the remainder `a − b` is always lighter than `a`, so the "heaviest" pointer `w` only ever moves down — over the whole run it moves at most 1000 steps.

**Think of it like this:** sorting stones into 1000 labelled bins and always grabbing from the heaviest non-empty bin.

**Cost:** Time **O(n + W)** for max weight W. Space **O(W)**.

### Optimal: Max-heap
**The idea:** "repeatedly take the two largest" is exactly what a max-heap does.

```cpp
class Solution {
public:
    int lastStoneWeight(vector<int>& stones) {
        // Building a heap from a range is O(n).
        priority_queue<int> maxHeap(stones.begin(), stones.end());

        while (maxHeap.size() > 1) {
            int a = maxHeap.top();      // heaviest
            maxHeap.pop();
            int b = maxHeap.top();      // second heaviest
            maxHeap.pop();

            if (a != b) {
                maxHeap.push(a - b);    // the smaller stone is destroyed, the bigger shrinks
            }
        }

        if (maxHeap.empty()) {
            return 0;
        }
        return maxHeap.top();
    }
};
```

**How it works**
1. Heapify all stones.
2. While ≥ 2 stones: pop `a`, pop `b`; if different, push `a − b`.
3. Return the last stone, or 0.

**Think of it like this:** a sports tournament where the two strongest always fight next.

**Why it's optimal:** each round costs O(log n) and there are at most n rounds; works for any weight range.

**Cost:** Time **O(n log n)**. Space **O(n)**.

## k-closest-points-to-origin

### Approach 1: Sort by distance
**The idea:** sort all points by squared distance, take the first k.

```cpp
class Solution {
public:
    vector<vector<int>> kClosest(vector<vector<int>>& points, int k) {
        sort(points.begin(), points.end(),
             [](const vector<int>& a, const vector<int>& b) {
                 return dist2(a) < dist2(b);
             });
        return vector<vector<int>>(points.begin(), points.begin() + k);
    }

private:
    // Squared distance: same ordering as the real distance, no sqrt needed.
    static int dist2(const vector<int>& p) {
        return p[0] * p[0] + p[1] * p[1];
    }
};
```

**How it works:** squared distances keep the same order as real distances and stay exact integers.

**Think of it like this:** lining up every house by distance from the station and picking the first k.

**Cost:** Time **O(n log n)**. Space **O(log n)** for sorting.

### Approach 2: Max-heap of size k
**The idea:** keep the k closest points seen so far; the farthest of them sits on top and is kicked out when a closer point arrives.

```cpp
class Solution {
public:
    vector<vector<int>> kClosest(vector<vector<int>>& points, int k) {
        // (distance², index) — max-heap: the farthest kept point is on top.
        priority_queue<pair<int, int>> heap;

        for (int i = 0; i < (int)points.size(); i++) {
            int d = points[i][0] * points[i][0] + points[i][1] * points[i][1];
            heap.push({d, i});
            if ((int)heap.size() > k) {
                heap.pop();                 // drop the farthest
            }
        }

        vector<vector<int>> res;
        while (!heap.empty()) {
            res.push_back(points[heap.top().second]);
            heap.pop();
        }
        return res;
    }
};
```

**How it works:** like "k-th largest", but reversed: a max-heap of the k smallest.

**Think of it like this:** a shortlist of k candidates; a better candidate replaces the worst on the list.

**Cost:** Time **O(n log k)**. Space **O(k)**. Great when points stream in.

### Optimal: Quickselect (`nth_element`)
**The idea:** we don't need the k points sorted, only *which* k are smallest. `nth_element` (quickselect) partitions the array so the first k are the k closest, in average linear time.

```cpp
class Solution {
public:
    vector<vector<int>> kClosest(vector<vector<int>>& points, int k) {
        auto closer = [](const vector<int>& a, const vector<int>& b) {
            int da = a[0] * a[0] + a[1] * a[1];   // squared distances
            int db = b[0] * b[0] + b[1] * b[1];
            return da < db;
        };

        // Rearranges points so that the first k are the k closest (in any order).
        nth_element(points.begin(), points.begin() + k, points.end(), closer);

        return vector<vector<int>>(points.begin(), points.begin() + k);
    }
};
```

**How it works**
1. Compare squared distances (no `sqrt`, exact).
2. Quickselect picks a pivot, partitions, and only recurses into the side containing position k.
3. Return the first k points.

**Think of it like this:** you don't rank all students; you just split them into "top k" and "the rest".

**Why it's optimal:** average **O(n)** — better than sorting or a heap when all points are available up front.

**Cost:** Time **O(n)** average (O(n²) worst case, very unlikely). Space **O(1)**.

## kth-largest-element-in-an-array

### Approach 1: Sort
**The idea:** sort ascending; the k-th largest is at index `n − k`.

```cpp
class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        sort(nums.begin(), nums.end());
        return nums[nums.size() - k];
    }
};
```

**How it works:** after sorting, the largest is at the end, the 2nd largest just before it, and so on.

**Think of it like this:** line everyone up by height and count k from the tall end.

**Cost:** Time **O(n log n)**. Space **O(log n)**.

### Approach 2: Quickselect (hand-written, random pivot, 3-way partition)
**The idea:** partition around a random pivot into "bigger", "equal", "smaller"; only keep searching in the part that contains the k-th largest.

```cpp
class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        mt19937 rng(12345);
        vector<int> current = nums;

        while (true) {
            int pivot = current[rng() % current.size()];

            vector<int> bigger;
            vector<int> equal;
            vector<int> smaller;
            for (int x : current) {
                if (x > pivot) {
                    bigger.push_back(x);
                } else if (x == pivot) {
                    equal.push_back(x);
                } else {
                    smaller.push_back(x);
                }
            }

            if (k <= (int)bigger.size()) {
                current = bigger;                       // answer is among the bigger ones
            } else if (k <= (int)(bigger.size() + equal.size())) {
                return pivot;                           // answer is the pivot itself
            } else {
                k -= bigger.size() + equal.size();      // skip the bigger and equal ones
                current = smaller;
            }
        }
    }
};
```

**How it works:** each round throws away (on average) half the candidates, so the total work is n + n/2 + n/4 + … ≈ 2n.

**Think of it like this:** "Is the k-th tallest person taller or shorter than Bob?" — then only look at that group.

**Cost:** Time **O(n)** average. Space **O(n)** for the partitions (an in-place version uses O(1)).

### Approach 3: Counting (values bounded to ±10⁴)
**The idea:** count how many times each value appears, then walk down from the largest value.

```cpp
class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        const int OFFSET = 10000;                 // shift −10⁴..10⁴ to 0..2·10⁴
        vector<int> count(2 * OFFSET + 1, 0);
        for (int x : nums) {
            count[x + OFFSET]++;
        }

        for (int v = 2 * OFFSET; v >= 0; v--) {
            k -= count[v];                        // all copies of this value
            if (k <= 0) {
                return v - OFFSET;
            }
        }
        return -1;
    }
};
```

**How it works:** like a histogram read from the right.

**Think of it like this:** tallying votes per score, then counting down from the top score.

**Cost:** Time **O(n + R)** for value range R. Space **O(R)**.

### Optimal: Min-heap of size k
**The idea:** keep the k largest values seen so far in a min-heap; its top is the k-th largest.

```cpp
class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        priority_queue<int, vector<int>, greater<int>> minHeap;

        for (int x : nums) {
            minHeap.push(x);
            if ((int)minHeap.size() > k) {
                minHeap.pop();          // the smallest is not in the top k
            }
        }
        // The heap now holds the k largest values; the top is the smallest of them.
        return minHeap.top();
    }
};
```

**How it works**
1. Push every number.
2. Whenever the heap has more than k values, pop the smallest.
3. The final top is the k-th largest.

**Think of it like this:** keeping a "top k" shortlist and always dropping the weakest entry.

**Why it's the usual interview answer:** guaranteed **O(n log k)** (no bad worst case like quickselect), O(k) memory, and works on streams. Mention quickselect for average O(n).

**Cost:** Time **O(n log k)**. Space **O(k)**.

## task-scheduler

### Approach 1: Simulate with a max-heap and a cooldown queue
**The idea:** at each time step, run the available task with the most copies left; tasks that just ran wait in a queue until their cooldown ends.

```cpp
class Solution {
public:
    int leastInterval(vector<char>& tasks, int n) {
        vector<int> count(26, 0);
        for (char t : tasks) {
            count[t - 'A']++;
        }

        priority_queue<int> ready;               // remaining counts of tasks we can run now
        for (int c : count) {
            if (c > 0) {
                ready.push(c);
            }
        }

        queue<pair<int, int>> cooling;           // (remaining count, time it is ready again)
        int time = 0;
        while (!ready.empty() || !cooling.empty()) {
            time++;

            if (!ready.empty()) {
                int left = ready.top() - 1;      // run the most frequent task once
                ready.pop();
                if (left > 0) {
                    cooling.push({left, time + n});
                }
            }
            // Otherwise the CPU is idle this step.

            // A task whose cooldown ends now becomes ready again.
            if (!cooling.empty() && cooling.front().second == time) {
                ready.push(cooling.front().first);
                cooling.pop();
            }
        }
        return time;
    }
};
```

**How it works:** always running the most frequent available task minimises idle time.

**Think of it like this:** a chef who always cooks the dish with the most orders left, while dishes just cooked "rest" for n minutes.

**Cost:** Time **O(T log 26)** = O(T) for T time steps. Space **O(26)**.

### Optimal: Count the frames of the most frequent task
**The idea:** the most frequent task decides the shape of the schedule: it needs `mx − 1` gaps of size n between its copies. Everything else fits into those gaps.

```cpp
class Solution {
public:
    int leastInterval(vector<char>& tasks, int n) {
        // How often does each task appear?
        vector<int> freq(26, 0);
        for (char t : tasks) {
            freq[t - 'A']++;
        }

        // mx = the highest frequency.
        int mx = *max_element(freq.begin(), freq.end());

        // numMax = how many different tasks have that highest frequency.
        int numMax = 0;
        for (int f : freq) {
            if (f == mx) {
                numMax++;
            }
        }

        // (mx - 1) full frames of length n + 1, then one last frame with the numMax tasks.
        int frame = (mx - 1) * (n + 1) + numMax;

        // If there are more tasks than slots, no idling is needed at all.
        return max(frame, (int)tasks.size());
    }
};
```

**How it works**
1. `[A,A,A,B,B,B]`, `n = 2`: `mx = 3`, `numMax = 2`.
2. Layout `A B _ | A B _ | A B` → `frame = (3−1)·3 + 2 = 8`.
3. If tasks overflow the idle slots, the schedule is just `tasks.size()` long.

**Think of it like this:** the busiest task sets up "train carriages" of length n + 1; other tasks ride in the empty seats. Too many passengers? Then there are no empty seats at all.

**Why it's optimal:** O(n) counting and O(1) arithmetic — no simulation needed.

**Cost:** Time **O(T)** for T tasks. Space **O(26)**.

## design-twitter

### Approach 1: Collect all candidate tweets and sort
**The idea:** for a feed, gather every tweet from the user and the people they follow, sort by time, take 10.

```cpp
class Twitter {
public:
    void postTweet(int userId, int tweetId) {
        tweets[userId].push_back({timer, tweetId});
        timer++;
    }

    vector<int> getNewsFeed(int userId) {
        vector<pair<int, int>> all;               // (time, tweetId)
        addAll(userId, all);
        for (int followee : follows[userId]) {
            if (followee != userId) {
                addAll(followee, all);
            }
        }

        sort(all.rbegin(), all.rend());           // newest first

        vector<int> feed;
        for (int i = 0; i < (int)all.size() && i < 10; i++) {
            feed.push_back(all[i].second);
        }
        return feed;
    }

    void follow(int followerId, int followeeId) {
        if (followerId != followeeId) {
            follows[followerId].insert(followeeId);
        }
    }

    void unfollow(int followerId, int followeeId) {
        follows[followerId].erase(followeeId);
    }

private:
    int timer = 0;                                       // increases with each tweet
    unordered_map<int, vector<pair<int, int>>> tweets;   // user → (time, tweetId)
    unordered_map<int, unordered_set<int>> follows;      // user → who they follow

    void addAll(int user, vector<pair<int, int>>& out) {
        for (const pair<int, int>& t : tweets[user]) {
            out.push_back(t);
        }
    }
};
```

**How it works:** simple, but reads every tweet of every followee.

**Think of it like this:** printing every post from everyone you follow, sorting the pile, and reading the top 10.

**Cost:** `getNewsFeed` **O(T log T)** for T candidate tweets.

### Approach 2: Only the last 10 tweets of each user
**The idea:** older tweets can never make the top 10, so only look at each user's 10 newest.

```cpp
class Twitter {
public:
    void postTweet(int userId, int tweetId) {
        tweets[userId].push_back({timer, tweetId});
        timer++;
    }

    vector<int> getNewsFeed(int userId) {
        vector<pair<int, int>> candidates;
        addRecent(userId, candidates);
        for (int followee : follows[userId]) {
            if (followee != userId) {
                addRecent(followee, candidates);
            }
        }
        sort(candidates.rbegin(), candidates.rend());   // newest first

        vector<int> feed;
        for (int i = 0; i < (int)candidates.size() && i < 10; i++) {
            feed.push_back(candidates[i].second);
        }
        return feed;
    }

    void follow(int followerId, int followeeId) {
        if (followerId != followeeId) {
            follows[followerId].insert(followeeId);
        }
    }

    void unfollow(int followerId, int followeeId) {
        follows[followerId].erase(followeeId);
    }

private:
    int timer = 0;
    unordered_map<int, vector<pair<int, int>>> tweets;
    unordered_map<int, unordered_set<int>> follows;

    // Add at most the 10 newest tweets of user.
    void addRecent(int user, vector<pair<int, int>>& out) {
        const vector<pair<int, int>>& list = tweets[user];
        int start = max(0, (int)list.size() - 10);
        for (int i = start; i < (int)list.size(); i++) {
            out.push_back(list[i]);
        }
    }
};
```

**How it works:** at most 10·(F + 1) candidates for F followees.

**Think of it like this:** only skimming each friend's 10 latest posts.

**Cost:** `getNewsFeed` **O(F log F)**.

### Optimal: Merge k sorted lists with a max-heap, stop at 10
**The idea:** each user's tweets are already sorted by time. A feed is "merge k sorted lists, newest first, but only the first 10".

```cpp
class Twitter {
public:
    void postTweet(int userId, int tweetId) {
        tweets[userId].push_back({timer, tweetId});
        timer++;
    }

    vector<int> getNewsFeed(int userId) {
        // Heap entry: (time, tweetId, user, index in that user's tweet list).
        // priority_queue is a max-heap, so the newest tweet is on top.
        priority_queue<tuple<int, int, int, int>> heap;

        pushNewest(userId, heap);
        for (int followee : follows[userId]) {
            if (followee != userId) {
                pushNewest(followee, heap);
            }
        }

        vector<int> feed;
        while (!heap.empty() && feed.size() < 10) {
            auto [time, tweetId, user, index] = heap.top();
            heap.pop();
            feed.push_back(tweetId);

            // Next candidate from the same user: their previous tweet.
            if (index > 0) {
                const pair<int, int>& older = tweets[user][index - 1];
                heap.push({older.first, older.second, user, index - 1});
            }
        }
        return feed;
    }

    void follow(int followerId, int followeeId) {
        if (followerId != followeeId) {
            follows[followerId].insert(followeeId);
        }
    }

    void unfollow(int followerId, int followeeId) {
        follows[followerId].erase(followeeId);
    }

private:
    int timer = 0;                                       // global clock: bigger = newer
    unordered_map<int, vector<pair<int, int>>> tweets;   // user → [(time, tweetId)] oldest→newest
    unordered_map<int, unordered_set<int>> follows;      // user → users they follow

    // Push a user's newest tweet (the back of their list) into the heap.
    void pushNewest(int user, priority_queue<tuple<int, int, int, int>>& heap) {
        auto it = tweets.find(user);
        if (it == tweets.end() || it->second.empty()) {
            return;
        }
        int index = it->second.size() - 1;
        heap.push({it->second[index].first, it->second[index].second, user, index});
    }
};
```

**How it works**
1. Seed the heap with each relevant user's newest tweet.
2. Pop the newest overall, add it to the feed, push that user's previous tweet.
3. Stop after 10 tweets.

**Think of it like this:** each friend holds their posts in a stack, newest on top; you repeatedly take the newest top post among all the stacks.

**Why it's optimal:** only touches about 10 + F heap entries — it doesn't depend on how many tweets exist.

**Cost:** `postTweet`/`follow`/`unfollow` **O(1)**. `getNewsFeed` **O(F log F)** (F followees). Space **O(users + tweets)**.

## find-median-from-data-stream

### Approach 1: Sorted vector with insertion
**The idea:** keep every number in sorted order; the median is in the middle.

```cpp
class MedianFinder {
public:
    void addNum(int num) {
        // Binary search for the insertion point, then insert (shifts elements).
        auto pos = upper_bound(values.begin(), values.end(), num);
        values.insert(pos, num);
    }

    double findMedian() {
        int n = values.size();
        if (n % 2 == 1) {
            return values[n / 2];
        }
        return (values[n / 2 - 1] + (double)values[n / 2]) / 2.0;
    }

private:
    vector<int> values;   // always sorted
};
```

**How it works:** sorted data makes the median a direct index.

**Think of it like this:** keeping a queue sorted by height; the median is whoever stands in the middle.

**Cost:** `addNum` **O(n)**. `findMedian` **O(1)**.

### Approach 2: Multiset with a pointer to the middle
**The idea:** a `multiset` stays sorted with O(log n) inserts; keep an iterator pointing at the middle and nudge it after each insert.

```cpp
class MedianFinder {
public:
    void addNum(int num) {
        int n = values.size();
        values.insert(num);

        if (n == 0) {
            mid = values.begin();
            return;
        }
        // mid points at the lower middle element (index (size - 1) / 2).
        if (n % 2 == 1) {
            // Size goes odd → even: lower middle index stays the same.
            if (num < *mid) {
                mid--;      // an element was added before mid
            }
        } else {
            // Size goes even → odd: lower middle index moves right by one.
            if (num >= *mid) {
                mid++;      // new element went after mid (multiset puts equal ones after)
            }
        }
    }

    double findMedian() {
        if (values.size() % 2 == 1) {
            return *mid;
        }
        return (*mid + (double)*next(mid)) / 2.0;
    }

private:
    multiset<int> values;
    multiset<int>::iterator mid;
};
```

**How it works:** inserting before or after `mid` shifts its index; we move the iterator to keep it on the lower middle.

**Think of it like this:** a bookmark in a sorted book that you shift by one page whenever a page is added on one side.

**Cost:** `addNum` **O(log n)**. `findMedian` **O(1)**.

### Approach 3: Counting buckets (when values are small, e.g. 0..100)
**The idea:** if all values are in a small range, count each value and walk the counts to find the middle.

```cpp
class MedianFinder {
public:
    MedianFinder() : count(MAXV + 1, 0) {}

    void addNum(int num) {
        count[num]++;
        total++;
    }

    double findMedian() {
        // The two middle positions (equal when total is odd), 0-based.
        int left = (total - 1) / 2;
        int right = total / 2;
        return (valueAt(left) + (double)valueAt(right)) / 2.0;
    }

private:
    static const int MAXV = 100;   // assumption: values are in [0, 100]
    vector<int> count;
    int total = 0;

    // The value at a given 0-based position in sorted order.
    int valueAt(int position) {
        int seen = 0;
        for (int v = 0; v <= MAXV; v++) {
            seen += count[v];
            if (seen > position) {
                return v;
            }
        }
        return -1;
    }
};
```

**How it works:** this is the answer to the follow-up "what if all numbers are in [0, 100]?".

**Think of it like this:** a tally sheet with 101 boxes; count marks until you pass the halfway point.

**Cost:** `addNum` **O(1)**. `findMedian` **O(range)**.

### Optimal: Two heaps — a max-heap for the lower half, a min-heap for the upper half
**The idea:** split the numbers into a smaller half and a larger half. The median is at the "edge" between them, which is exactly the top of each heap.

```cpp
class MedianFinder {
public:
    void addNum(int num) {
        // 1. Put the number in the lower half...
        lo.push(num);

        // 2. ...then move the lower half's largest to the upper half.
        //    This keeps every value in lo <= every value in hi.
        hi.push(lo.top());
        lo.pop();

        // 3. Keep the sizes balanced: lo may have at most one more than hi.
        if (hi.size() > lo.size()) {
            lo.push(hi.top());
            hi.pop();
        }
    }

    double findMedian() {
        if (lo.size() > hi.size()) {
            return lo.top();                           // odd count: middle is lo's max
        }
        return (lo.top() + (double)hi.top()) / 2.0;    // even: average the two middles
    }

private:
    priority_queue<int> lo;                                // max-heap: smaller half
    priority_queue<int, vector<int>, greater<int>> hi;     // min-heap: larger half
};
```

**How it works**
1. **Invariants:** everything in `lo` ≤ everything in `hi`; `lo` has the same size as `hi` or one more.
2. Push into `lo`, move `lo`'s max to `hi` (fixes the order), move `hi`'s min back if `hi` got bigger (fixes the sizes).
3. Median: `lo.top()` if odd, else the average of both tops.

**Think of it like this:** two teams — the shorter half and the taller half. The tallest of the short team and the shortest of the tall team stand right in the middle.

**Why it's optimal:** O(log n) inserts and O(1) median for any values.

**Cost:** `addNum` **O(log n)**. `findMedian` **O(1)**. Space **O(n)**.
