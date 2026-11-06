## maximum-subarray

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

### Walkthrough
**Goal:** split the hand into runs of `groupSize` consecutive values.

1. Size not divisible by `groupSize` → false.
2. Count each value in an **ordered** map.
3. Take the smallest value with count `c > 0`. It can't sit in the middle of a run (nothing smaller is left), so it must **start** `c` runs.
4. Subtract `c` from each of `v, v+1, …, v+groupSize−1`; any shortfall → false.

**Dry run** `[1,2,3,6,2,3,4,7,8]`, `groupSize = 3` → counts {1:1, 2:2, 3:2, 4:1, 6:1, 7:1, 8:1}:

| smallest | c | consume | counts after |
|---|---|---|---|
| 1 | 1 | 1,2,3 | {2:1, 3:1, 4:1, 6..8} |
| 2 | 1 | 2,3,4 | {6:1, 7:1, 8:1} |
| 6 | 1 | 6,7,8 | {} → **true** |

## merge-triplets-to-form-target-triplet

### Walkthrough
**Goal:** can element-wise max of some triplets equal `target`?

1. A triplet with **any** coordinate greater than the target's would make that coordinate overshoot forever (max never decreases) → never use it.
2. All other triplets are "safe": merging them can only help, never overshoot.
3. So just check whether the safe triplets collectively hit each target coordinate exactly.

**Dry run** `triplets = [[2,5,3],[1,8,4],[1,7,5]]`, target `[2,7,5]`:

| triplet | safe? | hits |
|---|---|---|
| [2,5,3] | yes | x = 2 ✔ |
| [1,8,4] | no (8 > 7) | — |
| [1,7,5] | yes | y = 7 ✔, z = 5 ✔ |

All three hit → **true**.

## partition-labels

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
