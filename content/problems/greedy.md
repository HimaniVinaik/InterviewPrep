# Greedy

**Recognise it when:** a locally optimal choice can be proven never to hurt the global answer. Usually after sorting, or by tracking a single "best so far" quantity.

**How to justify a greedy in an interview**
- **Exchange argument:** take any optimal solution; show swapping in your greedy choice doesn't make it worse.
- **Stays-ahead:** show your greedy is at least as good as any other solution after every step.
- If you can't convince yourself, try a small counter-example — and fall back to DP.

## Maximum Subarray
- difficulty: Medium
- leetcode: 53
- slug: maximum-subarray

Find the contiguous subarray with the largest sum.

### Hint
Kadane: a negative running prefix can only hurt — drop it.

### Solution
```cpp
class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int best = nums[0], cur = 0;
        for (int x : nums) {
            cur = max(x, cur + x);      // extend, or start fresh at x
            best = max(best, cur);
        }
        return best;
    }
};
```

### Explanation
`cur` is the best sum of a subarray **ending here**. It's both greedy and a 1-D DP (`dp[i] = max(a[i], dp[i-1] + a[i])`). Initialise `best = nums[0]` to handle all-negative arrays.

**Time:** O(n) · **Space:** O(1)

## Jump Game
- difficulty: Medium
- leetcode: 55
- slug: jump-game

`nums[i]` is your max jump length from `i`. Can you reach the last index?

### Hint
Track the farthest index reachable so far.

### Solution
```cpp
class Solution {
public:
    bool canJump(vector<int>& nums) {
        int reach = 0;
        for (int i = 0; i < (int)nums.size(); ++i) {
            if (i > reach) return false;            // stuck before i
            reach = max(reach, i + nums[i]);
        }
        return true;
    }
};
```

### Explanation
Every index up to `reach` is reachable, so we only need the frontier.

**Time:** O(n) · **Space:** O(1)

## Jump Game II
- difficulty: Medium
- leetcode: 45
- slug: jump-game-ii

Return the minimum number of jumps to reach the last index (always reachable).

### Hint
Implicit BFS: the current jump covers `[l, r]`; the next jump covers up to the farthest reach from that range.

### Solution
```cpp
class Solution {
public:
    int jump(vector<int>& nums) {
        int jumps = 0, curEnd = 0, farthest = 0;
        for (int i = 0; i + 1 < (int)nums.size(); ++i) {
            farthest = max(farthest, i + nums[i]);
            if (i == curEnd) {          // must jump to go further
                ++jumps;
                curEnd = farthest;
            }
        }
        return jumps;
    }
};
```

### Explanation
Each "level" of the BFS is a window of indices reachable with the same number of jumps. We never need a queue because levels are contiguous ranges.

**Time:** O(n) · **Space:** O(1)

## Gas Station
- difficulty: Medium
- leetcode: 134
- slug: gas-station

Circular route; `gas[i]` available, `cost[i]` to reach the next station. Return the starting index to complete the loop, or -1.

### Hint
If total gas < total cost, impossible. Otherwise, whenever the tank goes negative, the start must be after the current index.

### Solution
```cpp
class Solution {
public:
    int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
        int total = 0, tank = 0, start = 0;
        for (int i = 0; i < (int)gas.size(); ++i) {
            int d = gas[i] - cost[i];
            total += d;
            tank += d;
            if (tank < 0) { start = i + 1; tank = 0; }
        }
        return total < 0 ? -1 : start;
    }
};
```

### Explanation
If you run dry going from `s` to `i`, then no station between `s` and `i` works either (you'd arrive there with ≥ 0 gas, which is no better than starting with 0). So skip to `i + 1`.

**Time:** O(n) · **Space:** O(1)

## Hand of Straights
- difficulty: Medium
- leetcode: 846
- slug: hand-of-straights

Can the hand be rearranged into groups of `groupSize` consecutive cards?

### Hint
The smallest remaining card must start a group.

### Solution
```cpp
class Solution {
public:
    bool isNStraightHand(vector<int>& hand, int k) {
        if (hand.size() % k) return false;
        map<int, int> cnt;                          // ordered: smallest first
        for (int x : hand) ++cnt[x];
        for (auto& [start, c] : cnt) {
            if (c == 0) continue;
            int need = c;                           // that many groups start here
            for (int v = start; v < start + k; ++v) {
                auto it = cnt.find(v);
                if (it == cnt.end() || it->second < need) return false;
                it->second -= need;
            }
        }
        return true;
    }
};
```

### Explanation
The minimum card can't be in the middle of a group (nothing smaller exists), so it must start `c` groups. `std::map` keeps keys ordered; modifying values while iterating is safe (we don't insert or erase).

**Time:** O(n log n) · **Space:** O(n)

## Merge Triplets to Form Target Triplet
- difficulty: Medium
- leetcode: 1899
- slug: merge-triplets-to-form-target-triplet

You may merge triplets via element-wise max. Can you obtain `target`?

### Hint
Ignore any triplet that exceeds the target in some coordinate; the rest can be safely merged.

### Solution
```cpp
class Solution {
public:
    bool mergeTriplets(vector<vector<int>>& ts, vector<int>& t) {
        bool a = false, b = false, c = false;
        for (auto& x : ts) {
            if (x[0] > t[0] || x[1] > t[1] || x[2] > t[2]) continue;   // would overshoot
            a |= x[0] == t[0];
            b |= x[1] == t[1];
            c |= x[2] == t[2];
        }
        return a && b && c;
    }
};
```

### Explanation
Max never decreases, so any triplet exceeding the target poisons the result. Every "safe" triplet can be merged harmlessly; we just need each coordinate to be hit exactly by some safe triplet.

**Time:** O(n) · **Space:** O(1)

## Partition Labels
- difficulty: Medium
- leetcode: 763
- slug: partition-labels

Partition `s` into as many parts as possible so each letter appears in at most one part. Return part sizes.

### Hint
Record each letter's last occurrence; extend the current part's end to cover it.

### Solution
```cpp
class Solution {
public:
    vector<int> partitionLabels(string s) {
        array<int, 26> last{};
        for (int i = 0; i < (int)s.size(); ++i) last[s[i] - 'a'] = i;
        vector<int> out;
        int start = 0, end = 0;
        for (int i = 0; i < (int)s.size(); ++i) {
            end = max(end, last[s[i] - 'a']);
            if (i == end) { out.push_back(end - start + 1); start = i + 1; }
        }
        return out;
    }
};
```

### Explanation
A part can close only once we've passed the last occurrence of every letter it contains — essentially merging intervals `[first, last]` per letter.

**Time:** O(n) · **Space:** O(1)

## Valid Parenthesis String
- difficulty: Medium
- leetcode: 678
- slug: valid-parenthesis-string

`s` contains `(`, `)`, `*` (which may be `(`, `)` or empty). Is it valid?

### Hint
Track the range `[lo, hi]` of possible open-bracket counts.

### Solution
```cpp
class Solution {
public:
    bool checkValidString(string s) {
        int lo = 0, hi = 0;               // min / max possible open count
        for (char c : s) {
            if (c == '(') { ++lo; ++hi; }
            else if (c == ')') { --lo; --hi; }
            else { --lo; ++hi; }          // '*' could be ')' or '('
            if (hi < 0) return false;     // too many ')' even if all '*' are '('
            lo = max(lo, 0);              // can't have negative opens
        }
        return lo == 0;
    }
};
```

### Explanation
Instead of branching 3 ways per `*` (exponential), track the set of reachable counts — it's always a contiguous range. Valid if 0 is in the final range.

**Time:** O(n) · **Space:** O(1)
