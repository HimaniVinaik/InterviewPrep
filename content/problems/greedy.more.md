## maximum-subarray

### Approach 1: Brute force with running sums
```cpp
class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int best = INT_MIN, n = nums.size();
        for (int i = 0; i < n; ++i) {
            int sum = 0;
            for (int j = i; j < n; ++j) { sum += nums[j]; best = max(best, sum); }
        }
        return best;
    }
};
```

**Time:** O(n²) · **Space:** O(1).

### Approach 2: Divide and conquer
```cpp
class Solution {
    int solve(const vector<int>& a, int lo, int hi) {           // [lo, hi]
        if (lo == hi) return a[lo];
        int mid = (lo + hi) / 2;
        int leftBest = INT_MIN, s = 0;
        for (int i = mid; i >= lo; --i) { s += a[i]; leftBest = max(leftBest, s); }     // best ending at mid
        int rightBest = INT_MIN; s = 0;
        for (int i = mid + 1; i <= hi; ++i) { s += a[i]; rightBest = max(rightBest, s); } // best starting at mid+1
        return max({solve(a, lo, mid), solve(a, mid + 1, hi), leftBest + rightBest});
    }
public:
    int maxSubArray(vector<int>& nums) { return solve(nums, 0, nums.size() - 1); }
};
```

**Time:** O(n log n) · **Space:** O(log n). The best subarray is entirely left, entirely right, or crosses the middle. The problem's "follow-up".

### Approach 3: Prefix sums (min prefix so far)
```cpp
class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int prefix = 0, minPrefix = 0, best = INT_MIN;
        for (int x : nums) {
            prefix += x;
            best = max(best, prefix - minPrefix);      // subarray sum = prefix[j] - prefix[i]
            minPrefix = min(minPrefix, prefix);
        }
        return best;
    }
};
```

**Time:** O(n) · **Space:** O(1). The same idea as Best Time to Buy and Sell Stock on the prefix-sum array.

### Walkthrough
**Goal:** max sum of a contiguous subarray (Kadane's algorithm).

1. `cur` = best sum of a subarray **ending at the current index**.
2. At each `x`: either extend the previous subarray (`cur + x`) or start fresh at `x` — take the bigger. Starting fresh wins exactly when `cur < 0` (a negative prefix only hurts).
3. `best` = max of all `cur` values.

**Dry run** `[−2, 1, −3, 4, −1, 2, 1, −5, 4]`:

| x | cur = max(x, cur + x) | best |
|---|---|---|
| −2 | −2 | −2 |
| 1 | 1 | 1 |
| −3 | −2 | 1 |
| 4 | 4 | 4 |
| −1 | 3 | 4 |
| 2 | 5 | 5 |
| 1 | **6** | 6 |
| −5 | 1 | 6 |
| 4 | 5 | 6 |

Answer **6** = `[4, −1, 2, 1]`. To return the subarray itself, record the start index whenever you restart.

## jump-game

### Approach 1: DP — reachable[i]
```cpp
class Solution {
public:
    bool canJump(vector<int>& nums) {
        int n = nums.size();
        vector<bool> ok(n, false);
        ok[n - 1] = true;                              // ok[i]: can reach the end from i
        for (int i = n - 2; i >= 0; --i)
            for (int j = 1; j <= nums[i] && i + j < n; ++j)
                if (ok[i + j]) { ok[i] = true; break; }
        return ok[0];
    }
};
```

**Time:** O(n · max jump) · **Space:** O(n).

### Approach 2: Greedy backwards — move the goal post
```cpp
class Solution {
public:
    bool canJump(vector<int>& nums) {
        int goal = nums.size() - 1;
        for (int i = goal - 1; i >= 0; --i)
            if (i + nums[i] >= goal) goal = i;         // i can reach the goal: i becomes the new goal
        return goal == 0;
    }
};
```

**Time:** O(n) · **Space:** O(1). A neat collapse of the DP: only the leftmost "good" index matters.

### Walkthrough
**Goal:** can index 0 reach the last index?

1. `reach` = farthest index reachable so far (start 0).
2. For each `i`: if `i > reach`, we can't even stand on `i` → false.
3. Otherwise extend `reach = max(reach, i + nums[i])`.
4. Finishing the loop means every index (including the last) was reachable.

**Dry run** `[3, 2, 1, 0, 4]`:

| i | nums[i] | reach before | reachable? | reach after |
|---|---|---|---|---|
| 0 | 3 | 0 | yes | 3 |
| 1 | 2 | 3 | yes | 3 |
| 2 | 1 | 3 | yes | 3 |
| 3 | 0 | 3 | yes | 3 |
| 4 | 4 | 3 | **4 > 3 → false** | |

## jump-game-ii

### Approach 1: DP — min jumps to each index
```cpp
class Solution {
public:
    int jump(vector<int>& nums) {
        int n = nums.size();
        vector<int> dp(n, INT_MAX);
        dp[0] = 0;
        for (int i = 0; i < n; ++i)
            for (int j = 1; j <= nums[i] && i + j < n; ++j)
                dp[i + j] = min(dp[i + j], dp[i] + 1);
        return dp[n - 1];
    }
};
```

**Time:** O(n · max jump) · **Space:** O(n).

### Approach 2: Explicit BFS over indices
```cpp
class Solution {
public:
    int jump(vector<int>& nums) {
        int n = nums.size();
        if (n == 1) return 0;
        vector<int> dist(n, -1);
        queue<int> q; q.push(0); dist[0] = 0;
        int farthestQueued = 0;
        while (!q.empty()) {
            int i = q.front(); q.pop();
            for (int j = farthestQueued + 1; j <= min(n - 1, i + nums[i]); ++j) {   // only new indices
                dist[j] = dist[i] + 1;
                if (j == n - 1) return dist[j];
                q.push(j);
            }
            farthestQueued = max(farthestQueued, i + nums[i]);
        }
        return -1;
    }
};
```

**Time:** O(n) · **Space:** O(n). Makes the "levels = jumps" structure explicit before collapsing it into the O(1)-space greedy.

### Walkthrough
**Goal:** minimum jumps = BFS levels, where each level is a contiguous range of indices.

1. `curEnd` = farthest index reachable with the current number of jumps; `farthest` = farthest reachable with one more jump.
2. Scan `i` from 0 to `n − 2`, updating `farthest = max(farthest, i + nums[i])`.
3. When `i` reaches `curEnd`, the current level is exhausted: take a jump (`jumps++`) and set `curEnd = farthest`.

**Dry run** `[2, 3, 1, 1, 4]`:

| i | farthest | i == curEnd? | jumps | curEnd |
|---|---|---|---|---|
| 0 | 2 | yes (0) | 1 | 2 |
| 1 | 4 | no | 1 | 2 |
| 2 | 4 | yes | 2 | 4 |
| 3 | 4 | no | 2 | 4 |

Answer **2** (0 → 1 → 4).

## gas-station

### Approach 1: Try every start
```cpp
class Solution {
public:
    int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
        int n = gas.size();
        for (int s = 0; s < n; ++s) {
            int tank = 0, k = 0;
            for (; k < n; ++k) {
                int i = (s + k) % n;
                tank += gas[i] - cost[i];
                if (tank < 0) break;
            }
            if (k == n) return s;
        }
        return -1;
    }
};
```

**Time:** O(n²) · **Space:** O(1).

### Approach 2: Minimum prefix sum
```cpp
class Solution {
public:
    int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
        int total = 0, minPrefix = INT_MAX, minIdx = 0;
        for (int i = 0; i < (int)gas.size(); ++i) {
            total += gas[i] - cost[i];
            if (total < minPrefix) { minPrefix = total; minIdx = i; }
        }
        if (total < 0) return -1;
        return (minIdx + 1) % gas.size();      // start right after the lowest point of the tank curve
    }
};
```

**Time:** O(n) · **Space:** O(1). Starting just after the global minimum of the running balance keeps the tank non-negative for the whole loop.

### Walkthrough
**Goal:** find the unique start index (if any) that completes the circle.

1. If `Σgas < Σcost`, impossible → −1. Otherwise a solution exists (and is unique).
2. Scan once with a running `tank`. If the tank drops below 0 at station `i`, then **no station from the current start up to `i` can be the start** (each would arrive at `i` with no more fuel than we had). Reset `start = i + 1`, `tank = 0`.
3. The final `start` is the answer.

**Dry run** `gas = [1,2,3,4,5]`, `cost = [3,4,5,1,2]` (diff `[−2,−2,−2,3,3]`):

| i | diff | tank | action |
|---|---|---|---|
| 0 | −2 | −2 | start = 1, tank 0 |
| 1 | −2 | −2 | start = 2, tank 0 |
| 2 | −2 | −2 | start = 3, tank 0 |
| 3 | 3 | 3 | |
| 4 | 3 | 6 | |

Total = 0 ≥ 0 → answer **3**.

## hand-of-straights

### Approach 1: Min-heap of distinct values
```cpp
class Solution {
public:
    bool isNStraightHand(vector<int>& hand, int k) {
        if (hand.size() % k) return false;
        unordered_map<int, int> cnt;
        for (int x : hand) ++cnt[x];
        priority_queue<int, vector<int>, greater<>> pq;
        for (auto& [v, c] : cnt) pq.push(v);
        while (!pq.empty()) {
            int start = pq.top();                       // smallest remaining card
            for (int v = start; v < start + k; ++v) {
                auto it = cnt.find(v);
                if (it == cnt.end() || it->second == 0) return false;
                if (--it->second == 0) {
                    if (v != pq.top()) return false;    // a value emptied before smaller ones: gap
                    pq.pop();
                }
            }
        }
        return true;
    }
};
```

**Time:** O(n log n) · **Space:** O(n). The classic NeetCode version.

### Approach 2: Sort the hand, greedily consume
```cpp
class Solution {
public:
    bool isNStraightHand(vector<int>& hand, int k) {
        if (hand.size() % k) return false;
        ranges::sort(hand);
        unordered_map<int, int> cnt;
        for (int x : hand) ++cnt[x];
        for (int x : hand) {                            // ascending: x is the smallest left when cnt>0
            if (cnt[x] == 0) continue;
            for (int v = x; v < x + k; ++v) {
                if (cnt[v] == 0) return false;
                --cnt[v];
            }
        }
        return true;
    }
};
```

**Time:** O(n log n + n·k) · **Space:** O(n).

### Walkthrough
**Goal:** split the hand into runs of `k` consecutive values.

1. Size not divisible by k → false.
2. Count each value in an **ordered** map.
3. Take the smallest value with count `c > 0`. It can't sit in the middle of a run (nothing smaller is left), so it must **start** `c` runs.
4. Subtract `c` from each of `v, v+1, …, v+k−1`; any shortfall → false.

**Dry run** `[1,2,3,6,2,3,4,7,8]`, `k = 3` → counts {1:1, 2:2, 3:2, 4:1, 6:1, 7:1, 8:1}:

| smallest | c | consume | counts after |
|---|---|---|---|
| 1 | 1 | 1,2,3 | {2:1, 3:1, 4:1, 6..8} |
| 2 | 1 | 2,3,4 | {6:1, 7:1, 8:1} |
| 6 | 1 | 6,7,8 | {} → **true** |

## merge-triplets-to-form-target-triplet

### Approach 1: Merge every safe triplet and compare
```cpp
class Solution {
public:
    bool mergeTriplets(vector<vector<int>>& ts, vector<int>& t) {
        vector<int> cur = {0, 0, 0};
        for (auto& x : ts)
            if (x[0] <= t[0] && x[1] <= t[1] && x[2] <= t[2])          // safe to merge
                for (int i = 0; i < 3; ++i) cur[i] = max(cur[i], x[i]);
        return cur == t;
    }
};
```

**Time:** O(n) · **Space:** O(1). The same insight expressed as "actually perform the merge".

### Approach 2: Brute force over subsets (small n only)
Trying every subset of triplets and merging is O(2ⁿ · n) — correct but useless beyond n ≈ 20. Mentioning it highlights that the greedy observation (merging a safe triplet never hurts) is what makes the problem linear.

### Walkthrough
**Goal:** can element-wise max of some triplets equal `target`?

1. A triplet with **any** coordinate greater than the target's would make that coordinate overshoot forever (max never decreases) → never use it.
2. All other triplets are "safe": merging them can only help, never overshoot.
3. So just check whether the safe triplets collectively hit each target coordinate exactly.

**Dry run** `ts = [[2,5,3],[1,8,4],[1,7,5]]`, target `[2,7,5]`:

| triplet | safe? | hits |
|---|---|---|
| [2,5,3] | yes | x = 2 ✔ |
| [1,8,4] | no (8 > 7) | — |
| [1,7,5] | yes | y = 7 ✔, z = 5 ✔ |

All three hit → **true**.

## partition-labels

### Approach 1: Merge per-letter intervals
```cpp
class Solution {
public:
    vector<int> partitionLabels(string s) {
        array<int, 26> first, last;
        first.fill(-1);
        for (int i = 0; i < (int)s.size(); ++i) {
            int c = s[i] - 'a';
            if (first[c] < 0) first[c] = i;
            last[c] = i;
        }
        vector<pair<int, int>> iv;
        for (int c = 0; c < 26; ++c) if (first[c] >= 0) iv.push_back({first[c], last[c]});
        ranges::sort(iv);
        vector<int> out;
        int start = iv[0].first, end = iv[0].second;
        for (size_t i = 1; i < iv.size(); ++i) {
            if (iv[i].first > end) { out.push_back(end - start + 1); start = iv[i].first; }
            end = max(end, iv[i].second);
        }
        out.push_back(end - start + 1);
        return out;
    }
};
```

**Time:** O(n) · **Space:** O(1). Shows the problem *is* Merge Intervals in disguise.

### Approach 2: Brute force — grow until closed
```cpp
class Solution {
public:
    vector<int> partitionLabels(string s) {
        vector<int> out;
        int start = 0, n = s.size();
        while (start < n) {
            int end = s.find_last_of(s[start]);         // must include the last copy of s[start]
            for (int i = start; i <= end; ++i)
                end = max(end, (int)s.find_last_of(s[i]));   // O(n) per lookup
            out.push_back(end - start + 1);
            start = end + 1;
        }
        return out;
    }
};
```

**Time:** O(n²) · **Space:** O(1). Precomputing `last[]` is what makes it linear.

### Walkthrough
**Goal:** cut `s` into the most pieces so each letter lives in exactly one piece.

1. Precompute `last[c]` = last index of each letter.
2. Scan with `end` = farthest last-occurrence of any letter seen in the current piece.
3. When `i == end`, every letter in the piece has ended → cut here.

**Dry run** `"ababcbacadefegdehijhklij"` (first piece):

| i | char | last[char] | end |
|---|---|---|---|
| 0 | a | 8 | 8 |
| 1 | b | 5 | 8 |
| 4 | c | 7 | 8 |
| 8 | a | 8 | 8 → **cut, size 9** |

Continuing gives `[9, 7, 8]`.

## valid-parenthesis-string

### Approach 1: Memoised recursion over (index, open count)
```cpp
class Solution {
    string s;
    vector<vector<int>> memo;                       // -1 unknown, 0 false, 1 true
    bool ok(int i, int open) {
        if (open < 0) return false;
        if (i == (int)s.size()) return open == 0;
        int& m = memo[i][open];
        if (m != -1) return m;
        bool r;
        if (s[i] == '(') r = ok(i + 1, open + 1);
        else if (s[i] == ')') r = ok(i + 1, open - 1);
        else r = ok(i + 1, open + 1) || ok(i + 1, open - 1) || ok(i + 1, open);   // '*' = ( or ) or empty
        return m = r;
    }
public:
    bool checkValidString(string str) {
        s = str;
        memo.assign(s.size(), vector<int>(s.size() + 1, -1));
        return ok(0, 0);
    }
};
```

**Time:** O(n²) · **Space:** O(n²). Natural first solution; the greedy compresses the set of possible `open` values into a range.

### Approach 2: Two stacks (indices of '(' and '*')
```cpp
class Solution {
public:
    bool checkValidString(string s) {
        vector<int> open, star;
        for (int i = 0; i < (int)s.size(); ++i) {
            if (s[i] == '(') open.push_back(i);
            else if (s[i] == '*') star.push_back(i);
            else {
                if (!open.empty()) open.pop_back();
                else if (!star.empty()) star.pop_back();      // use a '*' as '('
                else return false;
            }
        }
        while (!open.empty()) {                                // leftover '(' need a later '*' as ')'
            if (star.empty() || star.back() < open.back()) return false;
            open.pop_back(); star.pop_back();
        }
        return true;
    }
};
```

**Time:** O(n) · **Space:** O(n). Index comparison ensures a `*` used as `)` comes after its `(`.

### Walkthrough
**Goal:** is there *some* replacement of `*` that makes the string balanced?

1. Track the **range** `[lo, hi]` of possible open-parenthesis counts after each character.
2. `(` → both +1. `)` → both −1. `*` → `lo − 1` (as `)`) and `hi + 1` (as `(`).
3. If `hi < 0`, even treating every `*` as `(` can't save it → false.
4. Clamp `lo` at 0 (a negative count isn't a real option — we'd choose `*` as empty instead).
5. Valid iff `lo == 0` at the end (0 is within the reachable range).

**Dry run** `"(*))"`:

| char | lo | hi |
|---|---|---|
| ( | 1 | 1 |
| * | 0 | 2 |
| ) | 0 (clamped from −1) | 1 |
| ) | 0 (clamped) | 0 |

`lo == 0` → **true** (`*` = `(` gives `(())`).
