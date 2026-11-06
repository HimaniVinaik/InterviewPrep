## valid-parentheses

### Approach 1: Repeatedly delete matched pairs
**The idea:** a valid string always contains an adjacent pair like `()`, `[]` or `{}`. Keep deleting those pairs; if the string ends up empty, it was valid.

```cpp
class Solution {
public:
    bool isValid(string s) {
        bool removedSomething = true;

        while (removedSomething) {
            removedSomething = false;

            // Look for any adjacent matching pair and delete it.
            for (string pair : {"()", "[]", "{}"}) {
                size_t pos = s.find(pair);
                if (pos != string::npos) {
                    s.erase(pos, 2);
                    removedSomething = true;
                }
            }
        }

        // Valid strings shrink all the way to "".
        return s.empty();
    }
};
```

**How it works:** `"{[()]}"` → remove `()` → `"{[]}"` → remove `[]` → `"{}"` → remove `{}` → `""`.

**Think of it like this:** peeling an onion from the inside — the innermost pair is always next to each other.

**Cost:** Time **O(n²)** (up to n/2 rounds, each scanning the string). Space **O(1)** extra.

### Approach 2: Stack of opening brackets + lookup table
**The idea:** push every opening bracket. When a closing bracket arrives, it must match the most recent unmatched opener — the top of the stack.

```cpp
class Solution {
public:
    bool isValid(string s) {
        // For each closing bracket, which opening bracket it needs.
        unordered_map<char, char> openerFor = {
            {')', '('},
            {']', '['},
            {'}', '{'}
        };
        stack<char> st;

        for (char c : s) {
            if (openerFor.count(c) == 0) {
                // c is an opening bracket: remember it.
                st.push(c);
            } else {
                // c is a closing bracket: the top must be its opener.
                if (st.empty() || st.top() != openerFor[c]) {
                    return false;
                }
                st.pop();
            }
        }

        // Leftover openers were never closed.
        return st.empty();
    }
};
```

**How it works:** brackets close in reverse order of opening — "last opened, first closed" — which is exactly what a stack gives you.

**Think of it like this:** stacking plates as you open brackets; each closing bracket must match the plate on top.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: Stack of expected closing brackets
**The idea:** when we see an opener, push the closer we will *expect* later. Then a closing bracket just has to equal the top.

```cpp
class Solution {
public:
    bool isValid(string s) {
        // Closing brackets we are waiting for, most recent on top.
        vector<char> st;

        for (char c : s) {
            if (c == '(') {
                st.push_back(')');
            } else if (c == '[') {
                st.push_back(']');
            } else if (c == '{') {
                st.push_back('}');
            } else {
                // c is a closing bracket: it must be the one we expect next.
                if (st.empty() || st.back() != c) {
                    return false;
                }
                st.pop_back();
            }
        }

        // Every opener must have been closed.
        return st.empty();
    }
};
```

**How it works**
1. `(` pushes `)`, `[` pushes `]`, `{` pushes `}`.
2. A closer must equal the top of the stack; otherwise the nesting is wrong (`"(]"`) or there was nothing to close (`")"`).
3. At the end the stack must be empty (`"(("` is invalid).

**Think of it like this:** a to-do list of promises: every opener promises a specific closer, and promises must be kept in reverse order.

**Why it's optimal:** one pass, O(1) work per character. The stack space is needed for deeply nested input.

**Cost:** Time **O(n)**. Space **O(n)**.

## min-stack

### Approach 1: Scan for the minimum when asked
**The idea:** a normal stack; `getMin` walks through every element.

```cpp
class MinStack {
    vector<int> data;

public:
    void push(int val) {
        data.push_back(val);
    }

    void pop() {
        data.pop_back();
    }

    int top() {
        return data.back();
    }

    int getMin() {
        // Look at every element to find the smallest.
        int smallest = data[0];
        for (int x : data) {
            smallest = min(smallest, x);
        }
        return smallest;
    }
};
```

**How it works:** simple, but `getMin` is O(n), and the problem requires O(1).

**Think of it like this:** to find the lightest box in a pile, you lift every box each time you're asked.

**Cost:** push/pop/top **O(1)**, getMin **O(n)**. Space **O(n)**.

### Approach 2: Second stack that tracks minimums
**The idea:** keep another stack whose top is always the current minimum. Only push to it when a new value is ≤ the current minimum.

```cpp
class MinStack {
    vector<int> data;   // all values
    vector<int> mins;   // mins.back() is always the current minimum

public:
    void push(int val) {
        data.push_back(val);
        // New minimum (or equal to it)? Record it. <= keeps duplicates working.
        if (mins.empty() || val <= mins.back()) {
            mins.push_back(val);
        }
    }

    void pop() {
        // If we're removing the current minimum, drop it from mins too.
        if (data.back() == mins.back()) {
            mins.pop_back();
        }
        data.pop_back();
    }

    int top() {
        return data.back();
    }

    int getMin() {
        return mins.back();
    }
};
```

**How it works:** `mins` holds the history of "record lows". Popping the current record low reveals the previous one.

**Think of it like this:** a list of temperature records — when the record day is removed, the previous record becomes the record again.

**Cost:** All operations **O(1)**. Space **O(n)** worst case, often less.

### Optimal: Store each value with the minimum below it
**The idea:** every stack entry stores two numbers: the value, and the smallest value in the stack at the moment it was pushed.

```cpp
class MinStack {
    // Each entry: (value, minimum of this entry and everything below it).
    vector<pair<int, int>> st;

public:
    void push(int val) {
        int currentMin = val;
        if (!st.empty()) {
            currentMin = min(val, st.back().second);
        }
        st.push_back({val, currentMin});
    }

    void pop() {
        st.pop_back();
    }

    int top() {
        return st.back().first;
    }

    int getMin() {
        return st.back().second;
    }
};
```

**How it works**
1. On push, the new entry's minimum = min(new value, minimum stored in the entry below).
2. Popping removes the entry; the entry below still remembers its own minimum, so nothing needs recalculating.
3. `getMin` just reads the top entry's minimum.

**Think of it like this:** each plate in the stack has a sticky note saying "the smallest plate from here down is …". The top note always answers the question.

**Why it's optimal:** every operation is O(1) worst case; storing one extra number per element is simple and safe.

**Cost:** All operations **O(1)**. Space **O(n)**.

## evaluate-reverse-polish-notation

### Approach 1: Recursion from the end
**The idea:** the last token is the final operator; its right operand is the expression just before it, and its left operand is the expression before that.

```cpp
class Solution {
    int pos;   // index of the next token to read, moving right-to-left

    long long evaluate(vector<string>& tokens) {
        string token = tokens[pos];
        pos--;

        // A number (possibly negative like "-11") is a complete expression.
        bool isOperator = token == "+" || token == "-" || token == "*" || token == "/";
        if (!isOperator) {
            return stoll(token);
        }

        // Reading backwards, the RIGHT operand comes first.
        long long right = evaluate(tokens);
        long long left = evaluate(tokens);

        if (token == "+") {
            return left + right;
        }
        if (token == "-") {
            return left - right;
        }
        if (token == "*") {
            return left * right;
        }
        return left / right;
    }

public:
    int evalRPN(vector<string>& tokens) {
        pos = (int)tokens.size() - 1;
        return (int)evaluate(tokens);
    }
};
```

**How it works:** RPN is an expression tree written bottom-up; reading it backwards walks the tree from the root.

**Think of it like this:** unwrapping nested boxes from the outside in.

**Cost:** Time **O(n)**. Space **O(n)** recursion depth.

### Approach 2: Stack, updating the top in place
**The idea:** the standard stack method, but instead of popping both operands and pushing the result, pop one and overwrite the new top.

```cpp
class Solution {
public:
    int evalRPN(vector<string>& tokens) {
        vector<long long> st;

        for (const string& t : tokens) {
            if (t == "+" || t == "-" || t == "*" || t == "/") {
                long long right = st.back();
                st.pop_back();
                // The left operand stays on the stack; we replace it with the result.
                long long& left = st.back();
                if (t == "+") {
                    left = left + right;
                } else if (t == "-") {
                    left = left - right;
                } else if (t == "*") {
                    left = left * right;
                } else {
                    left = left / right;
                }
            } else {
                st.push_back(stoll(t));
            }
        }
        return (int)st.back();
    }
};
```

**How it works:** identical result with one fewer stack operation per operator.

**Think of it like this:** instead of taking two plates off and putting a new one back, you take one off and repaint the plate underneath.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: Stack of operands
**The idea:** numbers go onto a stack. An operator pops the top two numbers, applies itself, and pushes the result.

```cpp
class Solution {
public:
    int evalRPN(vector<string>& tokens) {
        vector<long long> st;

        for (const string& t : tokens) {
            bool isOperator = t == "+" || t == "-" || t == "*" || t == "/";

            if (!isOperator) {
                // A number: save it for later.
                st.push_back(stoll(t));
                continue;
            }

            // The right operand was pushed last, so it comes off first.
            long long b = st.back();
            st.pop_back();
            long long a = st.back();
            st.pop_back();

            long long result;
            if (t == "+") {
                result = a + b;
            } else if (t == "-") {
                result = a - b;
            } else if (t == "*") {
                result = a * b;
            } else {
                result = a / b;   // C++ division truncates toward zero, as required
            }
            st.push_back(result);
        }

        // Exactly one value remains: the answer.
        return (int)st.back();
    }
};
```

**How it works**
1. `["2","1","+","3","*"]`: push 2, push 1, `+` → 3, push 3, `*` → 9.
2. Order matters for `-` and `/`: the first value popped is the **right** operand.
3. Note `"-11"` is a number, not an operator — that's why we compare the whole token.

**Think of it like this:** a calculator with a memory stack: numbers wait in line until an operator comes to combine the two most recent.

**Why it's optimal:** each token is processed once with O(1) work.

**Cost:** Time **O(n)**. Space **O(n)**.

## generate-parentheses

### Approach 1: Generate every string, keep the valid ones
**The idea:** there are 2^(2n) strings of length 2n made of `(` and `)`. Build each one and check whether it's balanced.

```cpp
class Solution {
    // Balanced means the running count never drops below 0 and ends at 0.
    bool isBalanced(const string& s) {
        int balance = 0;
        for (char c : s) {
            if (c == '(') {
                balance++;
            } else {
                balance--;
            }
            if (balance < 0) {
                return false;
            }
        }
        return balance == 0;
    }

public:
    vector<string> generateParenthesis(int n) {
        vector<string> result;
        int length = 2 * n;

        // Each number from 0 to 2^length - 1 describes one string:
        // bit = 0 means '(' and bit = 1 means ')'.
        for (int mask = 0; mask < (1 << length); mask++) {
            string s;
            for (int bit = length - 1; bit >= 0; bit--) {
                if ((mask >> bit) & 1) {
                    s += ')';
                } else {
                    s += '(';
                }
            }
            if (isBalanced(s)) {
                result.push_back(s);
            }
        }
        return result;
    }
};
```

**How it works:** brute force over all strings with a validity filter.

**Think of it like this:** writing down every possible arrangement and crossing out the bad ones.

**Cost:** Time **O(2^(2n) · n)**. Space **O(n)**. Only OK for small n.

### Approach 2: Build from smaller answers (dynamic programming)
**The idea:** every valid string looks like `"(" + A + ")" + B`, where A and B are smaller valid strings. Build answers for 0, 1, 2, … pairs.

```cpp
class Solution {
public:
    vector<string> generateParenthesis(int n) {
        // dp[k] = all valid strings with k pairs.
        vector<vector<string>> dp(n + 1);
        dp[0] = {""};

        for (int k = 1; k <= n; k++) {
            // The first '(' matches some ')'. Inside them go `inner` pairs,
            // and after them go the remaining k - 1 - inner pairs.
            for (int inner = 0; inner < k; inner++) {
                int after = k - 1 - inner;
                for (const string& a : dp[inner]) {
                    for (const string& b : dp[after]) {
                        dp[k].push_back("(" + a + ")" + b);
                    }
                }
            }
        }
        return dp[n];
    }
};
```

**How it works:** splitting at the partner of the first `(` gives every string exactly once.

**Think of it like this:** every valid string is "a wrapped box followed by more boxes" — build big arrangements out of small ones.

**Cost:** Time and space proportional to the output, **O(Cₙ · n)** (Cₙ = Catalan number).

### Optimal: Backtracking with two counters
**The idea:** build the string one character at a time and only ever make choices that keep it valid: add `(` if we still have some left, add `)` only if it would close an open one.

```cpp
class Solution {
    vector<string> out;   // finished strings
    string cur;           // the string being built
    int n;

    void build(int open, int close) {
        // Used all n pairs: cur is a complete, valid string.
        if ((int)cur.size() == 2 * n) {
            out.push_back(cur);
            return;
        }

        // Choice 1: add '(' if we haven't used all n of them.
        if (open < n) {
            cur.push_back('(');
            build(open + 1, close);
            cur.pop_back();   // undo the choice (backtrack)
        }

        // Choice 2: add ')' only if there is an unmatched '(' to close.
        if (close < open) {
            cur.push_back(')');
            build(open, close + 1);
            cur.pop_back();
        }
    }

public:
    vector<string> generateParenthesis(int pairs) {
        n = pairs;
        build(0, 0);
        return out;
    }
};
```

**How it works**
1. `open` and `close` count how many of each bracket we've placed.
2. Rule 1 (`open < n`) stops us using too many `(`.
3. Rule 2 (`close < open`) stops a `)` from appearing without a partner.
4. Because we never make an invalid prefix, every complete string is valid — no checking needed.

**Think of it like this:** walking a maze where you're only allowed through doors that keep you on a path to the exit — you never waste time in dead ends.

**Why it's optimal:** the work done is proportional to the number of valid strings produced, which we must output anyway.

**Cost:** Time **O(Cₙ · n)** ≈ O(4ⁿ / √n). Space **O(n)** besides the output.

## daily-temperatures

### Approach 1: Brute force — look ahead from each day
**The idea:** for each day, scan forward until a warmer day appears.

```cpp
class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& temperatures) {
        int n = temperatures.size();
        vector<int> answer(n, 0);   // 0 means "no warmer day"

        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (temperatures[j] > temperatures[i]) {
                    answer[i] = j - i;   // days to wait
                    break;
                }
            }
        }
        return answer;
    }
};
```

**How it works:** direct definition.

**Think of it like this:** every morning, read the weather forecast day by day until you find a warmer one.

**Cost:** Time **O(n²)** (e.g. a steadily cooling month). Space **O(1)** extra.

### Approach 2: Scan backwards and jump
**The idea:** work from the last day backwards. To find day i's warmer day, start at i + 1 and jump using answers we've already computed.

```cpp
class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& temperatures) {
        int n = temperatures.size();
        vector<int> answer(n, 0);
        int hottest = 0;   // hottest temperature seen so far (to the right)

        for (int i = n - 1; i >= 0; i--) {
            if (temperatures[i] >= hottest) {
                // Nothing to the right is warmer.
                hottest = temperatures[i];
                continue;
            }

            int j = i + 1;
            // While day j isn't warmer, jump to day j's own warmer day.
            while (temperatures[j] <= temperatures[i]) {
                j = j + answer[j];
            }
            answer[i] = j - i;
        }
        return answer;
    }
};
```

**How it works:** if day j isn't warmer than day i, then nothing between j and j's warmer day is warmer either, so we can skip straight there.

**Think of it like this:** asking a neighbour "when is it warmer than at your place?" and hopping along those answers instead of checking every day.

**Cost:** Time **O(n)** amortised. Space **O(1)** extra.

### Optimal: Monotonic stack of waiting days
**The idea:** keep a stack of days that are still waiting for a warmer day. Their temperatures decrease from bottom to top. A warmer day "resolves" every colder day on top of the stack.

```cpp
class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& t) {
        int n = t.size();
        vector<int> ans(n, 0);
        vector<int> st;   // indices of days still waiting for a warmer day

        for (int i = 0; i < n; i++) {
            // Today is warmer than the day on top of the stack: that day's wait is over.
            while (!st.empty() && t[st.back()] < t[i]) {
                int waitingDay = st.back();
                st.pop_back();
                ans[waitingDay] = i - waitingDay;
            }
            // Today now waits for its own warmer day.
            st.push_back(i);
        }

        // Days left in the stack never got a warmer day: their answer stays 0.
        return ans;
    }
};
```

**How it works**
1. The stack holds unanswered days, coldest on top.
2. When day `i` is warmer than the top, pop it and record the distance.
3. Keep popping while the new top is also colder; then push `i`.
4. Each day is pushed once and popped at most once → O(n) total.

**Think of it like this:** a queue of people each waiting for a taller person to arrive. When a tall person walks in, everyone shorter at the end of the queue gets their answer and leaves.

**Why it's optimal:** linear time — every day enters and leaves the stack once.

**Cost:** Time **O(n)**. Space **O(n)**.

## car-fleet

### Approach 1: Stack of fleet arrival times
**The idea:** sort cars from closest to the target to farthest. A car becomes a new fleet only if it would arrive later than the fleet in front of it.

```cpp
class Solution {
public:
    int carFleet(int target, vector<int>& position, vector<int>& speed) {
        int n = position.size();

        // Pair each car's position with its time to reach the target on its own.
        vector<pair<int, double>> cars;
        for (int i = 0; i < n; i++) {
            double time = (double)(target - position[i]) / speed[i];
            cars.push_back({position[i], time});
        }

        // Closest to the target first.
        sort(cars.begin(), cars.end(), [](const pair<int, double>& a, const pair<int, double>& b) {
            return a.first > b.first;
        });

        // Arrival times of the fleets, front fleet at the bottom.
        vector<double> fleets;
        for (auto& car : cars) {
            double time = car.second;
            // Slower than the fleet ahead -> can't catch it -> new fleet.
            if (fleets.empty() || time > fleets.back()) {
                fleets.push_back(time);
            }
            // Otherwise it catches up and joins the fleet ahead (nothing to do).
        }
        return fleets.size();
    }
};
```

**How it works:** the stack lists each fleet's arrival time; its size is the answer.

**Think of it like this:** cars on a one-lane road can't overtake, so a fast car stuck behind a slow one just becomes part of its convoy.

**Cost:** Time **O(n log n)**. Space **O(n)**.

### Approach 2: Simulation (why we avoid it)
**The idea:** move every car forward in small time steps and merge cars that meet.

```cpp
class Solution {
public:
    int carFleet(int target, vector<int>& position, vector<int>& speed) {
        int n = position.size();
        // Times are compared directly, so no stepping is actually needed.
        // This version computes arrival times and counts distinct "blocking" times by brute force.
        vector<double> time(n);
        for (int i = 0; i < n; i++) {
            time[i] = (double)(target - position[i]) / speed[i];
        }

        int fleets = 0;
        for (int i = 0; i < n; i++) {
            // Car i leads a fleet if no car AHEAD of it arrives later
            // (a slower car ahead would block it).
            bool blocked = false;
            for (int j = 0; j < n; j++) {
                if (position[j] > position[i] && time[j] >= time[i]) {
                    blocked = true;
                    break;
                }
            }
            if (!blocked) {
                fleets++;
            }
        }
        return fleets;
    }
};
```

**How it works:** a car is the "back of its own fleet's leader" exactly when no car in front arrives later than it. Checking that for every car directly is O(n²).

**Think of it like this:** asking each driver "is anyone in front of you slower?" one by one.

**Cost:** Time **O(n²)**. Space **O(n)**.

### Optimal: Sort by position, track the slowest arrival ahead
**The idea:** the stack from Approach 1 only ever needs its top value, so keep a single number: the arrival time of the fleet directly ahead.

```cpp
class Solution {
public:
    int carFleet(int target, vector<int>& position, vector<int>& speed) {
        int n = position.size();

        vector<pair<int, double>> cars;   // (position, time to reach target)
        for (int i = 0; i < n; i++) {
            cars.push_back({position[i], (double)(target - position[i]) / speed[i]});
        }
        // Closest to the target first.
        sort(cars.begin(), cars.end(), [](const pair<int, double>& a, const pair<int, double>& b) {
            return a.first > b.first;
        });

        int fleets = 0;
        double slowest = 0;   // arrival time of the fleet directly ahead
        for (auto& car : cars) {
            double time = car.second;
            if (time > slowest) {
                // Can't catch the fleet ahead: it leads a new fleet.
                fleets++;
                slowest = time;
            }
            // else: it catches up and travels with the fleet ahead.
        }
        return fleets;
    }
};
```

**How it works**
1. Compute each car's solo arrival time.
2. Process cars from front to back.
3. A car that would arrive **sooner** than the fleet ahead catches it and merges (it can't pass).
4. A car that arrives **later** starts a new fleet and becomes the new "slowest ahead".

**Think of it like this:** looking down a single-lane road from the finish line; each time you spot a car slower than everything in front, that's the head of a new convoy.

**Why it's optimal:** sorting is the dominant cost; the scan is O(n) with O(1) extra state.

**Cost:** Time **O(n log n)**. Space **O(n)** for the sorted list.

## largest-rectangle-in-histogram

### Approach 1: Brute force — expand from every bar
**The idea:** for each bar, stretch left and right as far as bars are at least as tall; that gives the widest rectangle using this bar's full height.

```cpp
class Solution {
public:
    int largestRectangleArea(vector<int>& heights) {
        int n = heights.size();
        int best = 0;

        for (int i = 0; i < n; i++) {
            int left = i;
            // Extend left while bars are at least as tall as heights[i].
            while (left > 0 && heights[left - 1] >= heights[i]) {
                left--;
            }
            int right = i;
            // Extend right the same way.
            while (right + 1 < n && heights[right + 1] >= heights[i]) {
                right++;
            }
            int width = right - left + 1;
            best = max(best, heights[i] * width);
        }
        return best;
    }
};
```

**How it works:** every maximal rectangle has some shortest bar; trying every bar as "the shortest" covers all candidates.

**Think of it like this:** for each building, roll out a banner at its height left and right until a shorter building blocks it.

**Cost:** Time **O(n²)**. Space **O(1)**.

### Approach 2: Nearest smaller bar on each side (two passes)
**The idea:** precompute, for every bar, the index of the first shorter bar on the left and on the right, using a stack.

```cpp
class Solution {
public:
    int largestRectangleArea(vector<int>& heights) {
        int n = heights.size();
        vector<int> leftSmaller(n);    // index of first shorter bar to the left (-1 if none)
        vector<int> rightSmaller(n);   // index of first shorter bar to the right (n if none)
        vector<int> st;

        for (int i = 0; i < n; i++) {
            while (!st.empty() && heights[st.back()] >= heights[i]) {
                st.pop_back();
            }
            if (st.empty()) {
                leftSmaller[i] = -1;
            } else {
                leftSmaller[i] = st.back();
            }
            st.push_back(i);
        }

        st.clear();
        for (int i = n - 1; i >= 0; i--) {
            while (!st.empty() && heights[st.back()] >= heights[i]) {
                st.pop_back();
            }
            if (st.empty()) {
                rightSmaller[i] = n;
            } else {
                rightSmaller[i] = st.back();
            }
            st.push_back(i);
        }

        int best = 0;
        for (int i = 0; i < n; i++) {
            int width = rightSmaller[i] - leftSmaller[i] - 1;
            best = max(best, heights[i] * width);
        }
        return best;
    }
};
```

**How it works:** the rectangle using bar i's height spans exactly the bars between its two nearest shorter neighbours.

**Think of it like this:** for every building, find the nearest shorter building on each side — those are the walls of its banner.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: One pass with a monotonic stack
**The idea:** keep a stack of bars with increasing heights. When a shorter bar arrives, every taller bar on the stack has found its right boundary — pop it and measure its rectangle.

```cpp
class Solution {
public:
    int largestRectangleArea(vector<int>& h) {
        // A height-0 bar at the end forces every remaining bar to be measured.
        h.push_back(0);
        vector<int> st;   // indices of bars with increasing heights
        int best = 0;

        for (int i = 0; i < (int)h.size(); i++) {
            // The bar at the top can't extend past i (h[i] is not taller), so measure it now.
            while (!st.empty() && h[st.back()] >= h[i]) {
                int height = h[st.back()];
                st.pop_back();

                // Left boundary: the bar now on top of the stack (shorter), or -1 if none.
                int left = -1;
                if (!st.empty()) {
                    left = st.back();
                }

                // The rectangle spans the bars strictly between `left` and `i`.
                int width = i - left - 1;
                best = max(best, height * width);
            }
            st.push_back(i);
        }

        h.pop_back();   // restore the input
        return best;
    }
};
```

**How it works**
1. The stack keeps bars in increasing height order.
2. When bar `i` is shorter than (or equal to) the top, the top bar can't stretch to `i` — its right edge is `i`.
3. Its left edge is the bar now below it in the stack (the nearest shorter bar on the left).
4. Width = `i − left − 1`; record the area. Repeat while the top is still too tall.
5. The extra 0 at the end flushes the stack.

**Think of it like this:** walking along a skyline, carrying a stack of "open banners". When you hit a shorter building, every taller banner must stop here — measure them as you take them down.

**Why it's optimal:** each bar is pushed and popped once → O(n).

**Cost:** Time **O(n)**. Space **O(n)**.
