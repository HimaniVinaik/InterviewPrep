# Math & Geometry

**Recognise it when:** matrix manipulation in place, digit manipulation, fast power, simulation with careful boundaries, coordinate geometry.

**Tips**
- Rotations = transpose + reverse.
- Spiral/boundary traversals: maintain `top, bottom, left, right` and shrink.
- Digit problems: `% 10` and `/ 10`, and **check overflow first**.
- Fast exponentiation: square-and-multiply in O(log n).
- Use integer math where possible (cross products, squared distances) to avoid floating-point error.

## Rotate Image
- difficulty: Medium
- leetcode: 48
- slug: rotate-image

Rotate an `n×n` matrix 90° clockwise **in place**.

### Hint
Transpose, then reverse each row.

### Solution
```cpp
class Solution {
public:
    void rotate(vector<vector<int>>& M) {
        int n = M.size();
        for (int i = 0; i < n; ++i)
            for (int j = i + 1; j < n; ++j) swap(M[i][j], M[j][i]);   // transpose
        for (auto& row : M) ranges::reverse(row);                       // mirror
    }
};
```

### Explanation
Clockwise rotation maps `(r, c) → (c, n-1-r)`. Transpose gives `(c, r)`; horizontal mirror gives `(c, n-1-r)`. Counter-clockwise: transpose then reverse columns (or reverse rows first).

**Time:** O(n²) · **Space:** O(1)

## Spiral Matrix
- difficulty: Medium
- leetcode: 54
- slug: spiral-matrix

Return all elements in spiral order.

### Hint
Four boundaries; after each side, shrink the corresponding boundary and re-check.

### Solution
```cpp
class Solution {
public:
    vector<int> spiralOrder(vector<vector<int>>& M) {
        vector<int> out;
        int top = 0, bot = M.size() - 1, left = 0, right = M[0].size() - 1;
        while (top <= bot && left <= right) {
            for (int c = left; c <= right; ++c) out.push_back(M[top][c]);
            ++top;
            for (int r = top; r <= bot; ++r) out.push_back(M[r][right]);
            --right;
            if (top <= bot) {
                for (int c = right; c >= left; --c) out.push_back(M[bot][c]);
                --bot;
            }
            if (left <= right) {
                for (int r = bot; r >= top; --r) out.push_back(M[r][left]);
                ++left;
            }
        }
        return out;
    }
};
```

### Explanation
The two `if` checks prevent double-counting when a single row or column remains. Boundary bookkeeping like this is what interviewers watch for.

**Time:** O(m·n) · **Space:** O(1) extra

## Set Matrix Zeroes
- difficulty: Medium
- leetcode: 73
- slug: set-matrix-zeroes

If an element is 0, set its entire row and column to 0. O(1) extra space.

### Hint
Use the first row and first column as marker storage; remember separately whether they themselves need zeroing.

### Solution
```cpp
class Solution {
public:
    void setZeroes(vector<vector<int>>& M) {
        int R = M.size(), C = M[0].size();
        bool firstCol = false;
        for (int r = 0; r < R; ++r) {
            if (M[r][0] == 0) firstCol = true;
            for (int c = 1; c < C; ++c)
                if (M[r][c] == 0) M[r][0] = M[0][c] = 0;
        }
        for (int r = R - 1; r >= 0; --r) {            // bottom-up keeps row 0 markers intact
            for (int c = C - 1; c >= 1; --c)
                if (M[r][0] == 0 || M[0][c] == 0) M[r][c] = 0;
            if (firstCol) M[r][0] = 0;
        }
    }
};
```

### Explanation
`M[0][0]` serves as row 0's marker; `firstCol` is column 0's. Processing in reverse ensures markers are read before they're overwritten.

**Time:** O(R·C) · **Space:** O(1)

## Happy Number
- difficulty: Easy
- leetcode: 202
- slug: happy-number

Repeatedly replace `n` with the sum of squares of its digits. Happy if it reaches 1; otherwise it loops forever.

### Hint
Cycle detection — Floyd's algorithm on the sequence.

### Solution
```cpp
class Solution {
    static int next(int n) {
        int s = 0;
        while (n) { int d = n % 10; s += d * d; n /= 10; }
        return s;
    }
public:
    bool isHappy(int n) {
        int slow = n, fast = next(n);
        while (fast != 1 && slow != fast) {
            slow = next(slow);
            fast = next(next(fast));
        }
        return fast == 1;
    }
};
```

### Explanation
Any function iterated on a finite set eventually cycles. Floyd detects it in O(1) space — same as linked list cycle.

**Time:** O(log n) per step · **Space:** O(1)

## Plus One
- difficulty: Easy
- leetcode: 66
- slug: plus-one

A number is stored as a digit array (most significant first). Add one.

### Hint
Propagate the carry from the end; if all digits were 9, prepend 1.

### Solution
```cpp
class Solution {
public:
    vector<int> plusOne(vector<int>& d) {
        for (int i = (int)d.size() - 1; i >= 0; --i) {
            if (d[i] < 9) { ++d[i]; return d; }
            d[i] = 0;
        }
        d.insert(d.begin(), 1);       // 999 -> 1000
        return d;
    }
};
```

### Explanation
Early return as soon as there's no carry.

**Time:** O(n) · **Space:** O(1) (amortised)

## Pow(x, n)
- difficulty: Medium
- leetcode: 50
- slug: powx-n

Compute `x^n` for double `x` and 32-bit `n` (may be negative).

### Hint
Binary exponentiation; handle `n = INT_MIN` (can't negate in int).

### Solution
```cpp
class Solution {
public:
    double myPow(double x, int n) {
        long long e = n;              // widen BEFORE negating: -INT_MIN overflows int
        if (e < 0) { x = 1 / x; e = -e; }
        double result = 1;
        while (e) {
            if (e & 1) result *= x;   // this bit contributes x^(2^k)
            x *= x;
            e >>= 1;
        }
        return result;
    }
};
```

### Explanation
`x^13 = x^8 · x^4 · x^1` (13 = 0b1101). Each loop squares the base and consumes one bit of the exponent. The same algorithm with `% mod` is modular exponentiation (RSA, hashing).

**Time:** O(log n) · **Space:** O(1)

## Multiply Strings
- difficulty: Medium
- leetcode: 43
- slug: multiply-strings

Multiply two non-negative integers given as strings without converting to big ints.

### Hint
Digit `i` of `a` times digit `j` of `b` lands at positions `i+j` and `i+j+1`.

### Solution
```cpp
class Solution {
public:
    string multiply(string a, string b) {
        int m = a.size(), n = b.size();
        vector<int> pos(m + n, 0);
        for (int i = m - 1; i >= 0; --i)
            for (int j = n - 1; j >= 0; --j) {
                int mul = (a[i] - '0') * (b[j] - '0');
                int sum = mul + pos[i + j + 1];
                pos[i + j + 1] = sum % 10;
                pos[i + j] += sum / 10;
            }
        string out;
        for (int d : pos) if (!(out.empty() && d == 0)) out += char('0' + d);
        return out.empty() ? "0" : out;
    }
};
```

### Explanation
Grade-school multiplication with a positional accumulator. Skip leading zeros at the end.

**Time:** O(m·n) · **Space:** O(m+n)

## Detect Squares
- difficulty: Medium
- leetcode: 2013
- slug: detect-squares

Add points (duplicates allowed); count axis-aligned squares formed with a query point.

### Hint
Treat the query as one corner; iterate over stored points as the **diagonal** corner.

### Solution
```cpp
class DetectSquares {
    map<pair<int, int>, int> cnt;
public:
    void add(vector<int> p) { ++cnt[{p[0], p[1]}]; }
    int count(vector<int> p) {
        int x = p[0], y = p[1], total = 0;
        for (auto& [pt, c] : cnt) {
            auto [px, py] = pt;
            if (abs(px - x) != abs(py - y) || px == x) continue;   // must be diagonal
            auto a = cnt.find({x, py}), b = cnt.find({px, y});
            if (a != cnt.end() && b != cnt.end()) total += c * a->second * b->second;
        }
        return total;
    }
};
```

### Explanation
A diagonal corner fixes the whole square. Multiply counts because duplicate points form distinct squares.

**Time:** add O(log n), count O(n log n) · **Space:** O(n)
