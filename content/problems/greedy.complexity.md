## maximum-subarray
### Complexity
**Time:** one pass with two `max` operations per element → **O(n)**.

**Space:** `cur`, `best` → **O(1)**.

**Comparison:** brute force O(n²); divide and conquer O(n log n) (recurrence T(n) = 2T(n/2) + O(n)); Kadane is optimal because every element must be read.

## jump-game
### Complexity
**Time:** one pass, each index O(1) (a comparison and a `max`); it may exit early → **O(n)**.

**Space:** `reach` → **O(1)**.

**Comparison:** the reachability DP is O(n · max jump) time and O(n) space.

## jump-game-ii
### Complexity
**Time, step by step**
1. `i` runs from 0 to n − 2: n − 1 iterations.
2. Each iteration: one `max`, one comparison, maybe two assignments → O(1).
3. Total: **O(n)**.

**Space:** `jumps`, `curEnd`, `farthest` → **O(1)**.

**Why it's BFS:** each `[previous curEnd + 1, curEnd]` range is one BFS level; the greedy visits every index once, just like BFS visits every node once.

## gas-station
### Complexity
**Time:** one pass computing the running `total` and `tank` → **O(n)**.

**Space:** **O(1)**.

**Why one pass suffices:** whenever the tank goes negative at i, every start in `[start, i]` is ruled out at once, so no index is ever reconsidered — that's what turns the O(n²) "try every start" into O(n).

## hand-of-straights
### Complexity
**Time, step by step** (n cards, d distinct values, group size k)
1. Inserting n cards into the ordered map: O(n log d).
2. Iterating the d keys in order: O(d).
3. For each starting key, the group loop does k `find`s at O(log d) each. Each successful decrement removes cards, and there are only n cards, so the total successful work is O(n log d) (plus at most k lookups for a failing group).
4. Total: **O(n log n)**.

**Space:** map of d entries → **O(n)**.

## merge-triplets-to-form-target-triplet
### Complexity
**Time:** one pass over n triplets, O(1) per triplet (three comparisons, three ORs) → **O(n)**.

**Space:** three booleans → **O(1)**.

## partition-labels
### Complexity
**Time, step by step**
1. First pass records each letter's last index: O(n).
2. Second pass extends `end` and emits partitions: O(n).
3. Total: **O(n)**.

**Space:** `last[26]` → **O(1)** (output excluded).

## valid-parenthesis-string
### Complexity
**Time:** one pass updating `lo` and `hi` in O(1) per character → **O(n)**.

**Space:** two integers → **O(1)**.

**Comparison:** memoised recursion over (index, open count) is O(n²) time and space; the two-stack method is O(n) time and O(n) space. The range trick compresses the whole set of possible open counts into two numbers.
