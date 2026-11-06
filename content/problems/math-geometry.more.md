## rotate-image

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

### Walkthrough
**Goal:** zero full rows/columns of every original zero, using O(1) extra space.

1. Use **row 0 as the column markers** and **column 0 as the row markers**. Cell (0,0) would serve both, so use it for row 0 and keep a separate flag `firstCol` for column 0.
2. **Pass 1:** for every zero at (r, c), set `M[r][0] = 0` and `M[0][c] = 0`.
3. **Pass 2** (bottom-up, right-to-left so markers are read before being overwritten): zero `M[r][c]` if its row or column marker is 0; then zero column 0 for row r if `firstCol`.

**Dry run** `[[1,1,1],[1,0,1],[1,1,1]]`:

- Pass 1: zero at (1,1) → `M[1][0] = 0`, `M[0][1] = 0`.
- Pass 2: every cell in row 1 or column 1 becomes 0 → `[[1,0,1],[0,0,0],[1,0,1]]`.

## happy-number

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
