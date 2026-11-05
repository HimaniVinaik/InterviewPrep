# Linear Algebra

Linear algebra is the language of graphics, robotics, signal processing, computer vision, and machine learning. You need intuition plus a few formulas you can code from memory.

## 1. Vectors

A vector is an ordered list of numbers — a point, direction, velocity, or feature vector.

```cpp
struct Vec3 {
    double x, y, z;
    Vec3 operator+(const Vec3& o) const { return {x + o.x, y + o.y, z + o.z}; }
    Vec3 operator-(const Vec3& o) const { return {x - o.x, y - o.y, z - o.z}; }
    Vec3 operator*(double s) const { return {x * s, y * s, z * s}; }
};
double dot(const Vec3& a, const Vec3& b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
Vec3 cross(const Vec3& a, const Vec3& b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}
double norm(const Vec3& a) { return std::sqrt(dot(a, a)); }
Vec3 normalize(const Vec3& a) { double n = norm(a); return a * (1.0 / n); }
```

### Dot product

a · b = Σ aᵢbᵢ = |a||b| cos θ

- = 0 → perpendicular; > 0 → same general direction; < 0 → opposite.
- Projection of a onto unit vector û: (a · û) û.
- Cosine similarity (ML embeddings, search): (a · b) / (|a||b|).
- Lighting: diffuse intensity = max(0, n̂ · l̂).

### Cross product (3D)

a × b is perpendicular to both, with magnitude |a||b| sin θ = area of the parallelogram. Direction by the right-hand rule. Used for surface normals, torque (τ = r × F), and orientation tests (2D cross = z-component, see *Computational Geometry*).

### Norms

- L2 (Euclidean): √Σxᵢ². L1 (Manhattan): Σ|xᵢ|. L∞: max|xᵢ|.
- Compare squared distances to avoid `sqrt` when you only need ordering.

## 2. Matrices

An m×n matrix is a linear map from ℝⁿ to ℝᵐ. Matrix–vector product: (Ax)ᵢ = Σⱼ Aᵢⱼxⱼ.

**Matrix multiplication** C = AB: Cᵢⱼ = Σₖ AᵢₖBₖⱼ. Requires A: m×k, B: k×n → C: m×n. **Not commutative** (AB ≠ BA), but associative.

```cpp
// Cache-friendly loop order: i-k-j streams through B and C rows contiguously
void matmul(const std::vector<double>& A, const std::vector<double>& B, std::vector<double>& C,
            int m, int k, int n) {                 // row-major storage
    std::fill(C.begin(), C.end(), 0.0);
    for (int i = 0; i < m; ++i)
        for (int p = 0; p < k; ++p) {
            double a = A[i * k + p];
            for (int j = 0; j < n; ++j) C[i * n + j] += a * B[p * n + j];
        }
}
```

The naive i-j-k order strides down B's columns (cache misses). Real libraries (BLAS, cuBLAS) use blocking/tiling and SIMD — see *CUDA* for a tiled GPU version. Complexity: O(n³) naive; Strassen O(n^2.81).

### Special matrices

| Matrix | Property |
|---|---|
| Identity I | AI = IA = A |
| Diagonal | scales each axis |
| Symmetric | A = Aᵀ (covariance matrices) |
| Orthogonal | QᵀQ = I: rotations/reflections — preserve lengths; Q⁻¹ = Qᵀ |
| Triangular | easy to solve by substitution |
| Sparse | mostly zeros — store in CSR/COO format |

**Transpose:** (Aᵀ)ᵢⱼ = Aⱼᵢ, (AB)ᵀ = BᵀAᵀ.

## 3. Determinant & inverse

- det(A) = signed volume scaling factor of the transformation. det = 0 ⇔ singular (not invertible, columns linearly dependent).
- 2×2: det [[a, b], [c, d]] = ad − bc; inverse = (1/det) [[d, −b], [−c, a]].
- In code, **don't invert matrices to solve Ax = b** — use LU/QR/Cholesky decomposition (faster, numerically stable).

## 4. Solving linear systems

Gaussian elimination with partial pivoting, O(n³):

```cpp
// Solves A x = b in place (A is n×n, row-major). Returns false if singular.
bool solve(std::vector<std::vector<double>>& A, std::vector<double>& b) {
    int n = A.size();
    for (int col = 0; col < n; ++col) {
        int piv = col;
        for (int r = col + 1; r < n; ++r) if (std::fabs(A[r][col]) > std::fabs(A[piv][col])) piv = r;
        if (std::fabs(A[piv][col]) < 1e-12) return false;
        std::swap(A[piv], A[col]); std::swap(b[piv], b[col]);
        for (int r = col + 1; r < n; ++r) {
            double f = A[r][col] / A[col][col];
            for (int c = col; c < n; ++c) A[r][c] -= f * A[col][c];
            b[r] -= f * b[col];
        }
    }
    for (int r = n - 1; r >= 0; --r) {                 // back substitution
        for (int c = r + 1; c < n; ++c) b[r] -= A[r][c] * b[c];
        b[r] /= A[r][r];
    }
    return true;
}
```

**Least squares** (more equations than unknowns — sensor calibration, line fitting): minimise |Ax − b|² → normal equations AᵀAx = Aᵀb (or QR for stability).

## 5. Transformations (graphics & robotics)

2D rotation by θ:

```text
 R(θ) = [ cos θ  −sin θ ]
        [ sin θ   cos θ ]
```

**Homogeneous coordinates** make translation a matrix multiply: represent (x, y) as (x, y, 1) and use 3×3 matrices (4×4 in 3D). Compose transforms by multiplying: M = T · R · S applies scale, then rotate, then translate (right-to-left).

```text
 [x']   [ cos θ  −sin θ  tx ] [x]
 [y'] = [ sin θ   cos θ  ty ] [y]
 [1 ]   [   0       0     1 ] [1]
```

3D rotations: rotation matrices, Euler angles (gimbal lock!), **quaternions** (compact, smooth interpolation via slerp, no gimbal lock — used in IMU sensor fusion and game engines).

## 6. Eigenvalues & eigenvectors

Av = λv: v is a direction the transformation only scales (by λ).

- PCA (dimensionality reduction): eigenvectors of the covariance matrix = directions of maximum variance.
- Stability of dynamic systems/control: eigenvalues of the system matrix (|λ| < 1 for discrete-time stability).
- PageRank: dominant eigenvector of the link matrix (power iteration: repeatedly multiply and normalise).
- Vibration modes, Markov chains' steady states.

**SVD:** A = UΣVᵀ — every matrix is rotate → scale → rotate. Used for low-rank approximation, pseudo-inverse, recommendation systems, image compression.

## 7. Linear algebra in ML

- A dense neural network layer is y = σ(Wx + b): a matrix multiply plus a non-linearity.
- Batches stack inputs as matrix rows → matrix–matrix multiplies (GEMM) dominate training/inference time — hence GPUs/TPUs.
- Embeddings are vectors; similarity is a dot product; attention is softmax(QKᵀ/√d)V.

## 8. Libraries

C++: **Eigen** (header-only, expression templates), Armadillo, BLAS/LAPACK, cuBLAS (GPU), `std::mdspan` (C++23) for multi-dimensional views; C++26 adds `<linalg>`. Embedded: CMSIS-DSP `arm_mat_mult_f32`. Python: NumPy.

## Practice

1. Angle between (1, 0) and (1, 1)? cos θ = 1/√2 → **45°**.
2. Rotate (1, 0) by 90°? → **(0, 1)**.
3. det [[2, 1], [4, 2]]? **0** — singular (rows are multiples).
4. Are rotation matrices commutative in 3D? **No** (they are in 2D).
