## rotate-image

### Approach 1: Copy into a new matrix
```cpp
class Solution {
public:
    void rotate(vector<vector<int>>& M) {
        int n = M.size();
        auto R = M;
        for (int r = 0; r < n; ++r)
            for (int c = 0; c < n; ++c) R[c][n - 1 - r] = M[r][c];   // (r, c) -> (c, n-1-r)
        M = std::move(R);
    }
};
```

**Time:** O(n²) · **Space:** O(n²). Violates "in place" but states the mapping clearly.

### Approach 2: Rotate four cells at a time, layer by layer
```cpp
class Solution {
public:
    void rotate(vector<vector<int>>& M) {
        int n = M.size();
        for (int layer = 0; layer < n / 2; ++layer) {
            int first = layer, last = n - 1 - layer;
            for (int i = first; i < last; ++i) {
                int off = i - first;
                int top = M[first][i];                                   // save top
                M[first][i] = M[last - off][first];                      // left -> top
                M[last - off][first] = M[last][last - off];              // bottom -> left
                M[last][last - off] = M[i][last];                        // right -> bottom
                M[i][last] = top;                                        // top -> right
            }
        }
    }
};
```

**Time:** O(n²) · **Space:** O(1). Each cell is moved exactly once; harder to get right than transpose + reverse.

### Walkthrough
**Goal:** rotate 90° clockwise in place.

1. Clockwise rotation maps `(r, c) → (c, n−1−r)`.
2. **Transpose** (swap across the main diagonal) maps `(r, c) → (c, r)`.
3. **Reverse each row** maps `(c, r) → (c, n−1−r)`. Composition = rotation.
4. Only swap `j > i` during the transpose, or you'd swap each pair twice (undoing it).

**Dry run**

```text
original      transpose     reverse rows
1 2 3         1 4 7         7 4 1
4 5 6   →     2 5 8   →     8 5 2
7 8 9         3 6 9         9 6 3
```

## spiral-matrix

### Approach 1: Direction vectors + visited markers
```cpp
class Solution {
public:
    vector<int> spiralOrder(vector<vector<int>>& M) {
        int R = M.size(), C = M[0].size();
        vector<vector<bool>> seen(R, vector<bool>(C, false));
        constexpr int dr[] = {0, 1, 0, -1}, dc[] = {1, 0, -1, 0};   // right, down, left, up
        vector<int> out;
        int r = 0, c = 0, d = 0;
        for (int k = 0; k < R * C; ++k) {
            out.push_back(M[r][c]);
            seen[r][c] = true;
            int nr = r + dr[d], nc = c + dc[d];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C || seen[nr][nc]) {   // blocked: turn right
                d = (d + 1) % 4;
                nr = r + dr[d]; nc = c + dc[d];
            }
            r = nr; c = nc;
        }
        return out;
    }
};
```

**Time:** O(R·C) · **Space:** O(R·C). Simulation is very hard to get wrong.

### Approach 2: Recursive peeling of the outer ring
```cpp
class Solution {
    void peel(const vector<vector<int>>& M, int top, int bot, int left, int right, vector<int>& out) {
        if (top > bot || left > right) return;
        for (int c = left; c <= right; ++c) out.push_back(M[top][c]);
        for (int r = top + 1; r <= bot; ++r) out.push_back(M[r][right]);
        if (top < bot) for (int c = right - 1; c >= left; --c) out.push_back(M[bot][c]);
        if (left < right) for (int r = bot - 1; r > top; --r) out.push_back(M[r][left]);
        peel(M, top + 1, bot - 1, left + 1, right - 1, out);
    }
public:
    vector<int> spiralOrder(vector<vector<int>>& M) {
        vector<int> out;
        peel(M, 0, M.size() - 1, 0, M[0].size() - 1, out);
        return out;
    }
};
```

**Time:** O(R·C) · **Space:** O(min(R, C)) recursion.

### Walkthrough
**Goal:** read the matrix in clockwise spiral order.

1. Keep four boundaries: `top`, `bot`, `left`, `right`.
2. Read the top row left→right, then `top++`.
3. Read the right column top→bottom, then `right--`.
4. If rows remain (`top ≤ bot`): read the bottom row right→left, then `bot--`.
5. If columns remain (`left ≤ right`): read the left column bottom→top, then `left++`.
6. Repeat while `top ≤ bot && left ≤ right`. The two `if`s stop a single remaining row/column from being read twice.

**Dry run** 3×4 `[[1,2,3,4],[5,6,7,8],[9,10,11,12]]`:

| step | read | boundaries after |
|---|---|---|
| top row | 1 2 3 4 | top = 1 |
| right col | 8 12 | right = 2 |
| bottom row | 11 10 9 | bot = 1 |
| left col | 5 | left = 1 |
| top row | 6 7 | top = 2 → loop ends |

Result `1 2 3 4 8 12 11 10 9 5 6 7`.

## set-matrix-zeroes

### Approach 1: Copy the matrix
```cpp
class Solution {
public:
    void setZeroes(vector<vector<int>>& M) {
        auto orig = M;
        int R = M.size(), C = M[0].size();
        for (int r = 0; r < R; ++r) for (int c = 0; c < C; ++c)
            if (orig[r][c] == 0) {
                for (int k = 0; k < C; ++k) M[r][k] = 0;
                for (int k = 0; k < R; ++k) M[k][c] = 0;
            }
    }
};
```

**Time:** O(R·C·(R + C)) · **Space:** O(R·C). Reading from the copy avoids cascading zeros.

### Approach 2: Row and column marker arrays
```cpp
class Solution {
public:
    void setZeroes(vector<vector<int>>& M) {
        int R = M.size(), C = M[0].size();
        vector<bool> row(R, false), col(C, false);
        for (int r = 0; r < R; ++r) for (int c = 0; c < C; ++c) if (M[r][c] == 0) row[r] = col[c] = true;
        for (int r = 0; r < R; ++r) for (int c = 0; c < C; ++c) if (row[r] || col[c]) M[r][c] = 0;
    }
};
```

**Time:** O(R·C) · **Space:** O(R + C). The natural answer; the O(1) version stores these markers inside the matrix itself.

### Walkthrough
**Goal:** zero full rows/columns of every original zero, using O(1) extra space.

1. Use **row 0 as the column markers** and **column 0 as the row markers**. Cell (0,0) would serve both, so use it for row 0 and keep a separate flag `firstCol` for column 0.
2. **Pass 1:** for every zero at (r, c), set `M[r][0] = 0` and `M[0][c] = 0`.
3. **Pass 2** (bottom-up, right-to-left so markers are read before being overwritten): zero `M[r][c]` if its row or column marker is 0; then zero column 0 for row r if `firstCol`.

**Dry run** `[[1,1,1],[1,0,1],[1,1,1]]`:

- Pass 1: zero at (1,1) → `M[1][0] = 0`, `M[0][1] = 0`.
- Pass 2: every cell in row 1 or column 1 becomes 0 → `[[1,0,1],[0,0,0],[1,0,1]]`.

## happy-number

### Approach 1: Hash set of seen values
```cpp
class Solution {
    static int next(int n) { int s = 0; while (n) { int d = n % 10; s += d * d; n /= 10; } return s; }
public:
    bool isHappy(int n) {
        unordered_set<int> seen;
        while (n != 1 && seen.insert(n).second) n = next(n);   // stop at 1 or on a repeat
        return n == 1;
    }
};
```

**Time:** O(log n) per step, few steps · **Space:** O(number of steps).

### Approach 2: Known cycle shortcut
```cpp
class Solution {
    static int next(int n) { int s = 0; while (n) { int d = n % 10; s += d * d; n /= 10; } return s; }
public:
    bool isHappy(int n) {
        while (n != 1 && n != 4) n = next(n);   // every unhappy number enters the cycle containing 4
        return n == 1;
    }
};
```

**Time:** O(log n) · **Space:** O(1). Relies on a mathematical fact (the only cycle is 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4) — mention it, but prefer Floyd's in interviews.

### Walkthrough
**Goal:** does repeatedly summing squared digits reach 1, or loop forever?

1. The sequence is deterministic and values quickly drop below a few hundred, so it must eventually **repeat** — it either sticks at 1 (1 → 1) or enters a cycle.
2. Use Floyd's cycle detection: `slow` takes one step, `fast` two. They meet inside the cycle; if that meeting point is 1, the number is happy.

**Dry run** n = 19:

| step | value |
|---|---|
| 0 | 19 |
| 1 | 1² + 9² = 82 |
| 2 | 8² + 2² = 68 |
| 3 | 6² + 8² = 100 |
| 4 | 1 → **happy** |

## plus-one

### Approach 1: General addition with carry
```cpp
class Solution {
public:
    vector<int> plusOne(vector<int>& d) {
        int carry = 1;
        for (int i = (int)d.size() - 1; i >= 0 && carry; --i) {
            int s = d[i] + carry;
            d[i] = s % 10;
            carry = s / 10;
        }
        if (carry) d.insert(d.begin(), carry);
        return d;
    }
};
```

**Time:** O(n) · **Space:** O(1) amortised. Same as adding any number — generalises to "add k".

### Approach 2: Find the last non-9
```cpp
class Solution {
public:
    vector<int> plusOne(vector<int>& d) {
        int i = d.size() - 1;
        while (i >= 0 && d[i] == 9) d[i--] = 0;        // trailing 9s become 0
        if (i < 0) d.insert(d.begin(), 1);             // all were 9s
        else ++d[i];
        return d;
    }
};
```

**Time:** O(n) · **Space:** O(1).

### Walkthrough
**Goal:** add 1 to a big number stored as digits (most significant first).

1. Walk from the last digit.
2. If the digit is < 9, increment it and **return immediately** — no carry.
3. If it's 9, it becomes 0 and the carry continues left.
4. If every digit was 9, prepend a 1.

**Dry runs:**

| input | steps | output |
|---|---|---|
| [1,2,3] | 3 → 4, return | [1,2,4] |
| [1,9,9] | 9 → 0, 9 → 0, 1 → 2 | [2,0,0] |
| [9,9] | 9 → 0, 9 → 0, prepend 1 | [1,0,0] |

## powx-n

### Approach 1: Linear multiplication
```cpp
class Solution {
public:
    double myPow(double x, int n) {
        long long e = n;
        if (e < 0) { x = 1 / x; e = -e; }
        double r = 1;
        for (long long i = 0; i < e; ++i) r *= x;
        return r;
    }
};
```

**Time:** O(|n|) — up to 2·10⁹ multiplications → TLE · **Space:** O(1).

### Approach 2: Recursive fast power
```cpp
class Solution {
    double pw(double x, long long e) {
        if (e == 0) return 1;
        double half = pw(x, e / 2);                    // compute once, reuse
        return e % 2 ? half * half * x : half * half;
    }
public:
    double myPow(double x, int n) {
        long long e = n;
        return e < 0 ? 1 / pw(x, -e) : pw(x, e);
    }
};
```

**Time:** O(log n) · **Space:** O(log n). Writing `pw(x, e/2) * pw(x, e/2)` (two calls) would be O(n) — a classic mistake.

### Walkthrough
**Goal:** xⁿ in O(log n) multiplications (binary exponentiation).

1. Convert `n` to `long long` **before** negating — `-INT_MIN` overflows a 32-bit int.
2. Negative exponent: `x = 1/x`, `e = −e`.
3. Loop over the bits of `e`: whenever the lowest bit is 1, multiply the result by the current `x`. Then square `x` (moving from x^(2^k) to x^(2^(k+1))) and shift `e` right.

**Dry run** x = 2, n = 10 (binary 1010):

| e (binary) | bit | result | x |
|---|---|---|---|
| 1010 | 0 | 1 | 2 → 4 |
| 101 | 1 | 4 | 4 → 16 |
| 10 | 0 | 4 | 16 → 256 |
| 1 | 1 | 4·256 = **1024** | |

## multiply-strings

### Approach 1: School method with one row per digit
```cpp
class Solution {
    static string addStr(const string& a, const string& b) {        // non-negative decimal strings
        string r; int i = a.size() - 1, j = b.size() - 1, carry = 0;
        while (i >= 0 || j >= 0 || carry) {
            int s = carry + (i >= 0 ? a[i--] - '0' : 0) + (j >= 0 ? b[j--] - '0' : 0);
            r += char('0' + s % 10); carry = s / 10;
        }
        reverse(r.begin(), r.end());
        return r;
    }
public:
    string multiply(string a, string b) {
        if (a == "0" || b == "0") return "0";
        string total = "0";
        for (int j = b.size() - 1, shift = 0; j >= 0; --j, ++shift) {
            string row(shift, '0');                                  // trailing zeros for place value
            int carry = 0, d = b[j] - '0';
            for (int i = a.size() - 1; i >= 0; --i) {
                int p = (a[i] - '0') * d + carry;
                row += char('0' + p % 10); carry = p / 10;
            }
            if (carry) row += char('0' + carry);
            reverse(row.begin(), row.end());
            total = addStr(total, row);
        }
        return total;
    }
};
```

**Time:** O(m·n + n·(m+n)) · **Space:** O(m + n). Exactly how you multiply on paper.

### Approach 2: Karatsuba (for very large numbers)
For huge inputs, Karatsuba splits each number into halves and uses 3 recursive multiplications instead of 4: O(n^1.585). Libraries like GMP switch to Karatsuba, Toom-Cook, then FFT-based multiplication as size grows. Worth naming; rarely coded in interviews.

### Walkthrough
**Goal:** multiply two decimal strings without converting to integers (they can have 200 digits).

1. Result has at most `m + n` digits → `pos[m+n]`.
2. Digit `a[i] × b[j]` contributes to positions `i + j` (tens) and `i + j + 1` (ones).
3. Iterate from the least significant digits: `sum = a[i]·b[j] + pos[i+j+1]`; store `sum % 10` at `i+j+1` and add `sum / 10` to `i+j`.
4. Convert to a string, skipping leading zeros (return "0" if nothing remains).

**Dry run** "12" × "34":

| i, j | product | pos after (index 0..3) |
|---|---|---|
| 1, 1 (2·4) | 8 | 0 0 0 8 |
| 1, 0 (2·3) | 6 + 0 | 0 0 6 8 |
| 0, 1 (1·4) | 4 + 6 = 10 | 0 1 0 8 |
| 0, 0 (1·3) | 3 + 1 = 4 | 0 4 0 8 |

Result **"408"**.

## detect-squares

### Approach 1: Group points by x-coordinate
```cpp
class DetectSquares {
    unordered_map<int, unordered_map<int, int>> byX;        // x -> (y -> count)
public:
    void add(vector<int> p) { ++byX[p[0]][p[1]]; }
    int count(vector<int> p) {
        int x = p[0], y = p[1], total = 0;
        auto colIt = byX.find(x);
        if (colIt == byX.end()) return 0;
        for (auto [y2, c] : colIt->second) {                  // second corner on the same vertical line
            int side = y2 - y;
            if (side == 0) continue;
            for (int x2 : {x + side, x - side}) {             // square to the right or the left
                auto it = byX.find(x2);
                if (it == byX.end()) continue;
                auto a = it->second.find(y), b = it->second.find(y2);
                if (a != it->second.end() && b != it->second.end()) total += c * a->second * b->second;
            }
        }
        return total;
    }
};
```

**Time:** count O(points sharing x) · **Space:** O(n). Fewer candidates than scanning all points.

### Approach 2: Point list + hash counts
```cpp
class DetectSquares {
    vector<pair<int, int>> pts;                              // every added point (with duplicates)
    map<pair<int, int>, int> cnt;
public:
    void add(vector<int> p) { pts.push_back({p[0], p[1]}); ++cnt[{p[0], p[1]}]; }
    int count(vector<int> p) {
        int x = p[0], y = p[1], total = 0;
        for (auto [px, py] : pts) {                          // each duplicate counted separately
            if (abs(px - x) != abs(py - y) || px == x) continue;
            auto a = cnt.find({x, py}), b = cnt.find({px, y});
            if (a != cnt.end() && b != cnt.end()) total += a->second * b->second;
        }
        return total;
    }
};
```

**Time:** count O(n log n) · **Space:** O(n). The NeetCode-style version; iterating the raw list counts duplicates naturally.

### Walkthrough
**Goal:** count axis-aligned squares (positive area) formed by a query point and three stored points.

1. Store counts of each point (duplicates matter).
2. Treat the query `(x, y)` as one corner. Pick a stored point `(px, py)` as the **diagonal** corner: requires `|px − x| == |py − y| ≠ 0`.
3. The other two corners are then forced: `(x, py)` and `(px, y)`.
4. Number of squares with this diagonal = `count(px,py) × count(x,py) × count(px,y)`.

**Dry run** points added: (3,10), (11,2), (3,2); query (11,10):

| diagonal candidate | |dx| = |dy|? | other corners | contribution |
|---|---|---|---|
| (3,2) | 8 = 8 ✔ | (11,2) ✔, (3,10) ✔ | 1·1·1 = 1 |
| (3,10) | 8 ≠ 0 ✗ | | 0 |
| (11,2) | 0 ✗ | | 0 |

Answer **1**. Adding (11,2) again doubles it to 2.
