## valid-parentheses

### Approach 1: Repeatedly remove matched pairs
```cpp
class Solution {
public:
    bool isValid(string s) {
        size_t before;
        do {
            before = s.size();
            for (const char* p : {"()", "[]", "{}"})
                for (size_t pos; (pos = s.find(p)) != string::npos; ) s.erase(pos, 2);
        } while (s.size() != before);
        return s.empty();
    }
};
```

**Time:** O(n²) · **Space:** O(1) extra. Intuitive ("innermost pairs vanish first") but slow.

### Approach 2: Stack of openers + lookup map
```cpp
class Solution {
public:
    bool isValid(string s) {
        const unordered_map<char, char> match{{')', '('}, {']', '['}, {'}', '{'}};
        stack<char> st;
        for (char c : s) {
            if (auto it = match.find(c); it != match.end()) {      // closing bracket
                if (st.empty() || st.top() != it->second) return false;
                st.pop();
            } else {
                st.push(c);                                         // opening bracket
            }
        }
        return st.empty();
    }
};
```

**Time:** O(n) · **Space:** O(n). The textbook version; Optimal pushes the expected closer instead.

### Walkthrough
**Goal:** every closer must match the most recent unmatched opener (LIFO → stack).

1. Scan characters left to right.
2. Opener → push the closer we will *expect* (`(` pushes `)`).
3. Closer → the stack top must equal it. Empty stack or mismatch → invalid. Otherwise pop.
4. At the end, leftovers mean unclosed openers → invalid.

**Dry run** `"([)]"`:

| c | stack before | action | stack after |
|---|---|---|---|
| ( | [] | push ) | [)] |
| [ | [)] | push ] | [), ]] |
| ) | [), ]] | top is ] ≠ ) | **false** |

And `"{[]}"`: push }, push ], pop ], pop } → empty → true.

**Quick reject:** odd length → false immediately.

## min-stack

### Approach 1: Scan for the minimum on demand
```cpp
class MinStack {
    vector<int> st;
public:
    void push(int v) { st.push_back(v); }
    void pop() { st.pop_back(); }
    int top() { return st.back(); }
    int getMin() { return *min_element(st.begin(), st.end()); }   // O(n)
};
```

**Time:** getMin O(n) · **Space:** O(n). Fails the O(1) requirement.

### Approach 2: Two stacks (min stack only grows on new minima)
```cpp
class MinStack {
    vector<int> st, mins;            // mins.back() is the current minimum
public:
    void push(int v) {
        st.push_back(v);
        if (mins.empty() || v <= mins.back()) mins.push_back(v);   // <= keeps duplicates
    }
    void pop() {
        if (st.back() == mins.back()) mins.pop_back();
        st.pop_back();
    }
    int top() { return st.back(); }
    int getMin() { return mins.back(); }
};
```

**Time:** O(1) all · **Space:** O(n) worst, often much less than storing a pair per element.

### Approach 3: Single stack storing differences (O(1) extra beyond values)
```cpp
class MinStack {
    vector<long long> st;            // stores value - min (before push)
    long long mn = 0;
public:
    void push(int v) {
        if (st.empty()) { st.push_back(0); mn = v; }
        else { st.push_back(v - mn); if (v < mn) mn = v; }
    }
    void pop() {
        long long d = st.back(); st.pop_back();
        if (d < 0) mn = mn - d;              // popped element was the min: restore previous
    }
    int top() { long long d = st.back(); return int(d < 0 ? mn : mn + d); }
    int getMin() { return int(mn); }
};
```

**Time:** O(1) · **Space:** one number per element. A classic trick question; needs 64-bit to avoid overflow.

### Walkthrough
**Goal:** know the minimum of the stack in O(1) after any push/pop.

1. Each entry stores `{value, minSoFar}` where `minSoFar` = minimum of this element and everything below it.
2. **push(v):** new min = `v` if empty else `min(v, top.minSoFar)`.
3. **pop():** just remove the top — the entry below already knows its own minimum, so nothing needs recomputing.
4. **getMin():** read `top.minSoFar`.

**Dry run**: push 5, push 3, push 7, push 3, pop, pop, pop:

| op | stack (value, min) top at right | getMin |
|---|---|---|
| push 5 | (5,5) | 5 |
| push 3 | (5,5) (3,3) | 3 |
| push 7 | … (7,3) | 3 |
| push 3 | … (3,3) | 3 |
| pop | (5,5) (3,3) (7,3) | 3 |
| pop | (5,5) (3,3) | 3 |
| pop | (5,5) | **5** — restored automatically |

## evaluate-reverse-polish-notation

### Approach 1: Recursive evaluation from the end
**Idea:** the last token is the root operator; its right operand is the expression just before it.

```cpp
class Solution {
    int pos;
    long long eval(vector<string>& t) {
        const string& tok = t[pos--];
        if (tok.size() > 1 || isdigit((unsigned char)tok[0])) return stoll(tok);
        long long b = eval(t);          // right operand is evaluated first (it's nearer the end)
        long long a = eval(t);
        switch (tok[0]) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            default:  return a / b;
        }
    }
public:
    int evalRPN(vector<string>& tokens) { pos = (int)tokens.size() - 1; return (int)eval(tokens); }
};
```

**Time:** O(n) · **Space:** O(n) recursion depth. Shows the expression-tree structure of RPN.

### Approach 2: In-place stack inside the tokens array
```cpp
class Solution {
public:
    int evalRPN(vector<string>& tokens) {
        vector<int> st;
        st.reserve(tokens.size());
        for (auto& t : tokens) {
            if (t == "+" || t == "-" || t == "*" || t == "/") {
                int b = st.back(); st.pop_back();
                int& a = st.back();                 // modify in place instead of pop+push
                if (t == "+") a += b; else if (t == "-") a -= b;
                else if (t == "*") a *= b; else a /= b;
            } else st.push_back(stoi(t));
        }
        return st.back();
    }
};
```

**Time:** O(n) · **Space:** O(n). Slightly fewer operations.

### Walkthrough
**Goal:** evaluate postfix — operands come before their operator.

1. Scan tokens left to right.
2. Number → push.
3. Operator → pop `b` (right operand, pushed last), pop `a`, push `a op b`.
4. At the end exactly one value remains: the result.

**Dry run** `["4","13","5","/","+"]`:

| token | stack before | action | stack after |
|---|---|---|---|
| 4 | [] | push | [4] |
| 13 | [4] | push | [4,13] |
| 5 | [4,13] | push | [4,13,5] |
| / | [4,13,5] | 13 / 5 = 2 | [4,2] |
| + | [4,2] | 4 + 2 = 6 | [6] |

**Pitfalls:** operand order for `-` and `/`; `"-11"` is a number (length > 1), not an operator; C++ division truncates toward zero as required.

## generate-parentheses

### Approach 1: Generate all 2^(2n) strings, keep valid ones
```cpp
class Solution {
    static bool valid(const string& s) {
        int bal = 0;
        for (char c : s) { bal += c == '(' ? 1 : -1; if (bal < 0) return false; }
        return bal == 0;
    }
public:
    vector<string> generateParenthesis(int n) {
        vector<string> out;
        for (int mask = 0; mask < (1 << (2 * n)); ++mask) {
            string s;
            for (int b = 2 * n - 1; b >= 0; --b) s += (mask >> b & 1) ? ')' : '(';
            if (valid(s)) out.push_back(s);
        }
        return out;
    }
};
```

**Time:** O(2^(2n) · n) · **Space:** O(n). Fine for n ≤ 8, wasteful.

### Approach 2: Dynamic programming by closure number
**Idea:** every valid string is `"(" + A + ")" + B` where A has `c` pairs and B has `n−1−c` pairs.

```cpp
class Solution {
public:
    vector<string> generateParenthesis(int n) {
        vector<vector<string>> dp(n + 1);
        dp[0] = {""};
        for (int k = 1; k <= n; ++k)
            for (int c = 0; c < k; ++c)
                for (const string& a : dp[c])
                    for (const string& b : dp[k - 1 - c])
                        dp[k].push_back("(" + a + ")" + b);
        return dp[n];
    }
};
```

**Time:** O(Catalan(n) · n) · **Space:** stores all smaller results. Mirrors the Catalan recurrence Cₙ = Σ Cc·Cn−1−c.

### Walkthrough
**Goal:** build only valid strings by never making an invalid prefix.

1. State: current string, `open` used, `close` used.
2. **Rule 1:** may add `(` if `open < n`.
3. **Rule 2:** may add `)` only if `close < open` (otherwise a `)` would have no partner).
4. When length reaches `2n`, record the string.
5. Backtrack: `push_back`, recurse, `pop_back`.

**Recursion tree for n = 2** (each node: string):

```text
""
└── "("
    ├── "(("
    │   └── "(()"
    │       └── "(())"   ✔
    └── "()"
        └── "()("
            └── "()()"   ✔
```

Notice `")"` is never tried at the root (close < open fails) — pruning is built in.

## daily-temperatures

### Approach 1: Brute force scan forward
```cpp
class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& t) {
        int n = t.size();
        vector<int> ans(n, 0);
        for (int i = 0; i < n; ++i)
            for (int j = i + 1; j < n; ++j)
                if (t[j] > t[i]) { ans[i] = j - i; break; }
        return ans;
    }
};
```

**Time:** O(n²) worst (decreasing temps) · **Space:** O(1).

### Approach 2: Backward scan with jumps
**Idea:** process from the right; to find the next warmer day for `i`, hop along already-computed answers.

```cpp
class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& t) {
        int n = t.size();
        vector<int> ans(n, 0);
        int hottest = 0;
        for (int i = n - 1; i >= 0; --i) {
            if (t[i] >= hottest) { hottest = t[i]; continue; }   // nothing warmer to the right
            int j = i + 1;
            while (t[j] <= t[i]) j += ans[j];                    // jump to j's next warmer day
            ans[i] = j - i;
        }
        return ans;
    }
};
```

**Time:** O(n) amortised · **Space:** O(1) extra. Elegant and cache-friendly.

### Walkthrough
**Goal:** for each day, the distance to the next strictly warmer day.

1. Maintain a stack of indices whose answer is unknown; their temperatures are **decreasing** from bottom to top.
2. For each day `i`: while the stack top is colder than `t[i]`, day `i` is that day's answer → `ans[top] = i − top`, pop.
3. Push `i` (it now waits for its own warmer day).
4. Indices left at the end never found a warmer day → stay 0.

**Dry run** `[73, 74, 75, 71, 69, 72, 76, 73]`:

| i | t[i] | pops (ans set) | stack after (temps) |
|---|---|---|---|
| 0 | 73 | — | [73] |
| 1 | 74 | 0→1 | [74] |
| 2 | 75 | 1→1 | [75] |
| 3 | 71 | — | [75,71] |
| 4 | 69 | — | [75,71,69] |
| 5 | 72 | 4→1, 3→2 | [75,72] |
| 6 | 76 | 5→1, 2→4 | [76] |
| 7 | 73 | — | [76,73] |

Answer `[1,1,4,2,1,1,0,0]`.

## car-fleet

### Approach 1: Explicit stack of fleet arrival times
```cpp
class Solution {
public:
    int carFleet(int target, vector<int>& position, vector<int>& speed) {
        int n = position.size();
        vector<int> order(n);
        iota(order.begin(), order.end(), 0);
        ranges::sort(order, greater<>{}, [&](int i) { return position[i]; });   // nearest first
        vector<double> st;                                                       // fleet times
        for (int i : order) {
            double t = double(target - position[i]) / speed[i];
            if (st.empty() || t > st.back()) st.push_back(t);   // can't catch -> new fleet
        }
        return st.size();
    }
};
```

**Time:** O(n log n) · **Space:** O(n). Same logic as Optimal; the stack makes the "fleets" visible.

### Approach 2: Simulation (conceptual, slow)
**Idea:** step time forward, move every car, merge cars at the same position. It's O(T·n) and suffers floating-point issues — mention it to show why computing *arrival times* directly is smarter. No code needed in an interview.

### Walkthrough
**Goal:** count groups that arrive together.

1. Compute each car's solo arrival time: `(target − position) / speed`.
2. Sort cars by position, **closest to target first**.
3. Process in that order, tracking the arrival time of the fleet directly ahead (`slowest`).
4. A car with time ≤ `slowest` catches up before the target → joins that fleet (it can't pass, so the fleet's time stays `slowest`).
5. A car with time > `slowest` can never catch it → starts a new fleet; update `slowest`.

**Dry run** `target = 12`, positions `[10,8,0,5,3]`, speeds `[2,4,1,1,3]`:

| pos | speed | time | slowest before | result |
|---|---|---|---|---|
| 10 | 2 | 1 | 0 | new fleet (1) |
| 8 | 4 | 1 | 1 | joins |
| 5 | 1 | 7 | 1 | new fleet (2) |
| 3 | 3 | 3 | 7 | joins |
| 0 | 1 | 12 | 7 | new fleet (3) |

Answer **3**.

## largest-rectangle-in-histogram

### Approach 1: Brute force — expand from each bar
```cpp
class Solution {
public:
    int largestRectangleArea(vector<int>& h) {
        int n = h.size(), best = 0;
        for (int i = 0; i < n; ++i) {
            int l = i, r = i;
            while (l > 0 && h[l - 1] >= h[i]) --l;
            while (r + 1 < n && h[r + 1] >= h[i]) ++r;
            best = max(best, h[i] * (r - l + 1));     // rectangle with height h[i]
        }
        return best;
    }
};
```

**Time:** O(n²) · **Space:** O(1).

### Approach 2: Precompute nearest-smaller on each side (two stack passes)
```cpp
class Solution {
public:
    int largestRectangleArea(vector<int>& h) {
        int n = h.size();
        vector<int> left(n), right(n), st;
        for (int i = 0; i < n; ++i) {                       // nearest smaller to the left
            while (!st.empty() && h[st.back()] >= h[i]) st.pop_back();
            left[i] = st.empty() ? -1 : st.back();
            st.push_back(i);
        }
        st.clear();
        for (int i = n - 1; i >= 0; --i) {                  // nearest smaller to the right
            while (!st.empty() && h[st.back()] >= h[i]) st.pop_back();
            right[i] = st.empty() ? n : st.back();
            st.push_back(i);
        }
        int best = 0;
        for (int i = 0; i < n; ++i) best = max(best, h[i] * (right[i] - left[i] - 1));
        return best;
    }
};
```

**Time:** O(n) · **Space:** O(n). Easier to reason about than the one-pass version.

### Approach 3: Divide and conquer on the minimum
The largest rectangle either spans the whole range at the minimum's height, or lies entirely left or right of the minimum. O(n log n) average (O(n²) on sorted input without a segment tree). Good to mention, rarely coded.

### Walkthrough
**Goal:** for each bar, the widest rectangle using its full height — bounded by the nearest shorter bars on both sides.

1. Keep a stack of indices with **increasing** heights.
2. When `h[i]` is lower than the top's height, the top bar can't extend to `i`:
   1. Pop it — its height is `height`.
   2. Its right boundary is `i` (first shorter on the right).
   3. Its left boundary is the new stack top (first shorter on the left), or −1 if empty.
   4. Width = `i − left − 1`; update the best area.
3. Push `i`.
4. A sentinel `0` at the end forces all remaining bars to be popped and measured.

**Dry run** `[2, 1, 5, 6, 2, 3]` + sentinel 0:

| i | h[i] | popped (height, width, area) | stack after (indices) |
|---|---|---|---|
| 0 | 2 | — | [0] |
| 1 | 1 | (2, 1, 2) | [1] |
| 2 | 5 | — | [1,2] |
| 3 | 6 | — | [1,2,3] |
| 4 | 2 | (6, 1, 6), (5, 2, **10**) | [1,4] |
| 5 | 3 | — | [1,4,5] |
| 6 | 0 | (3,1,3), (2,4,8), (1,6,6) | [6] |

Answer **10** (bars 5 and 6, height 5).
