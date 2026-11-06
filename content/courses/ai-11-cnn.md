# Level 11 · Convolutional Neural Networks (CNNs)

> **Key idea:** an MLP treats an image as a flat list of 784 unrelated numbers — it has no idea that neighbouring pixels belong together. A **convolution** slides a small learnable filter (e.g. 3×3) over the image, detecting the same pattern (an edge, a curve) **anywhere** it appears. Stacking convolutions builds edges → shapes → objects. That idea powers image recognition, medical imaging, self-driving perception and more.

**Goals of this level**
- Understand convolution, filters, padding, stride, channels and output-shape arithmetic.
- Implement **conv2d** and **max-pooling** forward *and backward* in NumPy (loops, then the fast im2col trick).
- Train a small CNN **from scratch in NumPy** on MNIST.
- Write a **convolution in C++**, then build and train a CNN in **PyTorch** (~99% on MNIST).

## 1. Why not just use an MLP?

| Problem with MLPs on images | How convolution fixes it |
|---|---|
| A 224×224×3 image → 150,528 inputs; one hidden layer of 1,000 units = 150 million weights. | A 3×3 filter on 3 channels has 27 weights, **shared** across all positions. |
| A cat in the top-left and a cat in the bottom-right need different weights. | The same filter slides everywhere: **translation equivariance**. |
| Nearby pixels are related, far ones less so — the MLP ignores this. | Each output only looks at a small **local** patch. |

## 2. The convolution operation

Slide a K×K filter over the image. At each position, multiply the overlapping numbers and add them up (a dot product!) to get one output pixel.

```text
input (5×5)              filter (3×3)       output (3×3)
1 1 1 0 0                1 0 1              4 3 4
0 1 1 1 0                0 1 0              2 4 3
0 0 1 1 1        ⊛       1 0 1       =      2 3 4
0 0 1 1 0
0 1 1 0 0

top-left output = 1·1 + 1·0 + 1·1 + 0·0 + 1·1 + 1·0 + 0·1 + 0·0 + 1·1 = 4
```

(Strictly this is **cross-correlation** — true convolution flips the filter — but every deep-learning library calls it convolution and the network learns the flip anyway.)

### What filters detect

Hand-made filters show the idea; in a CNN the filter values are **learned**:

```text
vertical edge      horizontal edge     blur (average)
-1  0  1           -1 -1 -1            1/9 1/9 1/9
-1  0  1            0  0  0            1/9 1/9 1/9
-1  0  1            1  1  1            1/9 1/9 1/9
```

### Padding, stride and the output size

- **Padding P**: add P rows/columns of zeros around the input so edge pixels get processed and the size can be preserved.
- **Stride S**: move the filter S pixels at a time (S = 2 halves the output size).

```text
output size = floor( (N + 2P − K) / S ) + 1

28×28 input, 3×3 filter, P = 1, S = 1  →  (28 + 2 − 3)/1 + 1 = 28   ("same" padding)
28×28 input, 3×3 filter, P = 0, S = 1  →  26
28×28 input, 2×2 window,  P = 0, S = 2  →  14
```

### Channels

A colour image has 3 **channels** (R, G, B). A filter covers **all** input channels: shape (C_in, K, K). Using C_out different filters gives C_out output channels ("feature maps").

```text
input  (C_in,  H, W)
weight (C_out, C_in, K, K)
bias   (C_out,)
output (C_out, H', W')

parameters = C_out · C_in · K · K + C_out
```

## 3. Pooling

**Max-pooling** takes the maximum over each small window (usually 2×2, stride 2), halving height and width. It shrinks the data, adds a bit of position tolerance, and has no parameters. (Modern designs sometimes use stride-2 convolutions instead.)

```text
1 3 | 2 1
4 6 | 5 0          max-pool 2×2        6 5
----+----         ─────────────►       8 9
7 8 | 9 3
2 1 | 4 4
```

## 4. Convolution and pooling from scratch (NumPy, loops)

Clear but slow — this is for understanding.

```python
import numpy as np

def conv2d_naive(x, w, b, stride=1, pad=0):
    """x: (C_in, H, W)   w: (C_out, C_in, K, K)   b: (C_out,)   ->  (C_out, H', W')"""
    C_in, H, W = x.shape
    C_out, _, K, _ = w.shape
    x = np.pad(x, ((0, 0), (pad, pad), (pad, pad)))
    H_out = (H + 2 * pad - K) // stride + 1
    W_out = (W + 2 * pad - K) // stride + 1
    out = np.zeros((C_out, H_out, W_out))
    for o in range(C_out):                       # each filter
        for i in range(H_out):                   # each output row
            for j in range(W_out):               # each output column
                patch = x[:, i * stride:i * stride + K, j * stride:j * stride + K]
                out[o, i, j] = np.sum(patch * w[o]) + b[o]   # dot product of patch and filter
    return out

def maxpool_naive(x, size=2):
    C, H, W = x.shape
    out = np.zeros((C, H // size, W // size))
    for c in range(C):
        for i in range(H // size):
            for j in range(W // size):
                out[c, i, j] = x[c, i * size:(i + 1) * size, j * size:(j + 1) * size].max()
    return out

image = np.array([[1, 1, 1, 0, 0],
                  [0, 1, 1, 1, 0],
                  [0, 0, 1, 1, 1],
                  [0, 0, 1, 1, 0],
                  [0, 1, 1, 0, 0]], dtype=float)[None]          # add a channel axis -> (1, 5, 5)
kernel = np.array([[1, 0, 1], [0, 1, 0], [1, 0, 1]], dtype=float)[None, None]   # (1, 1, 3, 3)
out = conv2d_naive(image, kernel, np.zeros(1))
print(out[0])
assert (out[0] == [[4, 3, 4], [2, 4, 3], [2, 3, 4]]).all()

# An edge detector finds the boundary between a dark and a bright region.
img = np.zeros((1, 6, 6))
img[0, :, 3:] = 1.0                                              # right half bright
vertical_edge = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], dtype=float)[None, None]
print(conv2d_naive(img, vertical_edge, np.zeros(1))[0])          # big values at the edge only

pooled = maxpool_naive(np.array([[1, 3, 2, 1], [4, 6, 5, 0], [7, 8, 9, 3], [2, 1, 4, 4]], dtype=float)[None])
print(pooled[0])
assert (pooled[0] == [[6, 5], [8, 9]]).all()
```

## 5. Fast convolution: im2col

Loops in Python are far too slow. **im2col** ("image to columns") copies every K×K×C_in patch into a column of a big matrix. Then the whole convolution is **one matrix multiplication** — which BLAS and GPUs do extremely fast.

```text
patches matrix:  (C_in·K·K, number of output positions)
filters matrix:  (C_out, C_in·K·K)
output = filters @ patches  →  (C_out, H'·W')  → reshape to (C_out, H', W')
```

The **backward pass** then reuses Level 8's linear-layer rules:

```text
dW = dOut_matrix @ patchesᵀ
dPatches = W_matrixᵀ @ dOut_matrix  → "col2im": add each column back to where its patch came from
```

Max-pool backward: the gradient goes only to the position that was the maximum in each window (the others didn't affect the output).

```python
import numpy as np

def im2col(x, K, stride=1, pad=0):
    """x: (B, C, H, W) -> cols: (B, C*K*K, H_out*W_out)"""
    B, C, H, W = x.shape
    x = np.pad(x, ((0, 0), (0, 0), (pad, pad), (pad, pad)))
    H_out = (H + 2 * pad - K) // stride + 1
    W_out = (W + 2 * pad - K) // stride + 1
    cols = np.empty((B, C, K, K, H_out, W_out), dtype=x.dtype)
    for ki in range(K):                    # loop only over the K*K filter offsets
        for kj in range(K):
            cols[:, :, ki, kj] = x[:, :, ki:ki + stride * H_out:stride, kj:kj + stride * W_out:stride]
    return cols.reshape(B, C * K * K, H_out * W_out), H_out, W_out

def col2im(cols, x_shape, K, H_out, W_out, stride=1, pad=0):
    """The adjoint of im2col: scatter-add columns back into an image-shaped gradient."""
    B, C, H, W = x_shape
    cols = cols.reshape(B, C, K, K, H_out, W_out)
    dx = np.zeros((B, C, H + 2 * pad, W + 2 * pad), dtype=cols.dtype)
    for ki in range(K):
        for kj in range(K):
            dx[:, :, ki:ki + stride * H_out:stride, kj:kj + stride * W_out:stride] += cols[:, :, ki, kj]
    return dx[:, :, pad:pad + H, pad:pad + W]

class Conv2d:
    def __init__(self, c_in, c_out, k, pad=0, seed=0):
        rng = np.random.default_rng(seed)
        self.W = rng.normal(0, np.sqrt(2.0 / (c_in * k * k)), (c_out, c_in, k, k))   # He init
        self.b = np.zeros(c_out)
        self.k, self.pad = k, pad

    def forward(self, x):
        self.x_shape = x.shape
        self.cols, self.H_out, self.W_out = im2col(x, self.k, pad=self.pad)
        Wm = self.W.reshape(self.W.shape[0], -1)                       # (C_out, C_in*K*K)
        out = np.einsum("of,bfp->bop", Wm, self.cols) + self.b[None, :, None]
        return out.reshape(x.shape[0], -1, self.H_out, self.W_out)

    def backward(self, dout):
        B, C_out = dout.shape[:2]
        d = dout.reshape(B, C_out, -1)                                 # (B, C_out, P)
        Wm = self.W.reshape(C_out, -1)
        self.dW = np.einsum("bop,bfp->of", d, self.cols).reshape(self.W.shape)
        self.db = d.sum(axis=(0, 2))
        dcols = np.einsum("of,bop->bfp", Wm, d)
        return col2im(dcols, self.x_shape, self.k, self.H_out, self.W_out, pad=self.pad)

class MaxPool2:
    def forward(self, x):
        B, C, H, W = x.shape
        xr = x.reshape(B, C, H // 2, 2, W // 2, 2)
        out = xr.max(axis=(3, 5))
        self.mask = xr == out[:, :, :, None, :, None]                # where the max came from
        return out

    def backward(self, dout):
        d = self.mask * dout[:, :, :, None, :, None]                   # route gradient to the max
        B, C, H2, _, W2, _ = d.shape
        return d.reshape(B, C, H2 * 2, W2 * 2)

# 1. im2col convolution must equal the naive loops.
rng = np.random.default_rng(1)
x = rng.normal(size=(2, 3, 7, 7))
conv = Conv2d(3, 4, 3, pad=1)
fast = conv.forward(x)
for b in range(2):
    slow = np.zeros((4, 7, 7))
    xp = np.pad(x[b], ((0, 0), (1, 1), (1, 1)))
    for o in range(4):
        for i in range(7):
            for j in range(7):
                slow[o, i, j] = np.sum(xp[:, i:i + 3, j:j + 3] * conv.W[o]) + conv.b[o]
    assert np.allclose(fast[b], slow)

# 2. Gradient check the conv layer (loss = sum(c * conv(x))).
c = rng.normal(size=fast.shape)
conv.forward(x)
dx = conv.backward(c)
h = 1e-6
for (idx, analytic) in [((0, 1, 2, 3), dx[0, 1, 2, 3]), ((1, 2, 6, 0), dx[1, 2, 6, 0])]:
    xp, xm = x.copy(), x.copy()
    xp[idx] += h
    xm[idx] -= h
    numeric = (np.sum(c * conv.forward(xp)) - np.sum(c * conv.forward(xm))) / (2 * h)
    assert abs(numeric - analytic) < 1e-6
conv.forward(x)
conv.backward(c)
Wp, Wm_ = conv.W.copy(), conv.W.copy()
Wp[2, 1, 0, 2] += h
Wm_[2, 1, 0, 2] -= h
analytic_w = conv.dW[2, 1, 0, 2]
conv.W = Wp
fp = np.sum(c * conv.forward(x))
conv.W = Wm_
fm = np.sum(c * conv.forward(x))
assert abs((fp - fm) / (2 * h) - analytic_w) < 1e-5
print("im2col conv matches the loops, and its gradients pass the check")
```

## 6. A CNN from scratch, trained on MNIST (NumPy)

Architecture (small enough for NumPy on a laptop):

```text
input (1, 28, 28)
→ Conv 1→8, 3×3, pad 1 → ReLU → MaxPool 2     (8, 14, 14)
→ Conv 8→16, 3×3, pad 1 → ReLU → MaxPool 2    (16, 7, 7)
→ flatten (784) → Linear 784→10 → softmax
```

```python
import gzip, os, struct, urllib.request
import numpy as np

# ---- data (same loader as Level 8) ----
URL = "https://storage.googleapis.com/cvdf-datasets/mnist/"
def get(name):
    os.makedirs("mnist", exist_ok=True)
    path = os.path.join("mnist", name)
    if not os.path.exists(path):
        urllib.request.urlretrieve(URL + name, path)
    return path
def images(name):
    with gzip.open(get(name)) as f:
        _, n, r, c = struct.unpack(">IIII", f.read(16))
        return np.frombuffer(f.read(), np.uint8).reshape(n, 1, r, c).astype(np.float32) / 255.0
def labels(name):
    with gzip.open(get(name)) as f:
        f.read(8)
        return np.frombuffer(f.read(), np.uint8).astype(np.int64)

Xtr, ytr = images("train-images-idx3-ubyte.gz"), labels("train-labels-idx1-ubyte.gz")
Xte, yte = images("t10k-images-idx3-ubyte.gz"), labels("t10k-labels-idx1-ubyte.gz")
mean, std = Xtr.mean(), Xtr.std()
Xtr, Xte = (Xtr - mean) / std, (Xte - mean) / std

# ---- layers (compact versions of section 5) ----
def im2col(x, K, pad):
    B, C, H, W = x.shape
    x = np.pad(x, ((0, 0), (0, 0), (pad, pad), (pad, pad)))
    Ho, Wo = H + 2 * pad - K + 1, W + 2 * pad - K + 1
    cols = np.empty((B, C, K, K, Ho, Wo), x.dtype)
    for i in range(K):
        for j in range(K):
            cols[:, :, i, j] = x[:, :, i:i + Ho, j:j + Wo]
    return cols.reshape(B, C * K * K, Ho * Wo), Ho, Wo
def col2im(cols, shape, K, pad, Ho, Wo):
    B, C, H, W = shape
    cols = cols.reshape(B, C, K, K, Ho, Wo)
    dx = np.zeros((B, C, H + 2 * pad, W + 2 * pad), cols.dtype)
    for i in range(K):
        for j in range(K):
            dx[:, :, i:i + Ho, j:j + Wo] += cols[:, :, i, j]
    return dx[:, :, pad:pad + H, pad:pad + W]

class Conv:
    def __init__(s, ci, co, rng):
        s.W = (rng.normal(0, np.sqrt(2 / (ci * 9)), (co, ci * 9))).astype(np.float32)
        s.b = np.zeros(co, np.float32)
    def forward(s, x):
        s.shape = x.shape
        s.cols, s.Ho, s.Wo = im2col(x, 3, 1)
        return (np.einsum("of,bfp->bop", s.W, s.cols, optimize=True) + s.b[:, None]).reshape(x.shape[0], -1, s.Ho, s.Wo)
    def backward(s, d):
        d = d.reshape(d.shape[0], d.shape[1], -1)
        s.dW = np.einsum("bop,bfp->of", d, s.cols, optimize=True)
        s.db = d.sum(axis=(0, 2))
        return col2im(np.einsum("of,bop->bfp", s.W, d, optimize=True), s.shape, 3, 1, s.Ho, s.Wo)
    def params(s):
        return [(s.W, s.dW), (s.b, s.db)]
class ReLU:
    def forward(s, x):
        s.m = x > 0
        return x * s.m
    def backward(s, d):
        return d * s.m
    def params(s):
        return []
class Pool:
    def forward(s, x):
        B, C, H, W = x.shape
        xr = x.reshape(B, C, H // 2, 2, W // 2, 2)
        out = xr.max(axis=(3, 5))
        s.mask = xr == out[:, :, :, None, :, None]
        return out
    def backward(s, d):
        g = s.mask * d[:, :, :, None, :, None]
        return g.reshape(g.shape[0], g.shape[1], g.shape[2] * 2, g.shape[4] * 2)
    def params(s):
        return []
class Flatten:
    def forward(s, x):
        s.shape = x.shape
        return x.reshape(x.shape[0], -1)
    def backward(s, d):
        return d.reshape(s.shape)
    def params(s):
        return []
class Linear:
    def __init__(s, i, o, rng):
        s.W = rng.normal(0, np.sqrt(2 / i), (o, i)).astype(np.float32)
        s.b = np.zeros(o, np.float32)
    def forward(s, x):
        s.x = x
        return x @ s.W.T + s.b
    def backward(s, d):
        s.dW, s.db = d.T @ s.x, d.sum(0)
        return d @ s.W
    def params(s):
        return [(s.W, s.dW), (s.b, s.db)]

rng = np.random.default_rng(0)
net = [Conv(1, 8, rng), ReLU(), Pool(), Conv(8, 16, rng), ReLU(), Pool(), Flatten(), Linear(16 * 7 * 7, 10, rng)]

def forward(x):
    for layer in net:
        x = layer.forward(x)
    return x

lr, B = 0.05, 32
for epoch in range(2):
    order = rng.permutation(len(Xtr))
    for s in range(0, len(order), B):
        idx = order[s:s + B]
        logits = forward(Xtr[idx])
        z = logits - logits.max(1, keepdims=True)
        p = np.exp(z) / np.exp(z).sum(1, keepdims=True)
        p[np.arange(len(idx)), ytr[idx]] -= 1            # dLoss/dlogits = P - Y
        g = p / len(idx)
        for layer in reversed(net):
            g = layer.backward(g)
        for layer in net:
            for w, dw in layer.params():
                w -= lr * dw
    preds = np.concatenate([forward(Xte[i:i + 500]).argmax(1) for i in range(0, len(Xte), 500)])
    acc = np.mean(preds == yte)
    print(f"epoch {epoch + 1}: test accuracy {acc:.4f}")   # ≈ 0.975, then ≈ 0.979
assert acc > 0.9
```

In under a minute of NumPy training (2 epochs), this tiny CNN — about **9,100 weights** (80 + 1,168 in the convolutions, 7,850 in the final linear layer) — reaches **~97.9%**, beating the 100,000-weight MLP from Level 8 (97.6%). Weight sharing is very efficient.

## 7. Convolution in C++

The forward and backward passes of a single-image conv layer, with an explicit gradient check. (A full C++ CNN is just this plus the ReLU/pool/linear layers you already have — see the exercises.)

```cpp
#include <cassert>
#include <cmath>
#include <cstdio>
#include <random>
#include <vector>

// A 3-D tensor stored flat: (C, H, W), index (c * H + h) * W + w
struct Tensor3 {
    int C, H, W;
    std::vector<double> v;
    Tensor3(int c, int h, int w) : C(c), H(h), W(w), v(size_t(c) * h * w, 0.0) {}
    double& at(int c, int h, int w) {
        return v[(size_t(c) * H + h) * W + w];
    }
    double at(int c, int h, int w) const {
        return v[(size_t(c) * H + h) * W + w];
    }
};

struct Conv2d {
    int cin, cout, k, pad;
    std::vector<double> w;    // (cout, cin, k, k)
    std::vector<double> b;    // (cout)
    std::vector<double> dw, db;

    Conv2d(int ci, int co, int kk, int p, std::mt19937& rng)
        : cin(ci), cout(co), k(kk), pad(p), w(size_t(co) * ci * kk * kk), b(co, 0.0),
          dw(w.size(), 0.0), db(co, 0.0) {
        std::normal_distribution<double> n(0.0, std::sqrt(2.0 / (ci * kk * kk)));
        for (double& x : w) {
            x = n(rng);
        }
    }

    double& W(int o, int c, int i, int j) {
        return w[((size_t(o) * cin + c) * k + i) * k + j];
    }

    Tensor3 forward(const Tensor3& x) {
        int Ho = x.H + 2 * pad - k + 1;
        int Wo = x.W + 2 * pad - k + 1;
        Tensor3 y(cout, Ho, Wo);
        for (int o = 0; o < cout; o++) {
            for (int i = 0; i < Ho; i++) {
                for (int j = 0; j < Wo; j++) {
                    double s = b[o];
                    for (int c = 0; c < cin; c++) {
                        for (int di = 0; di < k; di++) {
                            for (int dj = 0; dj < k; dj++) {
                                int r = i + di - pad;
                                int q = j + dj - pad;
                                if (r >= 0 && r < x.H && q >= 0 && q < x.W) {   // zero padding
                                    s += W(o, c, di, dj) * x.at(c, r, q);
                                }
                            }
                        }
                    }
                    y.at(o, i, j) = s;
                }
            }
        }
        return y;
    }

    // Given dL/dy, accumulate dL/dw, dL/db and return dL/dx.
    Tensor3 backward(const Tensor3& x, const Tensor3& dy) {
        Tensor3 dx(x.C, x.H, x.W);
        for (int o = 0; o < cout; o++) {
            for (int i = 0; i < dy.H; i++) {
                for (int j = 0; j < dy.W; j++) {
                    double g = dy.at(o, i, j);
                    db[o] += g;
                    for (int c = 0; c < cin; c++) {
                        for (int di = 0; di < k; di++) {
                            for (int dj = 0; dj < k; dj++) {
                                int r = i + di - pad;
                                int q = j + dj - pad;
                                if (r >= 0 && r < x.H && q >= 0 && q < x.W) {
                                    dw[((size_t(o) * cin + c) * k + di) * k + dj] += g * x.at(c, r, q);
                                    dx.at(c, r, q) += g * W(o, c, di, dj);   // same weight, reversed role
                                }
                            }
                        }
                    }
                }
            }
        }
        return dx;
    }
};

int main() {
    std::mt19937 rng(0);
    std::normal_distribution<double> n01(0.0, 1.0);
    Conv2d conv(2, 3, 3, 1, rng);
    Tensor3 x(2, 5, 5);
    for (double& v : x.v) {
        v = n01(rng);
    }
    Tensor3 y = conv.forward(x);
    std::printf("output shape: (%d, %d, %d)\n", y.C, y.H, y.W);   // (3, 5, 5) with "same" padding

    // Loss = sum(c * y). Then dL/dy = c.
    Tensor3 c(y.C, y.H, y.W);
    for (double& v : c.v) {
        v = n01(rng);
    }
    Tensor3 dx = conv.backward(x, c);
    auto loss = [&](const Tensor3& in) {
        Tensor3 out = conv.forward(in);
        double s = 0.0;
        for (size_t i = 0; i < out.v.size(); i++) {
            s += out.v[i] * c.v[i];
        }
        return s;
    };
    const double h = 1e-6;
    double worst = 0.0;
    for (size_t i = 0; i < x.v.size(); i++) {
        Tensor3 xp = x, xm = x;
        xp.v[i] += h;
        xm.v[i] -= h;
        double numeric = (loss(xp) - loss(xm)) / (2 * h);
        worst = std::max(worst, std::fabs(numeric - dx.v[i]));
    }
    std::printf("max |numeric - analytic| for dL/dx: %.2e\n", worst);
    assert(worst < 1e-6);
    return 0;
}
```

> **Interview:** "How do real libraries make convolution fast?" — im2col + a highly tuned matrix multiply (GEMM), **Winograd** transforms for 3×3 filters (fewer multiplications), **FFT** for large filters, cache tiling, SIMD, and on GPUs specialised kernels in cuDNN.

## 8. The professional way: a CNN in PyTorch

```python
import gzip, os, struct, urllib.request
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

URL = "https://storage.googleapis.com/cvdf-datasets/mnist/"
def load(name, is_images):
    os.makedirs("mnist", exist_ok=True)
    path = os.path.join("mnist", name)
    if not os.path.exists(path):
        urllib.request.urlretrieve(URL + name, path)
    with gzip.open(path) as f:
        if is_images:
            _, n, r, c = struct.unpack(">IIII", f.read(16))
            return torch.tensor(np.frombuffer(f.read(), np.uint8).reshape(n, 1, r, c).astype(np.float32) / 255.0)
        f.read(8)
        return torch.tensor(np.frombuffer(f.read(), np.uint8).astype(np.int64))

Xtr, ytr = load("train-images-idx3-ubyte.gz", True), load("train-labels-idx1-ubyte.gz", False)
Xte, yte = load("t10k-images-idx3-ubyte.gz", True), load("t10k-labels-idx1-ubyte.gz", False)
Xtr, Xte = (Xtr - 0.1307) / 0.3081, (Xte - 0.1307) / 0.3081       # the standard MNIST mean/std

class SmallCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 32, 3, padding=1)     # (32, 28, 28)
        self.conv2 = nn.Conv2d(32, 64, 3, padding=1)    # (64, 14, 14) after the first pool
        self.fc1 = nn.Linear(64 * 7 * 7, 128)
        self.fc2 = nn.Linear(128, 10)
        self.drop = nn.Dropout(0.25)

    def forward(self, x):
        x = F.max_pool2d(F.relu(self.conv1(x)), 2)      # -> (32, 14, 14)
        x = F.max_pool2d(F.relu(self.conv2(x)), 2)      # -> (64, 7, 7)
        x = self.drop(torch.flatten(x, 1))
        x = self.drop(F.relu(self.fc1(x)))
        return self.fc2(x)                              # raw logits; CrossEntropyLoss applies softmax

torch.manual_seed(0)
model = SmallCNN()
print("parameters:", sum(p.numel() for p in model.parameters()))      # 421,642
opt = torch.optim.Adam(model.parameters(), lr=1e-3)

for epoch in range(2):
    model.train()
    perm = torch.randperm(len(Xtr))
    for i in range(0, len(perm), 128):
        idx = perm[i:i + 128]
        loss = F.cross_entropy(model(Xtr[idx]), ytr[idx])
        opt.zero_grad()
        loss.backward()
        opt.step()
    model.eval()
    with torch.no_grad():
        acc = (model(Xte).argmax(1) == yte).float().mean().item()
    print(f"epoch {epoch + 1}: test accuracy {acc:.4f}")            # ≈ 0.99
assert acc > 0.97
```

**~99% after two epochs** — far better than the MLP, because convolutions understand images. Level 12 explains every PyTorch line in detail.

## 9. Famous architectures (what to read about next)

| Year | Network | Key idea |
|---|---|---|
| 1998 | **LeNet-5** | The original CNN for digits (conv → pool → conv → pool → FC). |
| 2012 | **AlexNet** | Deep CNN + ReLU + dropout + GPUs; won ImageNet by a huge margin. Started the deep-learning boom. |
| 2014 | **VGG** | Just stack many 3×3 convolutions. Simple and deep (16–19 layers). |
| 2014 | **GoogLeNet / Inception** | Parallel filter sizes in one block; 1×1 convolutions to cut channels. |
| 2015 | **ResNet** | **Skip connections**: y = x + F(x). Makes 100+ layer networks trainable. Still the standard backbone. |
| 2017 | **MobileNet** | Depthwise-separable convolutions: ~8× cheaper; for phones and embedded devices. |
| 2019 | **EfficientNet** | Scale depth, width and resolution together. |
| 2020 | **Vision Transformer (ViT)** | Split the image into patches and use a transformer (Level 14). |
| 2022 | **ConvNeXt** | A CNN modernised with transformer-era tricks; competitive with ViTs. |

**Residual connections** are worth understanding now: instead of learning y = F(x), a block learns y = x + F(x). If the best thing to do is "nothing", F can simply output 0. Gradients also flow straight through the "+ x" path, so very deep networks train well.

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class ResidualBlock(nn.Module):
    def __init__(self, channels):
        super().__init__()
        self.conv1 = nn.Conv2d(channels, channels, 3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(channels)
        self.conv2 = nn.Conv2d(channels, channels, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(channels)

    def forward(self, x):
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        return F.relu(out + x)              # the skip connection

block = ResidualBlock(16)
x = torch.randn(4, 16, 32, 32)
print(block(x).shape)                       # torch.Size([4, 16, 32, 32]) — shape preserved
```

## Checkpoint

- [ ] I can compute a convolution output by hand and use the output-size formula.
- [ ] I can count the parameters of a conv layer from (C_in, C_out, K).
- [ ] My NumPy im2col conv matches the naive loops and passes a gradient check.
- [ ] I trained a CNN from scratch in NumPy, and a PyTorch CNN to ~99% on MNIST.
- [ ] I can explain why residual connections help very deep networks.

## Exercises

1. Output shape and parameter count: input (3, 64, 64), Conv(3→16, K=5, P=2, S=2). Then MaxPool 2×2.
2. Apply the vertical and horizontal edge filters (section 2) to an MNIST digit with `conv2d_naive` and print the results. Which strokes light up?
3. Add **stride** support to the im2col `Conv2d` class and gradient-check it with stride 2.
4. Build the full C++ CNN: Conv(1→8) → ReLU → MaxPool → Linear(8·14·14 → 10), using the Level 8 C++ code for the last layer, and train it on 10,000 MNIST images.
5. Visualise what the first PyTorch conv layer learned: print `model.conv1.weight[0, 0]` for a few filters after training. Do some look like edge detectors?
6. **Data augmentation:** randomly shift training images by up to 2 pixels (`torch.roll`) during training. Does test accuracy improve after 5 epochs?

:::details Show solution
1. Output = floor((64 + 4 − 5)/2) + 1 = 32 → (16, 32, 32); parameters = 16·3·5·5 + 16 = **1,216**. After max-pool: **(16, 16, 16)**.
2. The vertical filter responds strongly at the left/right edges of vertical strokes (e.g. both sides of a "1"); the horizontal filter at the top/bottom of horizontal strokes (the bar of a "7"). Positive and negative values mark dark→bright vs bright→dark transitions.
3. In `im2col` use slices `x[:, :, ki:ki + stride*H_out:stride, kj:kj + stride*W_out:stride]` (already supported in section 5's version) and pass the same stride to `col2im`; the gradient check from section 5 should still pass.
4. Forward: conv → ReLU (keep a mask) → 2×2 max-pool (remember the argmax index per window) → flatten → linear → softmax. Backward in reverse: linear backward gives d(flat) → reshape → pool backward (send gradient to the argmax) → ReLU gate → `Conv2d::backward`. Expect ~95–97% after one epoch on 10k images.
5. Many first-layer filters look like small oriented edge or blob detectors — the same thing neuroscientists found in the visual cortex (Hubel & Wiesel).
6. Usually a small gain (≈ +0.1–0.3%) and a smaller train/test gap: augmentation teaches the network that a shifted digit is still the same digit.
:::

## External resources

- **CS231n — Convolutional Neural Networks for Visual Recognition** (Stanford; lectures on YouTube, notes at cs231n.github.io). The MS course for this level — do assignment 2.
- **"A guide to convolution arithmetic for deep learning"** — Dumoulin & Visin (arXiv 1603.07285): padding, stride and transposed-conv diagrams.
- **CNN Explainer** (poloclub.github.io/cnn-explainer): interactive visualisation of every layer.
- **Papers:** LeCun et al. 1998 (LeNet), Krizhevsky et al. 2012 (AlexNet), He et al. 2016 ("Deep Residual Learning").
- **Dive into Deep Learning (d2l.ai)**, Chapters 7–8: CNNs and modern architectures, with runnable code.
