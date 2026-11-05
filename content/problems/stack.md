# Stack

**Recognise it when:** you need to match nested things (brackets, tags), evaluate expressions, undo operations, or find the **next greater/smaller element** (monotonic stack).

**Monotonic stack template** — keep indices whose values are increasing (or decreasing). When a new element breaks the order, pop: the popped element has just found its "next greater/smaller".

```cpp
vector<int> nextGreater(const vector<int>& a) {
    vector<int> res(a.size(), -1);
    vector<int> st;                       // indices, values decreasing
    for (int i = 0; i < (int)a.size(); ++i) {
        while (!st.empty() && a[st.back()] < a[i]) {
            res[st.back()] = a[i];
            st.pop_back();
        }
        st.push_back(i);
    }
    return res;
}
```

Use `std::vector` as a stack (`push_back`/`back`/`pop_back`) — it's typically faster than `std::stack<deque>`.

## Valid Parentheses
- difficulty: Easy
- leetcode: 20
- slug: valid-parentheses

Given a string of `()[]{}`, determine if brackets close in the correct order.

```text
"()[]{}" -> true     "(]" -> false     "([)]" -> false
```

### Hint
The most recent unmatched opener must be closed first.

### Solution
```cpp
class Solution {
public:
    bool isValid(string s) {
        vector<char> st;
        for (char c : s) {
            switch (c) {
                case '(': st.push_back(')'); break;   // push the expected closer
                case '[': st.push_back(']'); break;
                case '{': st.push_back('}'); break;
                default:
                    if (st.empty() || st.back() != c) return false;
                    st.pop_back();
            }
        }
        return st.empty();
    }
};
```

### Explanation
Pushing the *expected closer* rather than the opener avoids a lookup table. At the end, the stack must be empty (no unclosed openers).

**Time:** O(n) · **Space:** O(n)

## Min Stack
- difficulty: Medium
- leetcode: 155
- slug: min-stack

Design a stack supporting `push`, `pop`, `top`, and `getMin` — all in O(1).

### Hint
Store, alongside each value, the minimum of the stack *at that moment*.

### Solution
```cpp
class MinStack {
    vector<pair<int, int>> st;   // {value, min so far}
public:
    void push(int val) {
        int m = st.empty() ? val : min(val, st.back().second);
        st.emplace_back(val, m);
    }
    void pop()    { st.pop_back(); }
    int top()     { return st.back().first; }
    int getMin()  { return st.back().second; }
};
```

### Explanation
Each entry remembers the minimum of everything beneath it, so popping automatically "restores" the previous minimum. A space optimisation is a second stack that only pushes when a new min ≤ current min.

**Time:** O(1) all ops · **Space:** O(n)

## Evaluate Reverse Polish Notation
- difficulty: Medium
- leetcode: 150
- slug: evaluate-reverse-polish-notation

Evaluate an arithmetic expression in Reverse Polish Notation. Operators: `+ - * /` (integer division truncates toward zero).

```text
["2","1","+","3","*"] -> 9
```

### Hint
Operands go on a stack; an operator pops two, pushes the result. Mind operand order for `-` and `/`.

### Solution
```cpp
class Solution {
public:
    int evalRPN(vector<string>& tokens) {
        vector<long long> st;
        for (const auto& t : tokens) {
            if (t.size() == 1 && string_view("+-*/").find(t[0]) != string_view::npos) {
                long long b = st.back(); st.pop_back();
                long long a = st.back(); st.pop_back();
                switch (t[0]) {
                    case '+': st.push_back(a + b); break;
                    case '-': st.push_back(a - b); break;
                    case '*': st.push_back(a * b); break;
                    case '/': st.push_back(a / b); break; // C++ truncates toward zero
                }
            } else {
                st.push_back(stoll(t));
            }
        }
        return (int)st.back();
    }
};
```

### Explanation
The first popped value is the **right** operand. Check single-char tokens for operators so `"-11"` (a negative number) isn't mistaken for minus. Since C++11, integer division truncates toward zero — exactly what's required.

**Time:** O(n) · **Space:** O(n)

## Generate Parentheses
- difficulty: Medium
- leetcode: 22
- slug: generate-parentheses

Generate all combinations of `n` pairs of well-formed parentheses.

```text
n = 3 -> ["((()))","(()())","(())()","()(())","()()()"]
```

### Hint
You may add `(` while `open < n`, and `)` while `close < open`.

### Solution
```cpp
class Solution {
public:
    vector<string> generateParenthesis(int n) {
        vector<string> out;
        string cur;
        auto dfs = [&](auto&& self, int open, int close) -> void {
            if ((int)cur.size() == 2 * n) { out.push_back(cur); return; }
            if (open < n)     { cur.push_back('('); self(self, open + 1, close); cur.pop_back(); }
            if (close < open) { cur.push_back(')'); self(self, open, close + 1); cur.pop_back(); }
        };
        dfs(dfs, 0, 0);
        return out;
    }
};
```

### Explanation
Backtracking with the two validity rules prunes every invalid prefix. The string `cur` acts as the explicit stack. Note the **recursive lambda** idiom `auto&& self` (pre-C++23; in C++23 you can use *deducing this*).

The count is the n-th Catalan number ≈ 4ⁿ/(n√n).

**Time:** O(4ⁿ/√n) · **Space:** O(n) recursion

## Daily Temperatures
- difficulty: Medium
- leetcode: 739
- slug: daily-temperatures

For each day, how many days until a warmer temperature? 0 if none.

```text
[73,74,75,71,69,72,76,73] -> [1,1,4,2,1,1,0,0]
```

### Hint
Classic "next greater element" — monotonic decreasing stack of indices.

### Solution
```cpp
class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& t) {
        int n = t.size();
        vector<int> ans(n, 0), st;   // st holds indices with decreasing temps
        for (int i = 0; i < n; ++i) {
            while (!st.empty() && t[st.back()] < t[i]) {
                ans[st.back()] = i - st.back();
                st.pop_back();
            }
            st.push_back(i);
        }
        return ans;
    }
};
```

### Explanation
Days waiting for a warmer day sit on the stack. When a warmer day arrives, it resolves every colder day on top. Each index is pushed and popped once → O(n).

**Time:** O(n) · **Space:** O(n)

## Car Fleet
- difficulty: Medium
- leetcode: 853
- slug: car-fleet

`n` cars drive to `target`. Car `i` starts at `position[i]` with `speed[i]`. A faster car catching a slower one joins it (forms a fleet). How many fleets arrive?

### Hint
Sort by position descending. Compute each car's arrival time; a car that would arrive *sooner* than the fleet ahead merges into it.

### Solution
```cpp
class Solution {
public:
    int carFleet(int target, vector<int>& position, vector<int>& speed) {
        int n = position.size();
        vector<pair<int, double>> cars(n);
        for (int i = 0; i < n; ++i)
            cars[i] = {position[i], double(target - position[i]) / speed[i]};
        ranges::sort(cars, greater<>{});      // closest to target first
        int fleets = 0;
        double slowest = 0;                   // arrival time of fleet ahead
        for (auto& [pos, time] : cars) {
            if (time > slowest) { ++fleets; slowest = time; }
            // else: catches the fleet ahead and merges
        }
        return fleets;
    }
};
```

### Explanation
Process cars from nearest the target. A car that needs *more* time than the fleet in front can never catch it → new fleet. Otherwise it merges. (This is a monotonic stack collapsed to a single "top" value.)

**Time:** O(n log n) · **Space:** O(n)

## Largest Rectangle in Histogram
- difficulty: Hard
- leetcode: 84
- slug: largest-rectangle-in-histogram

Given bar heights, return the area of the largest rectangle in the histogram.

```text
[2,1,5,6,2,3] -> 10
```

### Hint
For each bar, find how far it extends left and right before a shorter bar. A monotonic increasing stack gives both.

### Solution
```cpp
class Solution {
public:
    int largestRectangleArea(vector<int>& h) {
        h.push_back(0);                       // sentinel flushes the stack
        vector<int> st;                       // indices, heights increasing
        int best = 0;
        for (int i = 0; i < (int)h.size(); ++i) {
            while (!st.empty() && h[st.back()] >= h[i]) {
                int height = h[st.back()]; st.pop_back();
                int left = st.empty() ? -1 : st.back();   // first shorter bar on the left
                best = max(best, height * (i - left - 1)); // i = first shorter on right
            }
            st.push_back(i);
        }
        h.pop_back();
        return best;
    }
};
```

### Explanation
When bar `i` is shorter than the stack top, the top bar can't extend past `i`. Its left boundary is the new stack top (the previous shorter bar). Width = `i - left - 1`. The 0 sentinel forces every remaining bar to be evaluated.

This is the key subroutine for **Maximal Rectangle** (LC 85).

**Time:** O(n) · **Space:** O(n)
