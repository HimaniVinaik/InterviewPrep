## valid-palindrome

### Approach 1: Build a cleaned copy, compare with its reverse
**The idea:** keep only letters and digits (lower-cased), then check whether that cleaned string reads the same backwards.

```cpp
class Solution {
public:
    bool isPalindrome(string s) {
        // Step 1: keep only letters/digits, in lower case.
        string cleaned;
        for (char c : s) {
            // isalnum/tolower need an unsigned char to be safe with non-ASCII bytes.
            unsigned char uc = (unsigned char)c;
            if (isalnum(uc)) {
                cleaned += (char)tolower(uc);
            }
        }

        // Step 2: build the reversed copy.
        string reversed(cleaned.rbegin(), cleaned.rend());

        // Step 3: a palindrome equals its own reverse.
        return cleaned == reversed;
    }
};
```

**How it works:** "A man, a plan" becomes "amanaplan…"; comparing it with its reverse answers the question directly.

**Think of it like this:** rewrite the sentence neatly on a fresh piece of paper, then hold it up to a mirror.

**Cost:** Time **O(n)**. Space **O(n)** for the two copies.

### Approach 2: Cleaned copy + two pointers
**The idea:** same cleaning step, but compare characters from both ends instead of building a reversed copy.

```cpp
class Solution {
public:
    bool isPalindrome(string s) {
        string cleaned;
        for (char c : s) {
            unsigned char uc = (unsigned char)c;
            if (isalnum(uc)) {
                cleaned += (char)tolower(uc);
            }
        }

        // Compare the first and last characters, then move inward.
        int left = 0;
        int right = (int)cleaned.size() - 1;
        while (left < right) {
            if (cleaned[left] != cleaned[right]) {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }
};
```

**How it works:** a palindrome mirrors around its middle, so position `i` from the left must equal position `i` from the right.

**Think of it like this:** two people start at opposite ends of a word and walk toward each other, comparing the letters they're standing on.

**Cost:** Time **O(n)**. Space **O(n)** for the cleaned copy.

### Optimal: Two pointers on the original string
**The idea:** don't make a copy at all — move the pointers past punctuation as you go.

```cpp
class Solution {
public:
    bool isPalindrome(string s) {
        int left = 0;
        int right = (int)s.size() - 1;

        while (left < right) {
            // Skip anything that isn't a letter or digit on the left side.
            while (left < right && !isalnum((unsigned char)s[left])) {
                left++;
            }
            // ...and on the right side.
            while (left < right && !isalnum((unsigned char)s[right])) {
                right--;
            }

            // Compare ignoring upper/lower case.
            char a = (char)tolower((unsigned char)s[left]);
            char b = (char)tolower((unsigned char)s[right]);
            if (a != b) {
                return false;
            }

            // Both characters matched: move inward.
            left++;
            right--;
        }
        return true;
    }
};
```

**How it works**
1. `left` starts at the beginning, `right` at the end.
2. Each pointer skips characters we must ignore (spaces, commas, colons).
3. Compare the two characters in lower case; any mismatch means "not a palindrome".
4. Move both inward and repeat until they meet.

**Think of it like this:** reading the sentence from both ends at once with two fingers, sliding a finger past anything that isn't a letter.

**Why it's optimal:** each character is visited at most once (O(n)) and no extra memory is used.

**Cost:** Time **O(n)**. Space **O(1)**.

## two-sum-ii-input-array-is-sorted

### Approach 1: Binary search for each partner
**The idea:** for each number, binary-search the rest of the (sorted) array for `target − number`.

```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& numbers, int target) {
        int n = numbers.size();

        for (int i = 0; i < n; i++) {
            int need = target - numbers[i];

            // Binary search for `need` in numbers[i+1 .. n-1].
            int lo = i + 1;
            int hi = n - 1;
            while (lo <= hi) {
                int mid = lo + (hi - lo) / 2;
                if (numbers[mid] == need) {
                    // The problem uses 1-based indices.
                    return {i + 1, mid + 1};
                }
                if (numbers[mid] < need) {
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }
        }
        return {};
    }
};
```

**How it works:** sortedness lets us find a specific partner in O(log n) instead of scanning.

**Think of it like this:** for each person, look up their partner in an alphabetised phone book instead of reading every page.

**Cost:** Time **O(n log n)**. Space **O(1)**.

### Approach 2: Hash map (ignores that the input is sorted)
**The idea:** the classic Two Sum solution: remember each value's index and look up the partner.

```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& numbers, int target) {
        unordered_map<int, int> indexOf;   // value -> index

        for (int i = 0; i < (int)numbers.size(); i++) {
            int need = target - numbers[i];
            if (indexOf.count(need) > 0) {
                return {indexOf[need] + 1, i + 1};
            }
            indexOf[numbers[i]] = i;
        }
        return {};
    }
};
```

**How it works:** same as Two Sum I. It's O(n), but uses O(n) memory, which this problem asks you to avoid.

**Think of it like this:** keeping a notebook of everyone you've met, when the people are already standing in order of height — the notebook is unnecessary.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: Two pointers from both ends
**The idea:** start with the smallest and largest numbers. If the sum is too small, move the left pointer right (to a bigger number); if too big, move the right pointer left.

```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& numbers, int target) {
        int l = 0;                         // smallest number
        int r = (int)numbers.size() - 1;   // largest number

        while (l < r) {
            int sum = numbers[l] + numbers[r];

            if (sum == target) {
                return {l + 1, r + 1};     // answer is 1-indexed
            }

            if (sum < target) {
                // We need a bigger sum: only moving l right can increase it.
                l++;
            } else {
                // We need a smaller sum: only moving r left can decrease it.
                r--;
            }
        }
        return {};
    }
};
```

**How it works**
1. If `numbers[l] + numbers[r]` is too small, then `numbers[l]` is too small to pair with *anything* (the largest remaining value didn't help), so discard it.
2. If the sum is too big, `numbers[r]` is too big to pair with anything, so discard it.
3. Every step throws away one candidate, so at most n steps.

**Think of it like this:** balancing a seesaw with one person from each end of a line sorted by weight — if your side is too light, swap in the next heavier person; if too heavy, the next lighter one.

**Why it's optimal:** O(n) time with O(1) memory — we can't do better than looking at each number once.

**Cost:** Time **O(n)**. Space **O(1)**.

## 3sum

### Approach 1: Brute force with a set to remove duplicates
**The idea:** try every triple; store sorted triples in a set so duplicates disappear.

```cpp
class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        // Sorting first means each triple comes out in sorted order,
        // so equal triples look identical and the set can remove repeats.
        sort(nums.begin(), nums.end());
        set<vector<int>> unique;
        int n = nums.size();

        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                for (int k = j + 1; k < n; k++) {
                    if (nums[i] + nums[j] + nums[k] == 0) {
                        unique.insert({nums[i], nums[j], nums[k]});
                    }
                }
            }
        }

        // Copy the set into the result.
        vector<vector<int>> result(unique.begin(), unique.end());
        return result;
    }
};
```

**How it works:** checks all n³/6 triples.

**Think of it like this:** trying every possible group of three people from a crowd.

**Cost:** Time **O(n³)**. Space **O(number of answers)**. Too slow for n = 3000.

### Approach 2: Fix one number, use a hash set for the other two
**The idea:** for each first number, the problem becomes "Two Sum = −first" on the rest, solvable with a hash set.

```cpp
class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        vector<vector<int>> result;
        int n = nums.size();

        for (int i = 0; i < n; i++) {
            // Skip a first number we've already used, to avoid duplicate triples.
            if (i > 0 && nums[i] == nums[i - 1]) {
                continue;
            }

            unordered_set<int> seen;   // values seen to the right of i
            for (int j = i + 1; j < n; j++) {
                int need = -nums[i] - nums[j];
                if (seen.count(need) > 0) {
                    result.push_back({nums[i], need, nums[j]});
                    // Skip equal third numbers so the same triple isn't added again.
                    while (j + 1 < n && nums[j] == nums[j + 1]) {
                        j++;
                    }
                }
                seen.insert(nums[j]);
            }
        }
        return result;
    }
};
```

**How it works:** the outer loop fixes `nums[i]`; the inner loop is the one-pass Two Sum looking for `−nums[i]`.

**Think of it like this:** choose a team captain, then find two teammates whose numbers cancel the captain's.

**Cost:** Time **O(n²)**. Space **O(n)**.

### Optimal: Sort + fix one number + two pointers
**The idea:** sort; for each first number, find the other two with the two-pointer method from Two Sum II. Duplicates are skipped by comparing with the previous value.

```cpp
class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        vector<vector<int>> res;
        int n = nums.size();

        for (int i = 0; i < n - 2; i++) {
            // A positive first number means all three are positive: sum can't be 0.
            if (nums[i] > 0) {
                break;
            }
            // Same first number as last time: we'd find the same triples again.
            if (i > 0 && nums[i] == nums[i - 1]) {
                continue;
            }

            int l = i + 1;
            int r = n - 1;
            while (l < r) {
                int sum = nums[i] + nums[l] + nums[r];

                if (sum < 0) {
                    l++;              // need bigger
                } else if (sum > 0) {
                    r--;              // need smaller
                } else {
                    res.push_back({nums[i], nums[l], nums[r]});
                    l++;
                    r--;
                    // Skip repeated second numbers so we don't record the same triple twice.
                    while (l < r && nums[l] == nums[l - 1]) {
                        l++;
                    }
                }
            }
        }
        return res;
    }
};
```

**How it works**
1. Sorting makes duplicates adjacent and lets two pointers work.
2. For each `i`, the pair `(l, r)` searches the rest for a sum of `−nums[i]`.
3. After a match, move both pointers and skip equal values to avoid repeating the same triple.

**Think of it like this:** 3Sum is "Two Sum II, done once for every possible first number".

**Why it's optimal:** O(n²) is believed to be the best possible for 3Sum in general, and this version uses no extra memory.

**Cost:** Time **O(n²)**. Space **O(1)** extra (ignoring the output and the sort).

## container-with-most-water

### Approach 1: Brute force — every pair of lines
**The idea:** compute the water for every pair of lines and keep the best.

```cpp
class Solution {
public:
    int maxArea(vector<int>& height) {
        int best = 0;
        int n = height.size();

        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                // Water level is limited by the shorter line.
                int h = min(height[i], height[j]);
                int width = j - i;
                best = max(best, h * width);
            }
        }
        return best;
    }
};
```

**How it works:** area = (shorter height) × (distance between lines); try them all.

**Think of it like this:** trying every pair of fence posts to see which holds the most water between them.

**Cost:** Time **O(n²)**. Space **O(1)**.

### Approach 2: Two pointers, skipping lines that can't help
**The idea:** the optimal two-pointer method, plus a shortcut: after measuring, skip every line that isn't taller than the current water level.

```cpp
class Solution {
public:
    int maxArea(vector<int>& height) {
        int left = 0;
        int right = (int)height.size() - 1;
        int best = 0;

        while (left < right) {
            int level = min(height[left], height[right]);
            best = max(best, level * (right - left));

            // Any line not taller than `level` can't beat what we just measured
            // (it's narrower AND no taller), so skip all of them.
            while (left < right && height[left] <= level) {
                left++;
            }
            while (left < right && height[right] <= level) {
                right--;
            }
        }
        return best;
    }
};
```

**How it works:** same logic as the optimal version, but it can skip several useless lines per step.

**Think of it like this:** after measuring at water level 5, there's no point testing any post shorter than 5 — the container would be both narrower and lower.

**Cost:** Time **O(n)**. Space **O(1)**.

### Optimal: Two pointers — always move the shorter line
**The idea:** start with the widest container (first and last line). The shorter line limits the water; moving the taller line can only make things worse, so move the shorter one inward.

```cpp
class Solution {
public:
    int maxArea(vector<int>& h) {
        int l = 0;
        int r = (int)h.size() - 1;
        int best = 0;

        while (l < r) {
            // Water area between the two lines.
            int area = min(h[l], h[r]) * (r - l);
            best = max(best, area);

            // Move whichever line is shorter.
            if (h[l] < h[r]) {
                l++;
            } else {
                r--;
            }
        }
        return best;
    }
};
```

**How it works**
1. The area depends on the **shorter** line and the width.
2. If we moved the taller line inward, the width shrinks and the height can't go above the shorter line — the area can only drop.
3. So the shorter line has already given its best possible container; discard it and move on.

**Think of it like this:** two people holding a sheet between them at different heights. The water spills over the lower hand. Moving the higher person closer only makes the sheet narrower — the only hope for more water is to replace the lower hand with a taller one.

**Why it's optimal:** each step discards one line, so n − 1 steps total; we must look at every line at least once.

**Cost:** Time **O(n)**. Space **O(1)**.

## trapping-rain-water

### Approach 1: Brute force — look left and right from every bar
**The idea:** water above a bar = min(tallest bar on its left, tallest on its right) − its own height.

```cpp
class Solution {
public:
    int trap(vector<int>& height) {
        int n = height.size();
        int water = 0;

        for (int i = 0; i < n; i++) {
            // Tallest bar from the start up to i.
            int leftMax = 0;
            for (int j = 0; j <= i; j++) {
                leftMax = max(leftMax, height[j]);
            }
            // Tallest bar from i to the end.
            int rightMax = 0;
            for (int j = i; j < n; j++) {
                rightMax = max(rightMax, height[j]);
            }
            // Water rises to the lower of the two walls.
            water += min(leftMax, rightMax) - height[i];
        }
        return water;
    }
};
```

**How it works:** water at a position is held in by the highest wall on each side; it rises to the lower of those two walls.

**Think of it like this:** standing on one bar, look left for the tallest wall and right for the tallest wall — the water reaches the shorter of the two.

**Cost:** Time **O(n²)**. Space **O(1)**.

### Approach 2: Precompute the tallest walls on each side
**The idea:** store the left maxima and right maxima in two arrays so each is computed once.

```cpp
class Solution {
public:
    int trap(vector<int>& height) {
        int n = height.size();
        if (n == 0) {
            return 0;
        }

        // leftMax[i] = tallest bar in height[0..i]
        vector<int> leftMax(n);
        leftMax[0] = height[0];
        for (int i = 1; i < n; i++) {
            leftMax[i] = max(leftMax[i - 1], height[i]);
        }

        // rightMax[i] = tallest bar in height[i..n-1]
        vector<int> rightMax(n);
        rightMax[n - 1] = height[n - 1];
        for (int i = n - 2; i >= 0; i--) {
            rightMax[i] = max(rightMax[i + 1], height[i]);
        }

        int water = 0;
        for (int i = 0; i < n; i++) {
            water += min(leftMax[i], rightMax[i]) - height[i];
        }
        return water;
    }
};
```

**How it works:** the same formula as the brute force, with the two maxima looked up instead of recomputed.

**Think of it like this:** walk the skyline once from the left writing down "tallest so far", once from the right doing the same, then combine the two lists.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 3: Monotonic stack (fill water layer by layer)
**The idea:** keep a stack of bars with decreasing heights. When a taller bar arrives, it forms the right wall of a "pool" whose bottom is the popped bar.

```cpp
class Solution {
public:
    int trap(vector<int>& height) {
        vector<int> stack;   // indices; their heights decrease from bottom to top
        int water = 0;

        for (int i = 0; i < (int)height.size(); i++) {
            // While the current bar is taller than the bar on top of the stack,
            // that top bar is the floor of a pool.
            while (!stack.empty() && height[i] > height[stack.back()]) {
                int floorIndex = stack.back();
                stack.pop_back();

                // No left wall: water would just run off.
                if (stack.empty()) {
                    break;
                }

                int leftWall = stack.back();
                int width = i - leftWall - 1;
                int depth = min(height[leftWall], height[i]) - height[floorIndex];
                water += width * depth;   // add one horizontal slab of water
            }
            stack.push_back(i);
        }
        return water;
    }
};
```

**How it works:** water is added in horizontal slabs between a left wall (on the stack) and the current bar (the right wall).

**Think of it like this:** filling a canyon one horizontal layer at a time instead of one vertical column at a time.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: Two pointers with running maxima
**The idea:** whichever side has the **shorter** wall decides how much water its next bar holds — so process that side and move inward, keeping only two running maxima.

```cpp
class Solution {
public:
    int trap(vector<int>& h) {
        int l = 0;
        int r = (int)h.size() - 1;
        int leftMax = 0;    // tallest bar seen from the left so far
        int rightMax = 0;   // tallest bar seen from the right so far
        int water = 0;

        while (l < r) {
            if (h[l] < h[r]) {
                // The right side has a wall at least as tall as h[r] > h[l],
                // so water at l is limited only by leftMax.
                leftMax = max(leftMax, h[l]);
                water += leftMax - h[l];
                l++;
            } else {
                // Mirror image: water at r is limited only by rightMax.
                rightMax = max(rightMax, h[r]);
                water += rightMax - h[r];
                r--;
            }
        }
        return water;
    }
};
```

**How it works**
1. Water at a bar = min(tallest left, tallest right) − its height.
2. If `h[l] < h[r]`, we already know there is a wall on the right at least as tall as `h[r]`, which is taller than `h[l]`. So the **left** maximum is the smaller wall and decides the water at `l`.
3. Add that water, move `l` right. Otherwise do the same on the right side.

**Think of it like this:** two people walking in from the ends of a valley. The one standing on lower ground always moves, because the higher ground on the other side guarantees the water is held in on that side.

**Why it's optimal:** one pass, O(1) memory — the best possible.

**Cost:** Time **O(n)**. Space **O(1)**.

## move-zeroes

### Approach 1: Copy into a new array
**The idea:** collect the non-zeros in order, then fill the rest with zeros.

```cpp
class Solution {
public:
    void moveZeroes(vector<int>& nums) {
        vector<int> result;

        // Keep every non-zero, in the same order.
        for (int x : nums) {
            if (x != 0) {
                result.push_back(x);
            }
        }

        // Pad with zeros up to the original length.
        while (result.size() < nums.size()) {
            result.push_back(0);
        }

        nums = result;
    }
};
```

**How it works:** straightforward, but it uses extra memory, which the problem forbids ("in place").

**Think of it like this:** copying the non-empty boxes onto a new shelf, then filling the end with empty boxes.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 2: Compact the non-zeros, then fill zeros
**The idea:** write each non-zero into the next free spot at the front; afterwards set the tail to zero.

```cpp
class Solution {
public:
    void moveZeroes(vector<int>& nums) {
        int write = 0;   // next position for a non-zero

        for (int read = 0; read < (int)nums.size(); read++) {
            if (nums[read] != 0) {
                nums[write] = nums[read];
                write++;
            }
        }

        // Everything after the last non-zero becomes zero.
        for (int i = write; i < (int)nums.size(); i++) {
            nums[i] = 0;
        }
    }
};
```

**How it works:** `write` never gets ahead of `read`, so we never overwrite a value we haven't read yet.

**Think of it like this:** sliding all the books to the left end of a shelf, then putting bookends (zeros) in the gap on the right.

**Cost:** Time **O(n)**. Space **O(1)**.

### Optimal: Swap non-zeros forward
**The idea:** one pass — when we find a non-zero, swap it into the `write` position. Zeros naturally drift to the end.

```cpp
class Solution {
public:
    void moveZeroes(vector<int>& nums) {
        int write = 0;   // nums[0..write) holds the non-zeros found so far

        for (int read = 0; read < (int)nums.size(); read++) {
            if (nums[read] != 0) {
                // Put the non-zero at the front block; the zero (if any) goes back to `read`.
                swap(nums[write], nums[read]);
                write++;
            }
        }
    }
};
```

**How it works**
1. Positions before `write` contain the non-zeros found so far, in their original order.
2. Positions between `write` and `read` are all zeros.
3. Swapping a new non-zero into `write` keeps both facts true.

**Think of it like this:** people in a line where some seats are empty — each person just swaps into the first empty seat in front of them.

**Why it's optimal:** a single pass, no extra memory, and the relative order of the non-zeros is preserved.

**Cost:** Time **O(n)**. Space **O(1)**.
