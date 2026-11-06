# Level 1 · Vectors & Matrices (made simple)

> **Key idea:** a neural network is mostly "multiply a list of numbers by a table of numbers, add some numbers, repeat". Lists of numbers are **vectors**, tables are **matrices**. Learn these and you can read any ML code.

**Goals of this level**
- Know what vectors and matrices are, and what their **shapes** mean.
- Compute a **dot product** and a **matrix–vector / matrix–matrix product** by hand, in NumPy, and in C++.
- Understand why a matrix is "a function that transforms vectors".
- Avoid the #1 beginner bug in ML code: **shape mismatches**.

## 1. Vectors: a list of numbers with meaning

A **vector** is an ordered list of numbers. In ML, a vector usually describes **one thing**:

- a house: `[size_m2, bedrooms, age_years] = [120, 3, 15]`
- a 28×28 grey image flattened: 784 numbers between 0 and 1
- a word, as an "embedding": 300 numbers that encode its meaning (Level 13)

The number of entries is the vector's **dimension**. `[120, 3, 15]` is a 3-dimensional vector. We write vectors in bold or with an arrow: **x** = (x₁, x₂, x₃).

### Adding and scaling

- **Add** two vectors of the same length: add matching entries. `[1, 2] + [3, 5] = [4, 7]`
- **Scale** a vector: multiply every entry. `2 · [1, 2] = [2, 4]`

Picture a vector as an arrow from the origin. Adding vectors = putting arrows head to tail. Scaling = stretching the arrow.

### Length (norm)

The length of **x** is found with Pythagoras:

```text
‖x‖ = √(x₁² + x₂² + … + xₙ²)

‖[3, 4]‖ = √(9 + 16) = √25 = 5
```

## 2. The dot product — the most important operation in ML

Multiply matching entries and add them all up:

```text
a · b = a₁b₁ + a₂b₂ + … + aₙbₙ

[1, 2, 3] · [4, 5, 6] = 1·4 + 2·5 + 3·6 = 4 + 10 + 18 = 32
```

**Why it matters — meaning #1: a weighted sum.** A neuron (Level 7) computes exactly this. If **x** is a house and **w** = [3000, 10000, −500] are "how much each feature is worth", then **w · x** is a price estimate:

```text
3000·120 + 10000·3 + (−500)·15 = 360000 + 30000 − 7500 = 382500
```

**Why it matters — meaning #2: similarity.** Geometrically, `a · b = ‖a‖ ‖b‖ cos θ`, where θ is the angle between the arrows:

| Angle | cos θ | Dot product | Meaning |
|---|---|---|---|
| 0° (same direction) | 1 | large positive | very similar |
| 90° (perpendicular) | 0 | 0 | unrelated |
| 180° (opposite) | −1 | large negative | opposite |

Dividing by the lengths gives **cosine similarity**, which is how search engines and chatbots decide which texts are "about the same thing".

```python
import numpy as np

a = np.array([1.0, 2.0, 3.0])
b = np.array([4.0, 5.0, 6.0])

dot = a @ b                       # same as np.dot(a, b)
print("dot:", dot)                # 32.0
assert dot == 32.0

length_a = np.linalg.norm(a)      # √(1 + 4 + 9) = √14
cosine = dot / (np.linalg.norm(a) * np.linalg.norm(b))
print(f"|a| = {length_a:.4f}, cosine similarity = {cosine:.4f}")   # 3.7417, 0.9746

# A weighted sum: price estimate for a house.
house = np.array([120.0, 3.0, 15.0])
worth = np.array([3000.0, 10000.0, -500.0])
print("price estimate:", worth @ house)   # 382500.0
assert worth @ house == 382500.0
```

## 3. Matrices: a table of numbers

A **matrix** is a rectangle of numbers with **rows** and **columns**. Its **shape** is written `(rows, columns)`:

```text
A = | 1  2  3 |      shape (2, 3): 2 rows, 3 columns
    | 4  5  6 |
```

In ML, a matrix is often **a stack of vectors** — e.g. a dataset of 1,000 houses with 3 features each is a `(1000, 3)` matrix: one row per house.

### Matrix × vector

Multiply a `(m, n)` matrix by a vector of length `n`: **each output entry is the dot product of one row with the vector**.

```text
| 1  2  3 |   | 1 |   | 1·1 + 2·0 + 3·2 |   |  7 |
| 4  5  6 | · | 0 | = | 4·1 + 5·0 + 6·2 | = | 16 |
              | 2 |
(2, 3)        (3,)                          (2,)
```

The shapes tell you everything: `(2, 3) · (3,) → (2,)`. The inner numbers (3 and 3) must match; the outer one (2) is the result's size.

**This is a neural-network layer.** If a layer has 2 neurons that each look at 3 inputs, its weights are a `(2, 3)` matrix, and "run the layer" = "matrix × input vector".

### Matrix × matrix

`C = A · B` where A is `(m, n)` and B is `(n, p)` gives C of shape `(m, p)`, with

```text
C[i][j] = (row i of A) · (column j of B)
```

```text
| 1  2 |   | 5  6 |   | 1·5+2·7  1·6+2·8 |   | 19  22 |
| 3  4 | · | 7  8 | = | 3·5+4·7  3·6+4·8 | = | 43  50 |
```

> **Rule of thumb:** write the shapes next to each other: `(m, n) · (n, p)`. If the two middle numbers aren't equal, the multiplication is impossible. The result is the outer numbers: `(m, p)`.

**Order matters:** in general `A·B ≠ B·A`. (Try it below.)

### Transpose

The **transpose** Aᵀ flips rows and columns: shape `(m, n)` becomes `(n, m)`, and `Aᵀ[i][j] = A[j][i]`. You'll use it constantly in backpropagation (Level 8).

```python
import numpy as np

A = np.array([[1.0, 2.0, 3.0],
              [4.0, 5.0, 6.0]])          # shape (2, 3)
x = np.array([1.0, 0.0, 2.0])            # shape (3,)

y = A @ x                                 # (2, 3) @ (3,) -> (2,)
print("A @ x =", y)                       # [ 7. 16.]
assert (y == [7.0, 16.0]).all()

P = np.array([[1.0, 2.0], [3.0, 4.0]])
Q = np.array([[5.0, 6.0], [7.0, 8.0]])
print("P @ Q =\n", P @ Q)                 # [[19 22] [43 50]]
print("Q @ P =\n", Q @ P)                 # [[23 34] [31 46]]  — different!
assert not np.array_equal(P @ Q, Q @ P)

print("A.T shape:", A.T.shape)            # (3, 2)

# A whole dataset at once: 4 houses (rows) x 3 features.
X = np.array([[120, 3, 15], [80, 2, 30], [200, 5, 2], [60, 1, 50]], dtype=float)
w = np.array([3000.0, 10000.0, -500.0])
prices = X @ w                             # (4, 3) @ (3,) -> (4,): one price per house
print("prices:", prices)
```

That last line is important: **one matrix multiplication computes predictions for the whole dataset**. This "batching" is why GPUs make deep learning fast.

## 4. Matrices as transformations

A `(2, 2)` matrix moves every 2-D point somewhere else. For example, this matrix rotates points by 90°:

```text
R = | 0  −1 |      R · [1, 0] = [0, 1]     (right → up)
    | 1   0 |      R · [0, 1] = [−1, 0]    (up → left)
```

A neural-network layer is a transformation like this (followed by a bend, the "activation", in Level 7). Stacking layers = applying several transformations in a row. That's why deep networks can untangle very complicated data.

## 5. Building it yourself in C++

Writing a matrix class once makes everything concrete. We store the numbers **row-major**: row 0, then row 1, … in one flat `std::vector<double>`. Entry (r, c) lives at index `r * cols + c`.

```cpp
#include <cassert>
#include <iostream>
#include <stdexcept>
#include <vector>

// A minimal dense matrix, stored row by row in one flat vector.
struct Matrix {
    size_t rows = 0;
    size_t cols = 0;
    std::vector<double> data;            // size rows * cols

    Matrix(size_t r, size_t c, double fill = 0.0) : rows(r), cols(c), data(r * c, fill) {}

    // Element access: m(r, c)
    double& operator()(size_t r, size_t c) {
        return data[r * cols + c];
    }
    double operator()(size_t r, size_t c) const {
        return data[r * cols + c];
    }
};

// C = A · B   (shapes: (m, n) · (n, p) -> (m, p))
Matrix matmul(const Matrix& A, const Matrix& B) {
    if (A.cols != B.rows) {
        throw std::invalid_argument("shape mismatch in matmul");
    }
    Matrix C(A.rows, B.cols, 0.0);
    for (size_t i = 0; i < A.rows; i++) {
        // Loop order i-k-j: the innermost loop walks memory contiguously (cache friendly).
        for (size_t k = 0; k < A.cols; k++) {
            double a = A(i, k);
            for (size_t j = 0; j < B.cols; j++) {
                C(i, j) += a * B(k, j);
            }
        }
    }
    return C;
}

Matrix transpose(const Matrix& A) {
    Matrix T(A.cols, A.rows);
    for (size_t r = 0; r < A.rows; r++) {
        for (size_t c = 0; c < A.cols; c++) {
            T(c, r) = A(r, c);
        }
    }
    return T;
}

double dot(const std::vector<double>& a, const std::vector<double>& b) {
    assert(a.size() == b.size());
    double sum = 0.0;
    for (size_t i = 0; i < a.size(); i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

void print(const Matrix& M) {
    for (size_t r = 0; r < M.rows; r++) {
        for (size_t c = 0; c < M.cols; c++) {
            std::cout << M(r, c) << (c + 1 < M.cols ? " " : "\n");
        }
    }
}

int main() {
    std::cout << "dot = " << dot({1, 2, 3}, {4, 5, 6}) << "\n";   // 32

    Matrix P(2, 2);
    P.data = {1, 2, 3, 4};
    Matrix Q(2, 2);
    Q.data = {5, 6, 7, 8};
    Matrix C = matmul(P, Q);
    print(C);                                                      // 19 22 / 43 50
    assert(C(0, 0) == 19 && C(0, 1) == 22 && C(1, 0) == 43 && C(1, 1) == 50);

    Matrix A(2, 3);
    A.data = {1, 2, 3, 4, 5, 6};
    Matrix x(3, 1);
    x.data = {1, 0, 2};                    // a column vector is a (3, 1) matrix
    Matrix y = matmul(A, x);
    std::cout << "A*x = " << y(0, 0) << " " << y(1, 0) << "\n";   // 7 16
    std::cout << "A^T is " << transpose(A).rows << "x" << transpose(A).cols << "\n";
    return 0;
}
```

> **Interview:** "Why is loop order i-k-j faster than i-j-k?" — In i-j-k, the inner loop reads `B(k, j)` going *down a column*, jumping `cols` doubles in memory each time (cache misses). In i-k-j the inner loop reads `B(k, j)` and writes `C(i, j)` along a row — contiguous memory, so the CPU's cache and SIMD units are used well. Real libraries (BLAS) go further with tiling and vector instructions.

## 6. Broadcasting: NumPy's shortcut

NumPy lets you combine arrays of different shapes by "stretching" the smaller one:

```python
import numpy as np

X = np.array([[1.0, 2.0, 3.0],
              [4.0, 5.0, 6.0]])     # (2, 3): 2 samples, 3 features
b = np.array([10.0, 20.0, 30.0])    # (3,): one bias per feature

print(X + b)        # b is added to EACH row -> [[11 22 33] [14 25 36]]

# Column means and "centering" the data (subtract the mean of each feature):
mean = X.mean(axis=0)               # average down the rows -> shape (3,)
centered = X - mean
print("mean:", mean)                # [2.5 3.5 4.5]
print("centered:\n", centered)      # each column now averages to 0
assert np.allclose(centered.mean(axis=0), 0.0)
```

Rule: shapes are compared from the right; dimensions match if they're equal or one of them is 1. Broadcasting is convenient but is also the source of many silent bugs — always print `.shape` when unsure.

## 7. Common shape bugs (and how to spot them)

| Symptom | Likely cause |
|---|---|
| `ValueError: matmul: Input operand 1 has a mismatch` | Inner dimensions differ: check `(m, n) @ (n, p)`. |
| Result has shape `(n, n)` instead of `(n,)` | You combined a `(n, 1)` column with a `(n,)` vector — broadcasting made a table. |
| Loss doesn't improve at all | Weights multiplied in the wrong order or a missing transpose. |

```python
import numpy as np

pred = np.zeros((5, 1))     # a column vector
y = np.ones(5)              # a flat vector
diff = pred - y
print(diff.shape)           # (5, 5)  <- surprise! broadcasting created a 5x5 table
fixed = pred.ravel() - y    # flatten first
print(fixed.shape)          # (5,)
```

## Checkpoint

- [ ] I can compute `[2, −1, 3] · [4, 0, 1]` in my head (= 11).
- [ ] Given shapes `(32, 784)` and `(784, 128)`, I know the product's shape (`(32, 128)`).
- [ ] I can explain why one matrix multiplication predicts a whole batch at once.
- [ ] I wrote (typed!) the C++ `Matrix` and `matmul` and they pass the asserts.

## Exercises

1. By hand: `A = [[2, 0], [1, 3]]`, `v = [4, −1]`. Compute `A · v`.
2. Shapes: `X` is `(100, 5)`, `W` is `(5, 3)`, `b` is `(3,)`. What is the shape of `X @ W + b`? What does each row mean if X holds 100 samples?
3. NumPy: create two random `(3, 3)` matrices and verify `(A @ B).T == B.T @ A.T`.
4. C++: add `Matrix add(const Matrix&, const Matrix&)` and a `matvec` function that multiplies a matrix by a `std::vector<double>`.
5. Speed experiment: in C++, time `matmul` of two `(512, 512)` matrices with loop orders i-j-k and i-k-j. How big is the difference?

:::details Show solution
1. `A · v = [2·4 + 0·(−1), 1·4 + 3·(−1)] = [8, 1]`.
2. `(100, 5) @ (5, 3) → (100, 3)`, and adding `b` (3,) broadcasts to every row → `(100, 3)`. Row i holds the 3 outputs (e.g. 3 neuron activations or 3 class scores) for sample i.
3.
```python
import numpy as np
rng = np.random.default_rng(0)
A = rng.normal(size=(3, 3))
B = rng.normal(size=(3, 3))
print(np.allclose((A @ B).T, B.T @ A.T))   # True
```
4.
```cpp
#include <cassert>
#include <vector>
struct Matrix {
    size_t rows, cols;
    std::vector<double> data;
    Matrix(size_t r, size_t c, double f = 0) : rows(r), cols(c), data(r * c, f) {}
    double& operator()(size_t r, size_t c) { return data[r * cols + c]; }
    double operator()(size_t r, size_t c) const { return data[r * cols + c]; }
};
Matrix add(const Matrix& A, const Matrix& B) {
    assert(A.rows == B.rows && A.cols == B.cols);
    Matrix C(A.rows, A.cols);
    for (size_t i = 0; i < A.data.size(); i++) {
        C.data[i] = A.data[i] + B.data[i];
    }
    return C;
}
std::vector<double> matvec(const Matrix& A, const std::vector<double>& x) {
    assert(A.cols == x.size());
    std::vector<double> y(A.rows, 0.0);
    for (size_t r = 0; r < A.rows; r++) {
        for (size_t c = 0; c < A.cols; c++) {
            y[r] += A(r, c) * x[c];
        }
    }
    return y;
}
int main() {
    Matrix A(2, 3);
    A.data = {1, 2, 3, 4, 5, 6};
    std::vector<double> y = matvec(A, {1, 0, 2});
    assert(y[0] == 7 && y[1] == 16);
    Matrix S = add(A, A);
    assert(S(1, 2) == 12);
    return 0;
}
```
5. On a typical laptop i-k-j is 3–10× faster for 512×512 because of cache behaviour; with `-O3 -march=native` the compiler can also vectorise it.
:::

## External resources

- **3Blue1Brown — "Essence of Linear Algebra"** (YouTube, 16 short videos): the best visual explanation of vectors, matrices and transformations. Watch episodes 1–4 and 9 now.
- **Mathematics for Machine Learning** (Deisenroth, Faisal, Ong — free PDF at mml-book.github.io), Chapter 2.
- **Gilbert Strang — MIT 18.06 Linear Algebra** (MIT OpenCourseWare): the classic university course.
- **NumPy broadcasting rules**: numpy.org/doc/stable/user/basics.broadcasting.html
- **"What every programmer should know about memory"** (Ulrich Drepper) — why loop order changes speed.
