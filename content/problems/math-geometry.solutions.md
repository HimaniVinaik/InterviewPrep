## rotate-image

### Approach 1: Copy into a new matrix
**The idea:** clockwise rotation sends cell `(r, c)` to `(c, n − 1 − r)`. Fill a copy, then copy it back.

```cpp
class Solution {
public:
    void rotate(vector<vector<int>>& matrix) {
        int n = matrix.size();
        vector<vector<int>> rotated(n, vector<int>(n));
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                rotated[c][n - 1 - r] = matrix[r][c];   // where (r, c) lands after rotating
            }
        }
        matrix = rotated;
    }
};
```

**How it works:** the first row becomes the last column, the second row the second-last column, …

**Think of it like this:** turning a photo 90° by redrawing it on a fresh sheet.

**Cost:** Time **O(n²)**. Space **O(n²)** — the problem asks for in place.

### Approach 2: Rotate four cells at a time, ring by ring
**The idea:** each cell is part of a group of 4 that move into each other's places. Rotate each group with one temporary variable.

```cpp
class Solution {
public:
    void rotate(vector<vector<int>>& matrix) {
        int n = matrix.size();
        for (int layer = 0; layer < n / 2; layer++) {
            int first = layer;
            int last = n - 1 - layer;
            for (int i = first; i < last; i++) {
                int offset = i - first;
                int top = matrix[first][i];                               // save top

                matrix[first][i] = matrix[last - offset][first];          // left → top
                matrix[last - offset][first] = matrix[last][last - offset];   // bottom → left
                matrix[last][last - offset] = matrix[i][last];            // right → bottom
                matrix[i][last] = top;                                    // top → right
            }
        }
    }
};
```

**How it works:** the outer ring is rotated, then the next ring inside, and so on.

**Think of it like this:** four people standing at the corners of a square, all stepping one corner clockwise at the same time.

**Cost:** Time **O(n²)**. Space **O(1)**.

### Optimal: Transpose, then reverse each row
**The idea:** transpose (flip across the main diagonal) sends `(r, c)` to `(c, r)`; reversing each row then sends it to `(c, n − 1 − r)` — exactly a clockwise rotation.

```cpp
class Solution {
public:
    void rotate(vector<vector<int>>& matrix) {
        int n = matrix.size();

        // 1. Transpose: swap across the main diagonal.
        //    Start j at i + 1 so each pair is swapped once (twice would undo it).
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                swap(matrix[i][j], matrix[j][i]);
            }
        }

        // 2. Mirror each row left ↔ right.
        for (vector<int>& row : matrix) {
            reverse(row.begin(), row.end());
        }
    }
};
```

**How it works**
1. Transpose: rows become columns.
2. Reverse rows: mirror left and right.
3. Together: a 90° clockwise turn.

**Think of it like this:** flip a transparency diagonally, then flip it left-to-right — two easy flips make one rotation.

**Why it's optimal:** in place, O(n²), and much harder to get wrong than index juggling.

**Cost:** Time **O(n²)**. Space **O(1)**.

## spiral-matrix

### Approach 1: Direction vectors + visited markers
**The idea:** walk like a robot: go right until you hit a wall or a visited cell, then turn clockwise.

```cpp
class Solution {
public:
    vector<int> spiralOrder(vector<vector<int>>& matrix) {
        int R = matrix.size();
        int C = matrix[0].size();
        vector<vector<bool>> visited(R, vector<bool>(C, false));
        int dr[4] = {0, 1, 0, -1};    // right, down, left, up
        int dc[4] = {1, 0, -1, 0};
        int dir = 0;
        int r = 0;
        int c = 0;
        vector<int> out;

        for (int step = 0; step < R * C; step++) {
            out.push_back(matrix[r][c]);
            visited[r][c] = true;
            int nr = r + dr[dir];
            int nc = c + dc[dir];
            bool blocked = nr < 0 || nc < 0 || nr >= R || nc >= C || visited[nr][nc];
            if (blocked) {
                dir = (dir + 1) % 4;          // turn clockwise
                nr = r + dr[dir];
                nc = c + dc[dir];
            }
            r = nr;
            c = nc;
        }
        return out;
    }
};
```

**How it works:** turning right whenever blocked naturally traces the spiral.

**Think of it like this:** a snake in a box that turns right whenever it would hit the wall or its own body.

**Cost:** Time **O(R·C)**. Space **O(R·C)** for `visited`.

### Approach 2: Recursive peeling of the outer ring
**The idea:** read the outer ring, then do the same on the inner rectangle.

```cpp
class Solution {
public:
    vector<int> spiralOrder(vector<vector<int>>& matrix) {
        vector<int> out;
        peel(matrix, 0, matrix.size() - 1, 0, matrix[0].size() - 1, out);
        return out;
    }

private:
    void peel(vector<vector<int>>& m, int top, int bot, int left, int right, vector<int>& out) {
        if (top > bot || left > right) {
            return;                                    // nothing left
        }
        for (int c = left; c <= right; c++) {
            out.push_back(m[top][c]);                  // top row
        }
        for (int r = top + 1; r <= bot; r++) {
            out.push_back(m[r][right]);                // right column
        }
        if (top < bot) {
            for (int c = right - 1; c >= left; c--) {
                out.push_back(m[bot][c]);              // bottom row (if different from top)
            }
        }
        if (left < right) {
            for (int r = bot - 1; r > top; r--) {
                out.push_back(m[r][left]);             // left column (if different from right)
            }
        }
        peel(m, top + 1, bot - 1, left + 1, right - 1, out);
    }
};
```

**How it works:** each call handles one ring; the `if`s avoid double-reading a single row or column.

**Think of it like this:** peeling an onion one layer at a time.

**Cost:** Time **O(R·C)**. Space **O(min(R, C))** recursion.

### Optimal: Four shrinking boundaries
**The idea:** keep `top`, `bot`, `left`, `right`. Read the top row, right column, bottom row, left column — shrinking the boundary after each.

```cpp
class Solution {
public:
    vector<int> spiralOrder(vector<vector<int>>& matrix) {
        vector<int> out;
        int top = 0;
        int bot = matrix.size() - 1;
        int left = 0;
        int right = matrix[0].size() - 1;

        while (top <= bot && left <= right) {
            // Top row, left → right.
            for (int c = left; c <= right; c++) {
                out.push_back(matrix[top][c]);
            }
            top++;

            // Right column, top → bottom.
            for (int r = top; r <= bot; r++) {
                out.push_back(matrix[r][right]);
            }
            right--;

            // Bottom row, right → left (only if a row is left).
            if (top <= bot) {
                for (int c = right; c >= left; c--) {
                    out.push_back(matrix[bot][c]);
                }
                bot--;
            }

            // Left column, bottom → top (only if a column is left).
            if (left <= right) {
                for (int r = bot; r >= top; r--) {
                    out.push_back(matrix[r][left]);
                }
                left++;
            }
        }
        return out;
    }
};
```

**How it works**
1. Four boundaries describe the unread rectangle.
2. Read one side, then move that boundary inwards.
3. The two `if`s stop a single remaining row or column being read twice.

**Think of it like this:** mowing a lawn from the outside in, one strip per side.

**Why it's optimal:** O(R·C) time, O(1) extra memory, iterative.

**Cost:** Time **O(R·C)**. Space **O(1)** extra.

## set-matrix-zeroes

### Approach 1: Copy the matrix
**The idea:** look for zeros in an untouched copy, and write zeros into the real matrix.

```cpp
class Solution {
public:
    void setZeroes(vector<vector<int>>& matrix) {
        vector<vector<int>> original = matrix;
        int R = matrix.size();
        int C = matrix[0].size();
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (original[r][c] == 0) {
                    for (int k = 0; k < C; k++) {
                        matrix[r][k] = 0;         // whole row
                    }
                    for (int k = 0; k < R; k++) {
                        matrix[k][c] = 0;         // whole column
                    }
                }
            }
        }
    }
};
```

**How it works:** the copy prevents new zeros from spreading further.

**Think of it like this:** marking a photocopy so you can still read the original.

**Cost:** Time **O(R·C·(R + C))**. Space **O(R·C)**.

### Approach 2: Row and column marker arrays
**The idea:** remember which rows and which columns contain a zero, then zero them in a second pass.

```cpp
class Solution {
public:
    void setZeroes(vector<vector<int>>& matrix) {
        int R = matrix.size();
        int C = matrix[0].size();
        vector<bool> zeroRow(R, false);
        vector<bool> zeroCol(C, false);
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (matrix[r][c] == 0) {
                    zeroRow[r] = true;
                    zeroCol[c] = true;
                }
            }
        }
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (zeroRow[r] || zeroCol[c]) {
                    matrix[r][c] = 0;
                }
            }
        }
    }
};
```

**How it works:** two passes; the markers record the original zeros.

**Think of it like this:** a tick-list for rows down the side and for columns along the top.

**Cost:** Time **O(R·C)**. Space **O(R + C)**.

### Optimal: Use the first row and column as the markers
**The idea:** Approach 2, but store the markers inside the matrix itself: row 0 marks columns, column 0 marks rows. Column 0 needs one extra flag because cell (0, 0) can't mark both.

```cpp
class Solution {
public:
    void setZeroes(vector<vector<int>>& matrix) {
        int R = matrix.size();
        int C = matrix[0].size();
        bool firstCol = false;              // should column 0 become all zeros?

        // Pass 1: record markers.
        for (int r = 0; r < R; r++) {
            if (matrix[r][0] == 0) {
                firstCol = true;
            }
            for (int c = 1; c < C; c++) {
                if (matrix[r][c] == 0) {
                    matrix[r][0] = 0;       // mark row r
                    matrix[0][c] = 0;       // mark column c
                }
            }
        }

        // Pass 2: bottom-up and right-to-left, so markers in row 0 / column 0
        // are read before they get overwritten.
        for (int r = R - 1; r >= 0; r--) {
            for (int c = C - 1; c >= 1; c--) {
                if (matrix[r][0] == 0 || matrix[0][c] == 0) {
                    matrix[r][c] = 0;
                }
            }
            if (firstCol) {
                matrix[r][0] = 0;
            }
        }
    }
};
```

**How it works**
1. Row 0 = column markers; column 0 = row markers; `firstCol` for column 0 itself.
2. Pass 1: for each zero, mark its row and column.
3. Pass 2 (reverse order): zero cells whose row or column is marked.

**Think of it like this:** writing the to-do list on the edge of the page instead of on a separate sheet.

**Why it's optimal:** O(R·C) time with O(1) extra memory.

**Cost:** Time **O(R·C)**. Space **O(1)**.

## happy-number

### Approach 1: Hash set of seen values
**The idea:** keep applying "sum of squared digits". If you reach 1, it's happy; if you see a number again, it's stuck in a loop.

```cpp
class Solution {
public:
    bool isHappy(int n) {
        unordered_set<int> seen;
        while (n != 1) {
            if (seen.count(n) > 0) {
                return false;             // we've been here before: a loop without 1
            }
            seen.insert(n);
            n = next(n);
        }
        return true;
    }

private:
    int next(int n) {
        int sum = 0;
        while (n > 0) {
            int d = n % 10;
            sum += d * d;
            n /= 10;
        }
        return sum;
    }
};
```

**How it works:** values quickly fall below a few hundred, so the set stays small.

**Think of it like this:** dropping breadcrumbs; if you find one, you're walking in circles.

**Cost:** Time **O(log n)** per step, few steps. Space **O(number of steps)**.

### Approach 2: Known cycle shortcut
**The idea:** every unhappy number eventually enters the cycle 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4. So stop when you hit 1 or 4.

```cpp
class Solution {
public:
    bool isHappy(int n) {
        while (n != 1 && n != 4) {
            int sum = 0;
            while (n > 0) {
                int d = n % 10;
                sum += d * d;
                n /= 10;
            }
            n = sum;
        }
        return n == 1;
    }
};
```

**How it works:** relies on a known mathematical fact about this process.

**Think of it like this:** knowing the only roundabout in town, you just watch for it.

**Cost:** Time **O(log n)** per step. Space **O(1)**.

### Optimal: Floyd's cycle detection
**The idea:** the sequence must eventually repeat. Run a slow and a fast pointer; they meet inside the cycle. If the meeting point is 1, the number is happy.

```cpp
class Solution {
public:
    bool isHappy(int n) {
        int slow = n;
        int fast = next(n);
        while (fast != 1 && slow != fast) {
            slow = next(slow);           // one step
            fast = next(next(fast));     // two steps
        }
        return fast == 1;
    }

private:
    // Sum of the squares of the digits of n.
    static int next(int n) {
        int s = 0;
        while (n > 0) {
            int d = n % 10;
            s += d * d;
            n /= 10;
        }
        return s;
    }
};
```

**How it works**
1. The sequence either reaches 1 (and stays there) or loops forever.
2. Fast moves twice as quickly, so it either finds 1 or laps slow inside the loop.

**Think of it like this:** Linked List Cycle, where "next" is "sum of squared digits".

**Why it's optimal:** O(1) memory and no magic constants.

**Cost:** Time **O(log n)** per step. Space **O(1)**.

## plus-one

### Approach 1: General addition with a carry
**The idea:** add 1 to the last digit and carry left, like adding on paper.

```cpp
class Solution {
public:
    vector<int> plusOne(vector<int>& digits) {
        int carry = 1;                       // the +1
        for (int i = digits.size() - 1; i >= 0; i--) {
            int sum = digits[i] + carry;
            digits[i] = sum % 10;
            carry = sum / 10;
        }
        if (carry > 0) {
            digits.insert(digits.begin(), carry);   // e.g. 999 + 1 = 1000
        }
        return digits;
    }
};
```

**How it works:** carries move left until they stop.

**Think of it like this:** a car's odometer rolling over.

**Cost:** Time **O(n)**. Space **O(1)** (O(n) when a new digit is added).

### Approach 2: Find the last digit that isn't 9
**The idea:** all trailing 9s become 0, and the digit before them goes up by one.

```cpp
class Solution {
public:
    vector<int> plusOne(vector<int>& digits) {
        int i = digits.size() - 1;
        while (i >= 0 && digits[i] == 9) {
            digits[i] = 0;                   // 9 + 1 = 10: write 0, carry on
            i--;
        }
        if (i < 0) {
            digits.insert(digits.begin(), 1);   // every digit was 9
        } else {
            digits[i]++;
        }
        return digits;
    }
};
```

**How it works:** splits the work into "zero the 9s" and "bump the next digit".

**Think of it like this:** 1299 + 1 → the 9s roll to 0, the 2 becomes 3.

**Cost:** Time **O(n)**. Space **O(1)**.

### Optimal: Early return as soon as there's no carry
**The idea:** from the right, a digit below 9 just increases and we're done; a 9 becomes 0 and the carry continues.

```cpp
class Solution {
public:
    vector<int> plusOne(vector<int>& digits) {
        for (int i = (int)digits.size() - 1; i >= 0; i--) {
            if (digits[i] < 9) {
                digits[i]++;              // no carry: finished
                return digits;
            }
            digits[i] = 0;                // 9 → 0, carry into the next digit
        }
        // Every digit was 9 (e.g. 999): the answer is 1 followed by zeros.
        digits.insert(digits.begin(), 1);
        return digits;
    }
};
```

**How it works**
1. Walk from the last digit.
2. `< 9` → increment and return.
3. `9` → 0 and keep going.
4. All 9s → prepend 1.

**Think of it like this:** most of the time you only touch the last digit.

**Why it's optimal:** stops as early as possible; usually O(1).

**Cost:** Time **O(n)** worst case. Space **O(1)**.

## powx-n

### Approach 1: Multiply n times
**The idea:** multiply x by itself |n| times; invert for negative n.

```cpp
class Solution {
public:
    double myPow(double x, int n) {
        long long e = n;              // widen first: -INT_MIN doesn't fit in int
        if (e < 0) {
            x = 1 / x;
            e = -e;
        }
        double result = 1;
        for (long long i = 0; i < e; i++) {
            result *= x;              // one multiplication per unit of the exponent
        }
        return result;
    }
};
```

**How it works:** literal definition.

**Think of it like this:** doubling your money every day by hand, day after day.

**Cost:** Time **O(|n|)** — up to 2 billion multiplications, so it times out for large n. Space **O(1)**.

### Approach 2: Recursive fast power
**The idea:** `x^n = (x^(n/2))²`, times an extra x if n is odd.

```cpp
class Solution {
public:
    double myPow(double x, int n) {
        long long e = n;
        if (e < 0) {
            x = 1 / x;
            e = -e;
        }
        return power(x, e);
    }

private:
    double power(double x, long long e) {
        if (e == 0) {
            return 1;
        }
        double half = power(x, e / 2);   // compute once, use twice
        if (e % 2 == 0) {
            return half * half;
        }
        return half * half * x;
    }
};
```

**How it works:** the exponent halves each call → log n calls.

**Think of it like this:** x¹⁶ = (((x²)²)²)² — four squarings instead of 15 multiplications.

**Cost:** Time **O(log n)**. Space **O(log n)** stack.

### Optimal: Iterative binary exponentiation
**The idea:** write n in binary. x^13 = x^8 · x^4 · x^1 (13 = 1101₂). Square x each step and multiply it in when the current bit is 1.

```cpp
class Solution {
public:
    double myPow(double x, int n) {
        long long e = n;              // widen BEFORE negating: -INT_MIN overflows int
        if (e < 0) {
            x = 1 / x;                // x^-n = (1/x)^n
            e = -e;
        }

        double result = 1;
        while (e > 0) {
            if (e & 1) {
                result *= x;          // this bit of e contributes the current x^(2^k)
            }
            x *= x;                   // x^(2^k) → x^(2^(k+1))
            e >>= 1;                  // move to the next bit
        }
        return result;
    }
};
```

**How it works**
1. Convert to `long long` first.
2. Negative exponent → use 1/x.
3. For each bit of e: multiply in the current power if the bit is 1, then square.

**Think of it like this:** paying 13 coins using 8-, 4- and 1-coin pieces.

**Why it's optimal:** O(log n) multiplications, no recursion.

**Cost:** Time **O(log n)**. Space **O(1)**.

## multiply-strings

### Approach 1: School method — one row per digit
**The idea:** multiply the first number by each digit of the second, shift by its position, and add all the rows.

```cpp
class Solution {
public:
    string multiply(string a, string b) {
        if (a == "0" || b == "0") {
            return "0";
        }
        string total = "0";
        int n = b.size();
        for (int j = n - 1; j >= 0; j--) {
            // row = a * digit, then add (n - 1 - j) zeros for the place value.
            string row = multiplyByDigit(a, b[j] - '0');
            row += string(n - 1 - j, '0');
            total = addStrings(total, row);
        }
        return total;
    }

private:
    string multiplyByDigit(const string& a, int d) {
        string out;
        int carry = 0;
        for (int i = a.size() - 1; i >= 0; i--) {
            int prod = (a[i] - '0') * d + carry;
            out += char('0' + prod % 10);
            carry = prod / 10;
        }
        if (carry > 0) {
            out += char('0' + carry);
        }
        reverse(out.begin(), out.end());
        return out;
    }

    string addStrings(const string& x, const string& y) {
        string out;
        int i = x.size() - 1;
        int j = y.size() - 1;
        int carry = 0;
        while (i >= 0 || j >= 0 || carry > 0) {
            int sum = carry;
            if (i >= 0) {
                sum += x[i] - '0';
                i--;
            }
            if (j >= 0) {
                sum += y[j] - '0';
                j--;
            }
            out += char('0' + sum % 10);
            carry = sum / 10;
        }
        reverse(out.begin(), out.end());
        return out;
    }
};
```

**How it works:** exactly long multiplication from school.

**Think of it like this:** writing one row per digit and adding them at the end.

**Cost:** Time **O(m·n)** (with extra string copies). Space **O(m + n)**.

### Optimal: Position array
**The idea:** digit `a[i] × b[j]` always lands in positions `i + j` (tens) and `i + j + 1` (ones) of the result. Accumulate everything in one array.

```cpp
class Solution {
public:
    string multiply(string a, string b) {
        int m = a.size();
        int n = b.size();
        vector<int> pos(m + n, 0);          // the product has at most m + n digits

        for (int i = m - 1; i >= 0; i--) {
            for (int j = n - 1; j >= 0; j--) {
                int mul = (a[i] - '0') * (b[j] - '0');
                int sum = mul + pos[i + j + 1];     // add what's already in the ones place
                pos[i + j + 1] = sum % 10;          // keep the ones digit
                pos[i + j] += sum / 10;             // carry into the tens place
            }
        }

        // Build the string, skipping leading zeros.
        string out;
        for (int d : pos) {
            if (out.empty() && d == 0) {
                continue;
            }
            out += char('0' + d);
        }
        if (out.empty()) {
            return "0";
        }
        return out;
    }
};
```

**How it works**
1. `pos` has m + n slots.
2. Each digit pair adds into `i + j + 1` and carries into `i + j`.
3. Convert to a string without leading zeros.

**Think of it like this:** long multiplication, but every partial product is dropped straight into the right column instead of being written as a separate row.

**Why it's optimal:** O(m·n) with one array and no intermediate strings. (Karatsuba is faster asymptotically but only worth it for thousands of digits.)

**Cost:** Time **O(m·n)**. Space **O(m + n)**.

## detect-squares

### Approach 1: Group points by x-coordinate
**The idea:** for a query (x, y), every square has a corner directly above or below it: (x, y2). Look only at points with the same x, then check the other two corners.

```cpp
class DetectSquares {
public:
    void add(vector<int> point) {
        int x = point[0];
        int y = point[1];
        cnt[{x, y}]++;
        byX[x][y]++;
    }

    int count(vector<int> point) {
        int x = point[0];
        int y = point[1];
        int total = 0;
        if (byX.count(x) == 0) {
            return 0;
        }
        for (const pair<const int, int>& entry : byX[x]) {
            int y2 = entry.first;          // a point (x, y2) on the same vertical line
            int side = y2 - y;
            if (side == 0) {
                continue;                  // zero-area square
            }
            // Square to the right and square to the left.
            total += entry.second * get(x + side, y) * get(x + side, y2);
            total += entry.second * get(x - side, y) * get(x - side, y2);
        }
        return total;
    }

private:
    map<pair<int, int>, int> cnt;          // (x, y) → how many times added
    map<int, map<int, int>> byX;           // x → (y → count)

    int get(int x, int y) {
        auto it = cnt.find({x, y});
        if (it == cnt.end()) {
            return 0;
        }
        return it->second;
    }
};
```

**How it works:** the vertical side fixes the square's size; there are two possible squares (left and right).

**Think of it like this:** standing on a lamp post and looking for lamp posts directly above you to build squares from.

**Cost:** `add` **O(log n)**; `count` **O(points on the same x · log n)**.

### Optimal: Treat each stored point as the diagonal corner
**The idea:** a stored point (px, py) can be the opposite corner of the square if `|px − x| == |py − y| ≠ 0`. Then the other two corners are fixed: (x, py) and (px, y).

```cpp
class DetectSquares {
public:
    void add(vector<int> point) {
        cnt[{point[0], point[1]}]++;       // duplicates count separately
    }

    int count(vector<int> point) {
        int x = point[0];
        int y = point[1];
        int total = 0;
        for (const auto& entry : cnt) {
            int px = entry.first.first;
            int py = entry.first.second;
            int c = entry.second;
            // Must be a true diagonal: same distance in x and y, and not the same point.
            if (abs(px - x) != abs(py - y) || px == x) {
                continue;
            }
            auto a = cnt.find({x, py});    // corner sharing x with the query
            auto b = cnt.find({px, y});    // corner sharing y with the query
            if (a != cnt.end() && b != cnt.end()) {
                total += c * a->second * b->second;
            }
        }
        return total;
    }

private:
    map<pair<int, int>, int> cnt;          // point → how many copies
};
```

**How it works**
1. Store counts of each point.
2. For each stored point that is diagonal to the query, the other two corners are forced.
3. Multiply the three counts (duplicates make more squares).

**Think of it like this:** two opposite corners of a square fully decide where the other two must be.

**Why it's optimal:** `add` is O(log n) and `count` is linear in the number of distinct points, with simple code.

**Cost:** `add` **O(log n)**. `count` **O(n)** for n distinct points.
