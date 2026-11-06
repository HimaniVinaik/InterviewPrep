## maximum-subarray

### Approach 1: Brute force with running sums
**The idea:** for every start index, extend the end one step at a time, keeping a running sum.

```cpp
class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int n = nums.size();
        int best = nums[0];
        for (int start = 0; start < n; start++) {
            int sum = 0;
            for (int end = start; end < n; end++) {
                sum += nums[end];          // sum of nums[start..end]
                best = max(best, sum);
            }
        }
        return best;
    }
};
```

**How it works:** tries every subarray, reusing the previous sum so each one costs O(1).

**Think of it like this:** testing every stretch of a road trip to find the one with the best total score.

**Cost:** Time **O(n²)**. Space **O(1)**.

### Approach 2: Prefix sums — subtract the smallest earlier prefix
**The idea:** the sum of `nums[i..j]` = `prefix[j+1] − prefix[i]`. For each end, subtract the smallest prefix seen before it.

```cpp
class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int prefix = 0;          // sum of nums[0..j]
        int minPrefix = 0;       // smallest prefix sum before j (the empty prefix is 0)
        int best = nums[0];
        for (int x : nums) {
            prefix += x;
            best = max(best, prefix - minPrefix);   // best subarray ending here
            minPrefix = min(minPrefix, prefix);
        }
        return best;
    }
};
```

**How it works:** a subarray is "a prefix minus a shorter prefix", so we want the biggest difference.

**Think of it like this:** like the stock problem: buy at the lowest point of the running total, sell at the current point.

**Cost:** Time **O(n)**. Space **O(1)**.

### Approach 3: Divide and conquer
**The idea:** the best subarray lies entirely in the left half, entirely in the right half, or crosses the middle.

```cpp
class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        return best(nums, 0, nums.size() - 1);
    }

private:
    int best(vector<int>& nums, int lo, int hi) {
        if (lo == hi) {
            return nums[lo];
        }
        int mid = lo + (hi - lo) / 2;

        // Best sum that ends exactly at mid (going left).
        int leftBest = INT_MIN;
        int sum = 0;
        for (int i = mid; i >= lo; i--) {
            sum += nums[i];
            leftBest = max(leftBest, sum);
        }
        // Best sum that starts exactly at mid + 1 (going right).
        int rightBest = INT_MIN;
        sum = 0;
        for (int i = mid + 1; i <= hi; i++) {
            sum += nums[i];
            rightBest = max(rightBest, sum);
        }
        int crossing = leftBest + rightBest;

        return max(crossing, max(best(nums, lo, mid), best(nums, mid + 1, hi)));
    }
};
```

**How it works:** like merge sort: solve halves, then combine in O(n).

**Think of it like this:** splitting the trip into two halves and asking each half for its best stretch, plus the best stretch through the middle.

**Cost:** Time **O(n log n)**. Space **O(log n)** recursion.

### Optimal: Kadane's algorithm
**The idea:** at each position, the best subarray ending here either extends the previous one or starts fresh. Starting fresh wins whenever the previous sum is negative.

```cpp
class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int best = nums[0];   // best sum seen anywhere
        int cur = 0;          // best sum of a subarray ending at the current element

        for (int x : nums) {
            // Extend the previous subarray, or start a new one at x.
            cur = max(x, cur + x);
            best = max(best, cur);
        }
        return best;
    }
};
```

**How it works**
1. `cur` = best sum ending at the current index.
2. `cur = max(x, cur + x)`: a negative `cur` only hurts, so drop it.
3. `best` is the max of all `cur` values.

**Think of it like this:** carrying a backpack of points; if it ever weighs you down (negative), you drop it and start fresh.

**Why it's optimal:** one pass, two variables.

**Cost:** Time **O(n)**. Space **O(1)**.

## jump-game

### Approach 1: DP — can I reach index i?
**The idea:** `reachable[i]` is true if some earlier reachable index can jump to i.

```cpp
class Solution {
public:
    bool canJump(vector<int>& nums) {
        int n = nums.size();
        vector<bool> reachable(n, false);
        reachable[0] = true;

        for (int i = 0; i < n; i++) {
            if (!reachable[i]) {
                continue;
            }
            // Mark everything this index can jump to.
            for (int j = i + 1; j <= i + nums[i] && j < n; j++) {
                reachable[j] = true;
            }
        }
        return reachable[n - 1];
    }
};
```

**How it works:** spreads reachability forwards from each reachable index.

**Think of it like this:** colouring every stepping stone you can land on.

**Cost:** Time **O(n · maxJump)**. Space **O(n)**.

### Approach 2: Greedy backwards — move the goal
**The idea:** start with the goal at the last index. Walking backwards, if index i can reach the goal, i becomes the new goal.

```cpp
class Solution {
public:
    bool canJump(vector<int>& nums) {
        int goal = nums.size() - 1;
        for (int i = nums.size() - 2; i >= 0; i--) {
            if (i + nums[i] >= goal) {
                goal = i;               // reaching i is now enough
            }
        }
        return goal == 0;
    }
};
```

**How it works:** if you can reach i and i can reach the goal, reaching i is enough.

**Think of it like this:** working backwards from the finish line, moving it closer whenever a stone can reach it.

**Cost:** Time **O(n)**. Space **O(1)**.

### Optimal: Greedy forwards — track the farthest reach
**The idea:** keep the farthest index you can reach so far. If you ever stand at an index beyond it, you're stuck.

```cpp
class Solution {
public:
    bool canJump(vector<int>& nums) {
        int reach = 0;                       // farthest index reachable so far
        for (int i = 0; i < (int)nums.size(); i++) {
            if (i > reach) {
                return false;                // we can't even get to i
            }
            reach = max(reach, i + nums[i]); // from i we can get this far
        }
        return true;
    }
};
```

**How it works**
1. `reach` starts at 0.
2. At each `i`: if `i > reach`, fail.
3. Otherwise extend `reach`.

**Think of it like this:** a torch that lights up the path ahead; if you walk past the edge of the light, you fall.

**Why it's optimal:** one pass, O(1) memory.

**Cost:** Time **O(n)**. Space **O(1)**.

## jump-game-ii

### Approach 1: DP — minimum jumps to each index
**The idea:** `jumps[j]` = fewest jumps to reach j. From each i, update everything it can reach.

```cpp
class Solution {
public:
    int jump(vector<int>& nums) {
        int n = nums.size();
        vector<int> jumps(n, INT_MAX);
        jumps[0] = 0;
        for (int i = 0; i < n; i++) {
            if (jumps[i] == INT_MAX) {
                continue;                       // unreachable (not possible per the problem)
            }
            for (int j = i + 1; j <= i + nums[i] && j < n; j++) {
                jumps[j] = min(jumps[j], jumps[i] + 1);
            }
        }
        return jumps[n - 1];
    }
};
```

**How it works:** each index tries to improve all the indices it can reach.

**Think of it like this:** writing on each stone "you can get here in X hops" and improving the numbers as you go.

**Cost:** Time **O(n · maxJump)**. Space **O(n)**.

### Approach 2: Explicit BFS over indices
**The idea:** indices are nodes, jumps are edges; BFS finds the fewest edges to the end.

```cpp
class Solution {
public:
    int jump(vector<int>& nums) {
        int n = nums.size();
        if (n == 1) {
            return 0;
        }
        queue<int> q;
        q.push(0);
        int jumps = 0;
        int farthestQueued = 0;                  // indices up to here are already queued

        while (!q.empty()) {
            jumps++;
            int levelSize = q.size();
            for (int k = 0; k < levelSize; k++) {
                int i = q.front();
                q.pop();
                for (int j = farthestQueued + 1; j <= i + nums[i] && j < n; j++) {
                    if (j == n - 1) {
                        return jumps;
                    }
                    q.push(j);
                }
                farthestQueued = max(farthestQueued, min(n - 1, i + nums[i]));
            }
        }
        return jumps;
    }
};
```

**How it works:** starting the inner loop at `farthestQueued + 1` skips indices already in the queue, keeping it O(n).

**Think of it like this:** level 1 = stones reachable in one hop, level 2 = stones reachable in two hops, …

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: Greedy BFS without a queue
**The idea:** the indices reachable with `jumps` jumps form a range ending at `curEnd`. While scanning that range, track `farthest` — the end of the next range. When you hit `curEnd`, you must jump.

```cpp
class Solution {
public:
    int jump(vector<int>& nums) {
        int jumps = 0;
        int curEnd = 0;      // last index reachable with `jumps` jumps
        int farthest = 0;    // farthest index reachable with one more jump

        // We never need to jump FROM the last index, so stop before it.
        for (int i = 0; i + 1 < (int)nums.size(); i++) {
            farthest = max(farthest, i + nums[i]);
            if (i == curEnd) {
                // We've used up the current range: take a jump.
                jumps++;
                curEnd = farthest;
            }
        }
        return jumps;
    }
};
```

**How it works**
1. Scan `i` from 0 to `n − 2`, updating `farthest`.
2. When `i == curEnd`, take a jump and set `curEnd = farthest`.

**Think of it like this:** you're on a bus route; while riding the current bus, you note the farthest stop any connecting bus can take you, and transfer only when your current bus ends.

**Why it's optimal:** BFS levels without a queue — O(n) time, O(1) space.

**Cost:** Time **O(n)**. Space **O(1)**.

## gas-station

### Approach 1: Try every start
**The idea:** simulate the full loop from each station.

```cpp
class Solution {
public:
    int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
        int n = gas.size();
        for (int start = 0; start < n; start++) {
            int tank = 0;
            bool ok = true;
            for (int step = 0; step < n; step++) {
                int i = (start + step) % n;     // wrap around the circle
                tank += gas[i] - cost[i];
                if (tank < 0) {
                    ok = false;                 // ran out before reaching the next station
                    break;
                }
            }
            if (ok) {
                return start;
            }
        }
        return -1;
    }
};
```

**How it works:** literal simulation.

**Think of it like this:** test-driving the whole route from every possible starting town.

**Cost:** Time **O(n²)**. Space **O(1)**.

### Approach 2: Start right after the lowest point of the running total
**The idea:** compute the running total of `gas − cost`. The start is the station right after the point where that total is lowest.

```cpp
class Solution {
public:
    int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
        int n = gas.size();
        int running = 0;
        int lowest = INT_MAX;
        int lowestAt = -1;
        for (int i = 0; i < n; i++) {
            running += gas[i] - cost[i];
            if (running < lowest) {
                lowest = running;
                lowestAt = i;
            }
        }
        if (running < 0) {
            return -1;                         // not enough gas in total
        }
        return (lowestAt + 1) % n;
    }
};
```

**How it works:** starting after the deepest dip means every partial sum from there on is ≥ 0.

**Think of it like this:** looking at a graph of your fuel over the trip and starting right after the lowest valley.

**Cost:** Time **O(n)**. Space **O(1)**.

### Optimal: One pass, restart when the tank goes negative
**The idea:** if the tank goes negative at station i, no station between the current start and i can work — start again at i + 1. If total gas ≥ total cost, the last start is the answer.

```cpp
class Solution {
public:
    int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
        int total = 0;    // gas minus cost over the whole circle
        int tank = 0;     // fuel since the current candidate start
        int start = 0;    // current candidate start

        for (int i = 0; i < (int)gas.size(); i++) {
            int d = gas[i] - cost[i];
            total += d;
            tank += d;
            if (tank < 0) {
                // Can't reach i + 1 from start (or from anything between). Try i + 1.
                start = i + 1;
                tank = 0;
            }
        }

        if (total < 0) {
            return -1;    // the whole trip needs more gas than exists
        }
        return start;
    }
};
```

**How it works**
1. Keep a running `tank` from the current `start`.
2. If it drops below 0 at i, every start between `start` and i would also fail (they'd arrive at i with even less fuel), so move `start` to i + 1.
3. If the total is ≥ 0, the final `start` works.

**Think of it like this:** if you ran out of gas on the way from A to D, starting at B or C (with an empty tank) wouldn't have helped either.

**Why it's optimal:** one pass, O(1) memory.

**Cost:** Time **O(n)**. Space **O(1)**.

## hand-of-straights

### Approach 1: Sort, then repeatedly build runs from the smallest card
**The idea:** after sorting, the smallest unused card must start a run. Mark cards used as you build each run.

```cpp
class Solution {
public:
    bool isNStraightHand(vector<int>& hand, int groupSize) {
        int n = hand.size();
        if (n % groupSize != 0) {
            return false;
        }
        sort(hand.begin(), hand.end());
        vector<bool> used(n, false);

        for (int i = 0; i < n; i++) {
            if (used[i]) {
                continue;
            }
            // hand[i] is the smallest unused card: it starts a run.
            used[i] = true;
            int need = hand[i] + 1;          // next value we need in this run
            int found = 1;
            for (int j = i + 1; j < n && found < groupSize; j++) {
                if (!used[j] && hand[j] == need) {
                    used[j] = true;
                    need++;
                    found++;
                }
            }
            if (found < groupSize) {
                return false;
            }
        }
        return true;
    }
};
```

**How it works:** greedy from the smallest card, scanning for each next value.

**Think of it like this:** laying sorted cards on a table and pulling out runs from the left.

**Cost:** Time **O(n²)** worst case. Space **O(n)**.

### Approach 2: Min-heap of distinct values
**The idea:** keep counts in a hash map and the distinct values in a min-heap; always start a run at the smallest value.

```cpp
class Solution {
public:
    bool isNStraightHand(vector<int>& hand, int groupSize) {
        if (hand.size() % groupSize != 0) {
            return false;
        }
        unordered_map<int, int> count;
        for (int x : hand) {
            count[x]++;
        }
        priority_queue<int, vector<int>, greater<int>> smallest;
        for (const pair<const int, int>& entry : count) {
            smallest.push(entry.first);
        }

        while (!smallest.empty()) {
            int first = smallest.top();
            if (count[first] == 0) {
                smallest.pop();              // used up already
                continue;
            }
            for (int v = first; v < first + groupSize; v++) {
                if (count[v] == 0) {
                    return false;            // a gap in the run
                }
                count[v]--;
            }
        }
        return true;
    }
};
```

**How it works:** each run uses one card of each value; the heap always gives the smallest value left.

**Think of it like this:** a sorted card dispenser that always shows the smallest card left.

**Cost:** Time **O(n log n)**. Space **O(n)**.

### Optimal: Ordered map — start `count` runs at once
**The idea:** with counts in an ordered map, the smallest value with count `c` must start exactly `c` runs. Subtract `c` from the next `groupSize` values in one go.

```cpp
class Solution {
public:
    bool isNStraightHand(vector<int>& hand, int groupSize) {
        if (hand.size() % groupSize != 0) {
            return false;                       // can't split evenly
        }
        map<int, int> cnt;                      // value → copies, sorted by value
        for (int x : hand) {
            cnt[x]++;
        }

        for (auto& entry : cnt) {
            int start = entry.first;
            int need = entry.second;            // this many runs must start here
            if (need == 0) {
                continue;
            }
            // Each of those runs needs start, start+1, ..., start+groupSize-1.
            for (int v = start; v < start + groupSize; v++) {
                auto it = cnt.find(v);
                if (it == cnt.end() || it->second < need) {
                    return false;               // not enough of value v
                }
                it->second -= need;
            }
        }
        return true;
    }
};
```

**How it works**
1. Count values in an ordered map.
2. The smallest value with count `c > 0` can't be in the middle of a run, so it starts `c` runs.
3. Subtract `c` from the next `groupSize` values; a shortfall means false.

**Think of it like this:** if you have three 2s and nothing smaller, you must start three runs at 2 — so you need three 3s, three 4s, …

**Why it's optimal:** each distinct value is processed once in bulk.

**Cost:** Time **O(n log n)**. Space **O(n)**.

## merge-triplets-to-form-target-triplet

### Approach 1: Merge every safe triplet and compare
**The idea:** any triplet that doesn't exceed the target in any coordinate is safe to merge. Merge all of them and check if the result equals the target.

```cpp
class Solution {
public:
    bool mergeTriplets(vector<vector<int>>& triplets, vector<int>& target) {
        vector<int> merged = {0, 0, 0};
        for (const vector<int>& t : triplets) {
            bool safe = t[0] <= target[0] && t[1] <= target[1] && t[2] <= target[2];
            if (!safe) {
                continue;                       // would overshoot some coordinate
            }
            for (int k = 0; k < 3; k++) {
                merged[k] = max(merged[k], t[k]);
            }
        }
        return merged == target;
    }
};
```

**How it works:** merging safe triplets can only bring each coordinate closer to (never past) the target.

**Think of it like this:** mixing paints — never use a paint that is already too dark in any colour.

**Cost:** Time **O(n)**. Space **O(1)**.

### Optimal: Flags for each target coordinate
**The idea:** same reasoning; instead of building the merged triplet, record whether some safe triplet hits each target coordinate exactly.

```cpp
class Solution {
public:
    bool mergeTriplets(vector<vector<int>>& triplets, vector<int>& target) {
        bool a = false;   // some safe triplet has x == target x
        bool b = false;   // ... y == target y
        bool c = false;   // ... z == target z

        for (const vector<int>& t : triplets) {
            // Any coordinate above the target can never be undone (max only grows).
            if (t[0] > target[0] || t[1] > target[1] || t[2] > target[2]) {
                continue;
            }
            if (t[0] == target[0]) {
                a = true;
            }
            if (t[1] == target[1]) {
                b = true;
            }
            if (t[2] == target[2]) {
                c = true;
            }
        }
        return a && b && c;
    }
};
```

**How it works**
1. Skip triplets that exceed the target anywhere.
2. Every remaining triplet is safe; check whether they collectively hit each coordinate.

**Think of it like this:** you need three keys; you can only use key rings that don't carry a forbidden key, and you check whether those rings together have all three.

**Why it's optimal:** one pass, three booleans.

**Cost:** Time **O(n)**. Space **O(1)**.

## partition-labels

### Approach 1: Brute force — grow the piece until it closes
**The idea:** start a piece; keep extending it while any letter inside it still appears later in the string.

```cpp
class Solution {
public:
    vector<int> partitionLabels(string s) {
        vector<int> out;
        int n = s.size();
        int start = 0;
        while (start < n) {
            int end = start;
            int i = start;
            while (i <= end) {
                // The piece must reach the last occurrence of s[i].
                int last = s.rfind(s[i]);
                end = max(end, last);
                i++;
            }
            out.push_back(end - start + 1);
            start = end + 1;
        }
        return out;
    }
};
```

**How it works:** `rfind` searches from the right for the last occurrence each time.

**Think of it like this:** for every letter in a chunk, look ahead to see where it last appears.

**Cost:** Time **O(n²)**. Space **O(1)**.

### Approach 2: Merge per-letter intervals
**The idea:** each letter spans the interval [first, last]. Overlapping intervals must be in the same piece — merge them (exactly Merge Intervals).

```cpp
class Solution {
public:
    vector<int> partitionLabels(string s) {
        vector<int> first(26, -1);
        vector<int> last(26, -1);
        for (int i = 0; i < (int)s.size(); i++) {
            int c = s[i] - 'a';
            if (first[c] == -1) {
                first[c] = i;
            }
            last[c] = i;
        }
        vector<vector<int>> spans;
        for (int c = 0; c < 26; c++) {
            if (first[c] != -1) {
                spans.push_back({first[c], last[c]});
            }
        }
        sort(spans.begin(), spans.end());

        vector<int> out;
        int start = spans[0][0];
        int end = spans[0][1];
        for (int i = 1; i < (int)spans.size(); i++) {
            if (spans[i][0] > end) {
                out.push_back(end - start + 1);   // the current piece is closed
                start = spans[i][0];
            }
            end = max(end, spans[i][1]);
        }
        out.push_back(end - start + 1);
        return out;
    }
};
```

**How it works:** merged intervals are exactly the pieces.

**Think of it like this:** each letter is a rope from its first to last position; ropes that overlap are tied into one bundle.

**Cost:** Time **O(n)** (only 26 intervals to sort). Space **O(1)**.

### Optimal: Last occurrence + one scan
**The idea:** record each letter's last index. Scan, stretching the current piece's `end` to the last occurrence of every letter you see; when `i == end`, cut.

```cpp
class Solution {
public:
    vector<int> partitionLabels(string s) {
        // last[c] = last index where letter c appears.
        vector<int> last(26, 0);
        for (int i = 0; i < (int)s.size(); i++) {
            last[s[i] - 'a'] = i;
        }

        vector<int> out;
        int start = 0;     // start of the current piece
        int end = 0;       // the piece must extend at least to here
        for (int i = 0; i < (int)s.size(); i++) {
            end = max(end, last[s[i] - 'a']);
            if (i == end) {
                // Every letter in this piece has had its last appearance: cut.
                out.push_back(end - start + 1);
                start = i + 1;
            }
        }
        return out;
    }
};
```

**How it works**
1. Precompute `last[c]`.
2. `end` = farthest last-occurrence of any letter in the current piece.
3. `i == end` → cut here.

**Think of it like this:** packing a moving box; you can only close it once every item of every type you put in is inside.

**Why it's optimal:** two passes, 26 integers of memory.

**Cost:** Time **O(n)**. Space **O(1)**.

## valid-parenthesis-string

### Approach 1: Memoised recursion over (index, open count)
**The idea:** `ok(i, open)` = can `s[i..]` be finished with `open` unmatched `(` so far? A `*` tries all three options.

```cpp
class Solution {
public:
    bool checkValidString(string s) {
        n = s.size();
        memo.assign(n + 1, vector<int>(n + 1, -1));   // -1 unknown, 0 false, 1 true
        return ok(s, 0, 0);
    }

private:
    int n = 0;
    vector<vector<int>> memo;

    bool ok(const string& s, int i, int open) {
        if (open < 0) {
            return false;                  // a ')' with nothing to match
        }
        if (open > n - i) {
            return false;                  // not enough characters left to close them
        }
        if (i == n) {
            return open == 0;
        }
        if (memo[i][open] != -1) {
            return memo[i][open] == 1;
        }
        bool result;
        if (s[i] == '(') {
            result = ok(s, i + 1, open + 1);
        } else if (s[i] == ')') {
            result = ok(s, i + 1, open - 1);
        } else {
            // '*' can be '(', ')' or nothing.
            result = ok(s, i + 1, open + 1) || ok(s, i + 1, open - 1) || ok(s, i + 1, open);
        }
        memo[i][open] = result ? 1 : 0;
        return result;
    }
};
```

**How it works:** only n × n different states exist, each computed once.

**Think of it like this:** exploring every choice for each wildcard, but writing down answers you've already worked out.

**Cost:** Time **O(n²)**. Space **O(n²)**.

### Approach 2: Two stacks (indices of `(` and `*`)
**The idea:** match each `)` with a `(` if possible, else with a `*`. At the end, each leftover `(` needs a `*` *after* it.

```cpp
class Solution {
public:
    bool checkValidString(string s) {
        stack<int> opens;   // indices of unmatched '('
        stack<int> stars;   // indices of unused '*'

        for (int i = 0; i < (int)s.size(); i++) {
            if (s[i] == '(') {
                opens.push(i);
            } else if (s[i] == '*') {
                stars.push(i);
            } else {
                if (!opens.empty()) {
                    opens.pop();             // match with a real '('
                } else if (!stars.empty()) {
                    stars.pop();             // use a '*' as '('
                } else {
                    return false;            // nothing can match this ')'
                }
            }
        }

        // Leftover '(' must each be closed by a '*' that comes AFTER it.
        while (!opens.empty()) {
            if (stars.empty() || stars.top() < opens.top()) {
                return false;
            }
            opens.pop();
            stars.pop();
        }
        return true;
    }
};
```

**How it works:** preferring real `(` for matching keeps stars free for later.

**Think of it like this:** wildcards are jokers you save for when you really need them — but a joker can only close a bracket that opened before it.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: Track the range of possible open counts
**The idea:** you don't need to decide what each `*` is. Just track the smallest and largest number of open brackets possible so far.

```cpp
class Solution {
public:
    bool checkValidString(string s) {
        int lo = 0;   // fewest open '(' possible so far
        int hi = 0;   // most open '(' possible so far

        for (char c : s) {
            if (c == '(') {
                lo++;
                hi++;
            } else if (c == ')') {
                lo--;
                hi--;
            } else {
                lo--;          // '*' used as ')'
                hi++;          // '*' used as '('
            }

            if (hi < 0) {
                return false;  // too many ')' even if every '*' is '('
            }
            if (lo < 0) {
                lo = 0;        // a negative count isn't real: treat a '*' as empty instead
            }
        }
        // Valid if zero open brackets is one of the possibilities.
        return lo == 0;
    }
};
```

**How it works**
1. `(` → both +1; `)` → both −1; `*` → `lo − 1`, `hi + 1`.
2. `hi < 0` → impossible.
3. Clamp `lo` at 0.
4. Valid iff `lo == 0` at the end.

**Think of it like this:** instead of tracking one bank balance, you track the best and worst case; you're fine as long as the best case never goes negative and the worst case can end at zero.

**Why it's optimal:** one pass and two integers.

**Cost:** Time **O(n)**. Space **O(1)**.
