## best-time-to-buy-and-sell-stock

### Approach 1: Brute force — every buy/sell pair
**The idea:** try buying on every day and selling on every later day.

```cpp
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int best = 0;
        int n = prices.size();

        for (int buy = 0; buy < n; buy++) {
            for (int sell = buy + 1; sell < n; sell++) {
                int profit = prices[sell] - prices[buy];
                best = max(best, profit);
            }
        }
        return best;
    }
};
```

**How it works:** checks every legal trade (sell after buy).

**Think of it like this:** looking back at a whole year of prices and testing every pair of dates.

**Cost:** Time **O(n²)**. Space **O(1)**.

### Approach 2: Kadane's algorithm on daily changes
**The idea:** the profit from buying on day b and selling on day s equals the sum of the daily price changes between them. So the answer is the maximum sum of consecutive daily changes.

```cpp
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int current = 0;   // best profit of a trade that ends today
        int best = 0;

        for (int i = 1; i < (int)prices.size(); i++) {
            int change = prices[i] - prices[i - 1];
            // Either extend the current trade by one day, or (if it's losing) start fresh.
            current = max(0, current + change);
            best = max(best, current);
        }
        return best;
    }
};
```

**How it works:** dropping a running total once it goes negative is exactly "buy again at a lower price".

**Think of it like this:** a running score of daily gains; whenever the score falls below zero, you reset it — that's like waiting for a cheaper buy day.

**Cost:** Time **O(n)**. Space **O(1)**. Connects this problem to Maximum Subarray.

### Optimal: Track the cheapest price so far
**The idea:** for each day, the best trade that sells today buys at the cheapest price seen before today.

```cpp
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int minPrice = INT_MAX;   // cheapest price seen so far
        int best = 0;             // best profit found so far

        for (int price : prices) {
            // Is today the cheapest day yet? Then it's the best day to have bought.
            minPrice = min(minPrice, price);
            // Profit if we sell today having bought at the cheapest price.
            best = max(best, price - minPrice);
        }
        return best;
    }
};
```

**How it works**
1. Walk through the days once.
2. Keep `minPrice`, the lowest price so far.
3. Selling today earns `price − minPrice`; keep the largest such profit.

**Think of it like this:** you remember the lowest price you've seen. Each day you ask "if I had bought at that lowest price, how much would I make by selling today?"

**Why it's optimal:** one pass, two variables.

**Cost:** Time **O(n)**. Space **O(1)**.

## longest-substring-without-repeating-characters

### Approach 1: Brute force — grow from every start
**The idea:** from each starting position, extend the substring until a character repeats.

```cpp
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        int n = s.size();
        int best = 0;

        for (int start = 0; start < n; start++) {
            bool seen[256] = {false};   // characters used in this substring
            for (int end = start; end < n; end++) {
                unsigned char c = s[end];
                if (seen[c]) {
                    break;               // repeat: this substring can't grow further
                }
                seen[c] = true;
                best = max(best, end - start + 1);
            }
        }
        return best;
    }
};
```

**How it works:** every substring without repeats is found from its own start.

**Think of it like this:** starting at every letter of a sentence and reading forward until you hit a letter you've already read.

**Cost:** Time **O(n²)** (each inner loop stops within 256 steps, so really O(n · 256)). Space **O(1)**.

### Approach 2: Sliding window with a set, shrinking one step at a time
**The idea:** keep a window `[left, right]` with no repeats. When the new character is already inside, shrink from the left until it isn't.

```cpp
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        unordered_set<char> window;   // characters currently in the window
        int left = 0;
        int best = 0;

        for (int right = 0; right < (int)s.size(); right++) {
            // Remove characters from the left until s[right] is no longer in the window.
            while (window.count(s[right]) > 0) {
                window.erase(s[left]);
                left++;
            }
            window.insert(s[right]);
            best = max(best, right - left + 1);
        }
        return best;
    }
};
```

**How it works:** each character enters the window once and leaves at most once → O(n) total.

**Think of it like this:** a caterpillar crawling along the string — its head moves forward; when it would contain two of the same letter, its tail moves up.

**Cost:** Time **O(n)**. Space **O(256)** = O(1).

### Optimal: Sliding window with "last seen" positions
**The idea:** remember where each character was last seen. When a repeat appears inside the window, jump `l` straight past the earlier copy.

```cpp
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // last[c] = index where character c was last seen (-1 = never).
        vector<int> last(256, -1);
        int l = 0;        // left edge of the window
        int best = 0;

        for (int r = 0; r < (int)s.size(); r++) {
            unsigned char c = s[r];

            // If c was seen INSIDE the current window, move l just past that copy.
            if (last[c] >= l) {
                l = last[c] + 1;
            }

            last[c] = r;                      // remember where c is now
            best = max(best, r - l + 1);      // window [l, r] has no repeats
        }
        return best;
    }
};
```

**How it works**
1. The window `[l, r]` never contains a repeated character.
2. When `s[r]` was last seen at position ≥ `l`, the window would contain it twice, so `l` jumps to just after that position.
3. `last[c] >= l` ignores old positions that are already outside the window.

**Think of it like this:** the caterpillar's tail can teleport — instead of shuffling forward one step at a time, it jumps straight past the duplicate.

**Why it's optimal:** exactly one step per character.

**Cost:** Time **O(n)**. Space **O(256)** = O(1).

## longest-repeating-character-replacement

### Approach 1: Brute force — every substring
**The idea:** for each substring, the replacements needed = length − count of its most common letter. Keep the longest substring needing ≤ k.

```cpp
class Solution {
public:
    int characterReplacement(string s, int k) {
        int n = s.size();
        int best = 0;

        for (int start = 0; start < n; start++) {
            int count[26] = {0};
            int maxCount = 0;   // count of the most common letter in s[start..end]
            for (int end = start; end < n; end++) {
                count[s[end] - 'A']++;
                maxCount = max(maxCount, count[s[end] - 'A']);
                int length = end - start + 1;
                // Letters that aren't the most common one must be replaced.
                if (length - maxCount <= k) {
                    best = max(best, length);
                }
            }
        }
        return best;
    }
};
```

**How it works:** the cheapest way to make a substring uniform is to keep its most frequent letter and replace all the others.

**Think of it like this:** repainting a fence segment one colour — you keep the most common colour and repaint the rest.

**Cost:** Time **O(n²)**. Space **O(1)**.

### Approach 2: One sliding window per target letter
**The idea:** for each letter X (A–Z), find the longest window with at most k letters that aren't X.

```cpp
class Solution {
public:
    int characterReplacement(string s, int k) {
        int best = 0;

        for (char target = 'A'; target <= 'Z'; target++) {
            int left = 0;
            int others = 0;   // letters in the window that are NOT target
            for (int right = 0; right < (int)s.size(); right++) {
                if (s[right] != target) {
                    others++;
                }
                // Too many letters to replace: shrink from the left.
                while (others > k) {
                    if (s[left] != target) {
                        others--;
                    }
                    left++;
                }
                best = max(best, right - left + 1);
            }
        }
        return best;
    }
};
```

**How it works:** fixing the target letter turns the problem into "longest window with at most k bad elements", a classic sliding window.

**Think of it like this:** 26 separate passes, each asking "how long a run could I make if everything became this letter?"

**Cost:** Time **O(26 · n)**. Space **O(1)**. Very easy to prove correct.

### Optimal: Single sliding window with the max frequency
**The idea:** a window is fine if `length − (count of its most frequent letter) ≤ k`. Grow the window; when it becomes invalid, slide it forward by one.

```cpp
class Solution {
public:
    int characterReplacement(string s, int k) {
        int cnt[26] = {0};   // letter counts inside the window
        int l = 0;
        int maxf = 0;        // highest single-letter count seen in a window so far
        int best = 0;

        for (int r = 0; r < (int)s.size(); r++) {
            // Add the new letter.
            cnt[s[r] - 'A']++;
            maxf = max(maxf, cnt[s[r] - 'A']);

            // Window needs more than k replacements: drop the leftmost letter.
            int length = r - l + 1;
            if (length - maxf > k) {
                cnt[s[l] - 'A']--;
                l++;
            }

            best = max(best, r - l + 1);
        }
        return best;
    }
};
```

**How it works**
1. Replacements needed = window length − `maxf`.
2. If that's more than k, move `l` one step — the window keeps its size instead of growing.
3. `maxf` is never decreased. That's fine: the answer only gets bigger when some window reaches a *bigger* `maxf`, so an old `maxf` can't create a wrong answer — it only stops the window from growing.

**Think of it like this:** the window is a sliding frame that only ever grows. It grows when it finds a run that needs ≤ k repaints; otherwise it slides along at its current size, looking for a better spot.

**Why it's optimal:** each letter enters and leaves the window once.

**Cost:** Time **O(n)**. Space **O(1)**.

## permutation-in-string

### Approach 1: Sort every window
**The idea:** a window of `s2` is a permutation of `s1` exactly when their sorted letters match.

```cpp
class Solution {
public:
    bool checkInclusion(string s1, string s2) {
        int n = s1.size();
        sort(s1.begin(), s1.end());

        for (int i = 0; i + n <= (int)s2.size(); i++) {
            string window = s2.substr(i, n);
            sort(window.begin(), window.end());
            if (window == s1) {
                return true;
            }
        }
        return false;
    }
};
```

**How it works:** sorting removes order, leaving only "which letters, how many".

**Think of it like this:** slide a frame over the text and, for each position, alphabetise the letters inside to compare with the alphabetised pattern.

**Cost:** Time **O((m − n) · n log n)**. Space **O(n)**.

### Approach 2: Sliding window with a "matches" counter
**The idea:** keep letter counts for the window and for `s1`, plus a number `matches` = how many of the 26 letters have equal counts. When `matches == 26`, the window is a permutation.

```cpp
class Solution {
public:
    bool checkInclusion(string s1, string s2) {
        int n = s1.size();
        int m = s2.size();
        if (n > m) {
            return false;
        }

        int need[26] = {0};
        int have[26] = {0};
        for (int i = 0; i < n; i++) {
            need[s1[i] - 'a']++;
            have[s2[i] - 'a']++;
        }

        // How many letters currently have equal counts.
        int matches = 0;
        for (int c = 0; c < 26; c++) {
            if (need[c] == have[c]) {
                matches++;
            }
        }

        for (int right = n; right < m; right++) {
            if (matches == 26) {
                return true;
            }

            // Letter entering the window.
            int in = s2[right] - 'a';
            if (have[in] == need[in]) {
                matches--;   // it was matching; it won't be after the change
            }
            have[in]++;
            if (have[in] == need[in]) {
                matches++;
            }

            // Letter leaving the window.
            int out = s2[right - n] - 'a';
            if (have[out] == need[out]) {
                matches--;
            }
            have[out]--;
            if (have[out] == need[out]) {
                matches++;
            }
        }
        return matches == 26;
    }
};
```

**How it works:** only two letters change per step, so we update `matches` for just those two instead of comparing all 26.

**Think of it like this:** a scoreboard with 26 lights; a light is green when that letter's count matches. Each slide changes at most two lights.

**Cost:** Time **O(m)** with O(1) work per step. Space **O(1)**.

### Optimal: Fixed-size window, compare counts
**The idea:** slide a window exactly as long as `s1` across `s2`, keeping letter counts; compare the window's counts with `s1`'s counts.

```cpp
class Solution {
public:
    bool checkInclusion(string s1, string s2) {
        int n = s1.size();
        int m = s2.size();
        if (n > m) {
            return false;
        }

        // Letter counts of s1, and of the current window of s2.
        vector<int> need(26, 0);
        vector<int> win(26, 0);
        for (char c : s1) {
            need[c - 'a']++;
        }

        for (int r = 0; r < m; r++) {
            // Add the letter entering on the right.
            win[s2[r] - 'a']++;

            // Once the window is longer than s1, remove the letter leaving on the left.
            if (r >= n) {
                win[s2[r - n] - 'a']--;
            }

            // Same counts = this window is a rearrangement of s1.
            if (win == need) {
                return true;
            }
        }
        return false;
    }
};
```

**How it works**
1. The window always covers the last `n` letters of `s2` (once we've read n letters).
2. Each step adds one letter and removes one — O(1) updates.
3. Comparing two 26-element vectors is a constant amount of work.

**Think of it like this:** a stencil the size of `s1` slid along `s2`; you keep a running tally of what's visible through the stencil.

**Why it's optimal:** O(m) — every letter of `s2` must be looked at.

**Cost:** Time **O(26 · m)** = O(m). Space **O(1)**.

## minimum-window-substring

### Approach 1: Brute force — every start, extend until covered
**The idea:** from each start, extend to the right until the window contains all of `t`; keep the shortest.

```cpp
class Solution {
public:
    string minWindow(string s, string t) {
        int need[128] = {0};
        for (char c : t) {
            need[c]++;
        }

        int bestStart = 0;
        int bestLen = INT_MAX;
        int n = s.size();

        for (int start = 0; start < n; start++) {
            int have[128] = {0};
            int formed = 0;   // how many characters of t (with repeats) are covered
            for (int end = start; end < n; end++) {
                char c = s[end];
                have[c]++;
                if (have[c] <= need[c]) {
                    formed++;   // this character was still needed
                }
                if (formed == (int)t.size()) {
                    if (end - start + 1 < bestLen) {
                        bestLen = end - start + 1;
                        bestStart = start;
                    }
                    break;   // extending further only makes it longer
                }
            }
        }

        if (bestLen == INT_MAX) {
            return "";
        }
        return s.substr(bestStart, bestLen);
    }
};
```

**How it works:** for each start, the first end that covers `t` gives the shortest window with that start.

**Think of it like this:** from every spot on a shopping street, walk until you've passed all the shops on your list; remember the shortest walk.

**Cost:** Time **O(n²)**. Space **O(1)**.

### Approach 2: Sliding window over only the useful positions
**The idea:** characters not in `t` can't start or end a minimal window. List only the positions of useful characters and slide a window over that shorter list.

```cpp
class Solution {
public:
    string minWindow(string s, string t) {
        int need[128] = {0};
        for (char c : t) {
            need[c]++;
        }

        // Positions in s of characters that appear in t.
        vector<int> pos;
        for (int i = 0; i < (int)s.size(); i++) {
            if (need[s[i]] > 0) {
                pos.push_back(i);
            }
        }

        int have[128] = {0};
        int formed = 0;
        int left = 0;
        int bestStart = 0;
        int bestLen = INT_MAX;

        for (int right = 0; right < (int)pos.size(); right++) {
            char c = s[pos[right]];
            have[c]++;
            if (have[c] <= need[c]) {
                formed++;
            }

            // Shrink from the left while the window still covers t.
            while (formed == (int)t.size()) {
                int length = pos[right] - pos[left] + 1;
                if (length < bestLen) {
                    bestLen = length;
                    bestStart = pos[left];
                }
                char d = s[pos[left]];
                have[d]--;
                if (have[d] < need[d]) {
                    formed--;   // we just lost a needed character
                }
                left++;
            }
        }

        if (bestLen == INT_MAX) {
            return "";
        }
        return s.substr(bestStart, bestLen);
    }
};
```

**How it works:** the same expand/shrink window, but skipping irrelevant characters entirely.

**Think of it like this:** before searching, cross out every shop on the street that isn't on your list.

**Cost:** Time **O(|s| + |t|)**. Space **O(|s|)**. Faster when `t`'s letters are rare in `s`.

### Optimal: Expand / shrink sliding window
**The idea:** expand the right edge until the window contains everything in `t`; then shrink the left edge as far as possible while it still does. Record each minimal window.

```cpp
class Solution {
public:
    string minWindow(string s, string t) {
        // need[c] = how many more copies of c the window still needs.
        // It can go negative: that means the window has extra copies.
        int need[128] = {0};
        for (char c : t) {
            need[c]++;
        }

        int missing = t.size();   // total characters of t still missing from the window
        int l = 0;
        int bestL = 0;
        int bestLen = INT_MAX;

        for (int r = 0; r < (int)s.size(); r++) {
            // Expand: take s[r] into the window.
            char c = s[r];
            if (need[c] > 0) {
                missing--;        // it was a character we still needed
            }
            need[c]--;

            // The window now covers t: shrink it from the left as much as possible.
            while (missing == 0) {
                if (r - l + 1 < bestLen) {
                    bestLen = r - l + 1;
                    bestL = l;
                }
                char d = s[l];
                need[d]++;        // give s[l] back
                if (need[d] > 0) {
                    missing++;    // we just removed a needed character: window no longer valid
                }
                l++;
            }
        }

        if (bestLen == INT_MAX) {
            return "";
        }
        return s.substr(bestL, bestLen);
    }
};
```

**How it works**
1. `need[c]` counts what the window still lacks; `missing` is the total lacking.
2. Moving `r` adds a character; if it was needed, `missing` drops.
3. When `missing == 0` the window is valid; shrink from `l`, recording the length, until removing a character makes it invalid again.

**Think of it like this:** a tape measure along a street. Stretch the end until all your shops are inside; then reel in the start until you'd lose a shop. That's the shortest walk ending here.

**Why it's optimal:** both edges only move forward: at most 2|s| moves.

**Cost:** Time **O(|s| + |t|)**. Space **O(1)** (128 counters).

## sliding-window-maximum

### Approach 1: Brute force — max of each window
**The idea:** for every window, scan its k elements.

```cpp
class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        vector<int> result;
        for (int start = 0; start + k <= (int)nums.size(); start++) {
            int biggest = nums[start];
            for (int i = start; i < start + k; i++) {
                biggest = max(biggest, nums[i]);
            }
            result.push_back(biggest);
        }
        return result;
    }
};
```

**How it works:** direct definition.

**Think of it like this:** moving a magnifying glass along the array and re-reading every number under it each time.

**Cost:** Time **O(n · k)**. Space **O(1)** extra.

### Approach 2: Max-heap with lazy removal
**The idea:** keep (value, index) pairs in a max-heap. Before reading the top, throw away tops whose index has left the window.

```cpp
class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        priority_queue<pair<int, int>> heap;   // (value, index), largest value on top
        vector<int> result;

        for (int i = 0; i < (int)nums.size(); i++) {
            heap.push({nums[i], i});

            // Once the first window is complete, record its maximum.
            if (i >= k - 1) {
                // Remove maxima that are no longer inside the window [i-k+1, i].
                while (heap.top().second <= i - k) {
                    heap.pop();
                }
                result.push_back(heap.top().first);
            }
        }
        return result;
    }
};
```

**How it works:** outdated elements are only removed when they reach the top — "lazy deletion".

**Think of it like this:** a podium of the tallest people; if the tallest has already left the room, you remove them only when you look at the podium.

**Cost:** Time **O(n log n)**. Space **O(n)**.

### Approach 3: Block prefix/suffix maxima
**The idea:** split the array into blocks of size k. Any window covers the end of one block and the start of the next, so its max = max(suffix max of the first part, prefix max of the second part).

```cpp
class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        int n = nums.size();
        vector<int> prefixMax(n);   // max from the start of the block up to i
        vector<int> suffixMax(n);   // max from i to the end of the block

        for (int i = 0; i < n; i++) {
            if (i % k == 0) {
                prefixMax[i] = nums[i];                       // a new block starts
            } else {
                prefixMax[i] = max(prefixMax[i - 1], nums[i]);
            }
        }
        for (int i = n - 1; i >= 0; i--) {
            if (i == n - 1 || (i + 1) % k == 0) {
                suffixMax[i] = nums[i];                       // a block ends here
            } else {
                suffixMax[i] = max(suffixMax[i + 1], nums[i]);
            }
        }

        vector<int> result;
        for (int start = 0; start + k <= n; start++) {
            int end = start + k - 1;
            result.push_back(max(suffixMax[start], prefixMax[end]));
        }
        return result;
    }
};
```

**How it works:** precomputed maxima answer every window in O(1).

**Think of it like this:** a window over two pages of a book — you already know the biggest number on the tail of the first page and the head of the second.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: Monotonic deque
**The idea:** keep indices in a deque whose values decrease from front to back. The front is always the window's maximum.

```cpp
class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        deque<int> dq;   // indices; nums[dq[0]] > nums[dq[1]] > ...
        vector<int> out;

        for (int i = 0; i < (int)nums.size(); i++) {
            // 1. Drop the front if it has slid out of the window [i-k+1, i].
            if (!dq.empty() && dq.front() <= i - k) {
                dq.pop_front();
            }

            // 2. Drop smaller values from the back: they can never be a maximum again,
            //    because nums[i] is bigger AND stays in the window longer.
            while (!dq.empty() && nums[dq.back()] <= nums[i]) {
                dq.pop_back();
            }

            // 3. Add the current index.
            dq.push_back(i);

            // 4. Once the first window is complete, the front is its maximum.
            if (i >= k - 1) {
                out.push_back(nums[dq.front()]);
            }
        }
        return out;
    }
};
```

**How it works**
1. Values in the deque decrease from front to back, so the front is the largest.
2. A new value removes every smaller value behind it — they're "dominated".
3. The front is removed once it falls out of the window.
4. Each index is added once and removed once → O(n).

**Think of it like this:** a queue for a ride where a taller person arriving makes everyone shorter in front of them give up (they'll never be the tallest while the tall person is there). The person at the front is always the tallest in the window.

**Why it's optimal:** linear time with only O(k) memory.

**Cost:** Time **O(n)**. Space **O(k)**.
