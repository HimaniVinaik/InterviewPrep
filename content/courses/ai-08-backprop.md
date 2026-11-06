# Level 8 · Backpropagation, by Hand and in Code

> **Key idea:** backpropagation is just the **chain rule** (Level 2) applied layer by layer, **from the loss backwards**. Each layer receives "how much the loss cares about my output", turns it into gradients for its own weights, and passes "how much the loss cares about my input" to the layer before it. That's the whole algorithm.

**Goals of this level**
- Derive backprop for a 2-layer network by hand — every formula, every shape.
- Implement a general MLP with forward + backward passes in NumPy, and **verify it with gradient checking**.
- Train it on a non-linear dataset, then on **MNIST handwritten digits** (~97–98% accuracy).
- Write the **same network in plain C++** and train it on MNIST.

## 1. The setup

A 2-layer classifier for a batch of B examples (rows of X):

```text
Z₁ = X W₁ᵀ + b₁            (B, H)      hidden pre-activations
A₁ = ReLU(Z₁)              (B, H)      hidden activations
Z₂ = A₁ W₂ᵀ + b₂           (B, K)      class scores (logits)
P  = softmax(Z₂)           (B, K)      probabilities
L  = −(1/B) Σᵢ log P[i, yᵢ]            mean cross-entropy
```

Shapes: X is (B, D), W₁ is (H, D), b₁ is (H,), W₂ is (K, H), b₂ is (K,).

**Goal:** ∂L/∂W₁, ∂L/∂b₁, ∂L/∂W₂, ∂L/∂b₂ — one gradient per parameter, each with the same shape as the parameter.

## 2. The backward pass, step by step

We'll write **dX** as shorthand for ∂L/∂X ("the gradient flowing into X").

**Step 1 — softmax + cross-entropy.** Exactly as in Level 5, the combined gradient is beautifully simple:

```text
dZ₂ = (P − Y) / B          (B, K)      Y = one-hot labels
```

**Step 2 — the second linear layer.** Z₂ = A₁W₂ᵀ + b₂. Each Z₂[i, k] = Σⱼ A₁[i, j]·W₂[k, j] + b₂[k]. Differentiating:

```text
dW₂ = dZ₂ᵀ A₁              (K, B)(B, H) = (K, H)    ✓ same shape as W₂
db₂ = Σ over the batch of dZ₂               (K,)
dA₁ = dZ₂ W₂               (B, K)(K, H) = (B, H)    ✓ same shape as A₁
```

**Shape trick:** you rarely need to derive these again. dW must have W's shape, and the only way to combine dZ₂ (B, K) and A₁ (B, H) into (K, H) is dZ₂ᵀA₁.

**Step 3 — ReLU.** A₁ = max(0, Z₁). Its derivative is 1 where Z₁ > 0 and 0 elsewhere, so the gradient passes through where the neuron was active and is blocked where it wasn't:

```text
dZ₁ = dA₁ ⊙ [Z₁ > 0]       (B, H)      ⊙ = element-wise multiply
```

**Step 4 — the first linear layer.** Same pattern as step 2:

```text
dW₁ = dZ₁ᵀ X               (H, B)(B, D) = (H, D)
db₁ = Σ over the batch of dZ₁               (H,)
dX  = dZ₁ W₁               (only needed if something comes before)
```

**Step 5 — update.** For every parameter θ: θ ← θ − lr · dθ.

### The pattern to remember

| Layer | Forward | Backward (given dOut) |
|---|---|---|
| Linear | out = in·Wᵀ + b | dW = dOutᵀ·in, db = Σ dOut, dIn = dOut·W |
| ReLU | out = max(0, in) | dIn = dOut ⊙ [in > 0] |
| Sigmoid | out = σ(in) | dIn = dOut ⊙ out ⊙ (1 − out) |
| Tanh | out = tanh(in) | dIn = dOut ⊙ (1 − out²) |
| Softmax + CE | P = softmax(in) | dIn = (P − Y) / B |

Every layer only needs **its own inputs/outputs from the forward pass** and **the gradient from the layer above**. That's why frameworks cache activations during the forward pass — and why training uses much more memory than inference.

## 3. A tiny example by hand

One input x = [1, 2], one hidden ReLU unit, one output, squared-error loss (to keep numbers small):

```text
w₁ = [0.5, −0.25], b₁ = 0.1        z₁ = 0.5·1 − 0.25·2 + 0.1 = 0.1      a₁ = ReLU(0.1) = 0.1
w₂ = 2.0,          b₂ = 0.3        ŷ = 2·0.1 + 0.3 = 0.5
target t = 1                        L = ½(ŷ − t)² = ½(−0.5)² = 0.125

Backward:
dŷ  = ŷ − t = −0.5
dw₂ = dŷ · a₁ = −0.05              db₂ = −0.5
da₁ = dŷ · w₂ = −1.0
dz₁ = da₁ · [z₁ > 0] = −1.0
dw₁ = dz₁ · x = [−1.0, −2.0]       db₁ = −1.0
```

```python
# Verify every hand-computed gradient numerically.
import numpy as np

def loss(params):
    w1, b1, w2, b2 = params[:2], params[2], params[3], params[4]
    x = np.array([1.0, 2.0])
    a1 = max(0.0, w1 @ x + b1)
    y_hat = w2 * a1 + b2
    return 0.5 * (y_hat - 1.0) ** 2

params = np.array([0.5, -0.25, 0.1, 2.0, 0.3])     # w1[0], w1[1], b1, w2, b2
by_hand = np.array([-1.0, -2.0, -1.0, -0.05, -0.5])

h = 1e-6
numeric = np.array([(loss(params + h * e) - loss(params - h * e)) / (2 * h) for e in np.eye(5)])
print("by hand:", by_hand)
print("numeric:", numeric.round(6))
assert np.allclose(by_hand, numeric, atol=1e-6)
```

## 4. A general MLP in NumPy

Each layer is an object with `forward` and `backward`. This is the same design PyTorch uses internally.

```python
import numpy as np

class Linear:
    def __init__(self, n_in, n_out, rng):
        self.W = rng.normal(0, np.sqrt(2.0 / n_in), (n_out, n_in))   # He init (Level 10)
        self.b = np.zeros(n_out)

    def forward(self, X):
        self.X = X                                  # cache the input for backward
        return X @ self.W.T + self.b

    def backward(self, dOut):
        self.dW = dOut.T @ self.X                   # (out, B) @ (B, in) -> (out, in)
        self.db = dOut.sum(axis=0)
        return dOut @ self.W                        # gradient for the previous layer

    def params(self):
        return [(self.W, self.dW), (self.b, self.db)]

class ReLU:
    def forward(self, X):
        self.mask = X > 0
        return X * self.mask

    def backward(self, dOut):
        return dOut * self.mask

    def params(self):
        return []

def softmax_cross_entropy(logits, y):
    """Returns (mean loss, gradient w.r.t. logits)."""
    Z = logits - logits.max(axis=1, keepdims=True)
    P = np.exp(Z)
    P /= P.sum(axis=1, keepdims=True)
    B = len(y)
    loss = -np.mean(np.log(P[np.arange(B), y] + 1e-12))
    dZ = P.copy()
    dZ[np.arange(B), y] -= 1                      # P - onehot(y)
    return loss, dZ / B

class MLP:
    def __init__(self, sizes, seed=0):
        rng = np.random.default_rng(seed)
        self.layers = []
        for i in range(len(sizes) - 1):
            self.layers.append(Linear(sizes[i], sizes[i + 1], rng))
            if i < len(sizes) - 2:
                self.layers.append(ReLU())

    def forward(self, X):
        for layer in self.layers:
            X = layer.forward(X)
        return X

    def backward(self, dOut):
        for layer in reversed(self.layers):         # backwards through the layers
            dOut = layer.backward(dOut)

    def step(self, lr):
        for layer in self.layers:
            for p, g in layer.params():
                p -= lr * g                         # in-place update of the weights

# ---------- Gradient check: compare backprop with finite differences ----------
rng = np.random.default_rng(1)
X = rng.normal(size=(5, 4))
y = rng.integers(0, 3, 5)
net = MLP([4, 6, 3], seed=2)

loss, dZ = softmax_cross_entropy(net.forward(X), y)
net.backward(dZ)
W = net.layers[0].W
analytic = net.layers[0].dW.copy()

numeric = np.zeros_like(W)
h = 1e-5
for i in range(W.shape[0]):
    for j in range(W.shape[1]):
        old = W[i, j]
        W[i, j] = old + h
        lp, _ = softmax_cross_entropy(net.forward(X), y)
        W[i, j] = old - h
        lm, _ = softmax_cross_entropy(net.forward(X), y)
        W[i, j] = old
        numeric[i, j] = (lp - lm) / (2 * h)

rel = np.abs(analytic - numeric).max() / (np.abs(analytic).max() + 1e-12)
print(f"gradient check, max relative error: {rel:.2e}")      # ~1e-10
assert rel < 1e-6

# ---------- Train on a non-linear problem: two interleaved spirals ----------
def spirals(n, rng):
    t = np.sqrt(rng.random(n)) * 3 * np.pi
    a = np.column_stack([t * np.cos(t), t * np.sin(t)]) / 10
    X = np.vstack([a, -a]) + rng.normal(0, 0.03, (2 * n, 2))
    y = np.concatenate([np.zeros(n, int), np.ones(n, int)])
    return X, y

X, y = spirals(500, rng)
net = MLP([2, 64, 64, 2], seed=0)
for epoch in range(3000):
    loss, dZ = softmax_cross_entropy(net.forward(X), y)
    net.backward(dZ)
    net.step(lr=0.5)
    if epoch % 1000 == 0:
        print(f"epoch {epoch:4d}  loss {loss:.4f}")
acc = np.mean(net.forward(X).argmax(axis=1) == y)
print(f"spiral training accuracy: {acc:.3f}")                 # ≈ 0.99+
assert acc > 0.95
```

Logistic regression gets ~50% on the spirals (no line separates them). The MLP's hidden layers bend the space until they become separable.

> **Tip:** **always** gradient-check a new layer on tiny inputs before training. A backprop bug often doesn't crash — the network just learns badly, and you'll waste days.

## 5. MNIST: reading handwritten digits

MNIST has 60,000 training and 10,000 test images of 28×28 pixels (values 0–255) with labels 0–9. The files use a tiny binary format called IDX: a big-endian header, then raw bytes.

```text
images file:  magic 2051 | count | rows (28) | cols (28) | count·28·28 bytes
labels file:  magic 2049 | count | count bytes
```

Download the four `.gz` files once (any MNIST mirror, e.g. the one in the code below) into a folder called `mnist/`.

```python
# mnist_mlp.py — a 784-128-10 network trained with mini-batch SGD, NumPy only.
import gzip
import os
import struct
import urllib.request
import numpy as np

URL = "https://storage.googleapis.com/cvdf-datasets/mnist/"
FILES = ["train-images-idx3-ubyte.gz", "train-labels-idx1-ubyte.gz",
         "t10k-images-idx3-ubyte.gz", "t10k-labels-idx1-ubyte.gz"]

def download(folder="mnist"):
    os.makedirs(folder, exist_ok=True)
    for name in FILES:
        path = os.path.join(folder, name)
        if not os.path.exists(path):
            print("downloading", name)
            urllib.request.urlretrieve(URL + name, path)

def load_images(path):
    with gzip.open(path, "rb") as f:
        magic, n, rows, cols = struct.unpack(">IIII", f.read(16))   # big-endian header
        assert magic == 2051
        data = np.frombuffer(f.read(), dtype=np.uint8)
    return data.reshape(n, rows * cols).astype(np.float32) / 255.0   # scale to [0, 1]

def load_labels(path):
    with gzip.open(path, "rb") as f:
        magic, n = struct.unpack(">II", f.read(8))
        assert magic == 2049
        return np.frombuffer(f.read(), dtype=np.uint8).astype(np.int64)

download()
X_train = load_images("mnist/train-images-idx3-ubyte.gz")
y_train = load_labels("mnist/train-labels-idx1-ubyte.gz")
X_test = load_images("mnist/t10k-images-idx3-ubyte.gz")
y_test = load_labels("mnist/t10k-labels-idx1-ubyte.gz")
print("train:", X_train.shape, "test:", X_test.shape)

# Normalise with training statistics (Level 4).
mean, std = X_train.mean(), X_train.std()
X_train = (X_train - mean) / std
X_test = (X_test - mean) / std

rng = np.random.default_rng(0)
H, K = 128, 10
W1 = rng.normal(0, np.sqrt(2 / 784), (H, 784)).astype(np.float32)
b1 = np.zeros(H, np.float32)
W2 = rng.normal(0, np.sqrt(2 / H), (K, H)).astype(np.float32)
b2 = np.zeros(K, np.float32)

def forward(X):
    Z1 = X @ W1.T + b1
    A1 = np.maximum(0, Z1)
    Z2 = A1 @ W2.T + b2
    return Z1, A1, Z2

lr, batch_size = 0.1, 64
for epoch in range(5):
    order = rng.permutation(len(X_train))
    for start in range(0, len(order), batch_size):
        idx = order[start:start + batch_size]
        X, y = X_train[idx], y_train[idx]
        B = len(idx)
        # ---- forward ----
        Z1, A1, Z2 = forward(X)
        Z2 = Z2 - Z2.max(axis=1, keepdims=True)
        P = np.exp(Z2)
        P /= P.sum(axis=1, keepdims=True)
        # ---- backward (section 2, line by line) ----
        dZ2 = P
        dZ2[np.arange(B), y] -= 1
        dZ2 /= B
        dW2 = dZ2.T @ A1
        db2 = dZ2.sum(axis=0)
        dA1 = dZ2 @ W2
        dZ1 = dA1 * (Z1 > 0)
        dW1 = dZ1.T @ X
        db1 = dZ1.sum(axis=0)
        # ---- update ----
        W1 -= lr * dW1
        b1 -= lr * db1
        W2 -= lr * dW2
        b2 -= lr * db2
    test_acc = np.mean(forward(X_test)[2].argmax(axis=1) == y_test)
    print(f"epoch {epoch + 1}: test accuracy {test_acc:.4f}")      # ≈ 0.975 after 5 epochs

assert test_acc > 0.9
```

On the real MNIST data this reaches about **97.5% test accuracy** in five epochs (a minute or two on a laptop) — with code you understand completely.

**Things to try:** a 784-256-128-10 network; learning rate 0.05 vs 0.3; 20 epochs (watch the train/test gap — that's overfitting from Level 6).

## 6. The same network in C++

Plain C++20, no libraries. It reads the **un-gzipped** files (run `gunzip mnist/*.gz` once — or keep both).

```cpp
// mnist_mlp.cpp — g++ -std=c++20 -O3 -march=native mnist_mlp.cpp -o mnist_mlp && ./mnist_mlp
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <numeric>
#include <random>
#include <stdexcept>
#include <string>
#include <vector>

// ---------------------------------------------------------------- data loading
uint32_t readBigEndian(std::ifstream& f) {
    unsigned char b[4];
    f.read(reinterpret_cast<char*>(b), 4);
    return (uint32_t(b[0]) << 24) | (uint32_t(b[1]) << 16) | (uint32_t(b[2]) << 8) | uint32_t(b[3]);
}

std::vector<float> loadImages(const std::string& path, size_t& count) {
    std::ifstream f(path, std::ios::binary);
    if (!f) {
        throw std::runtime_error("cannot open " + path + " (did you gunzip it?)");
    }
    if (readBigEndian(f) != 2051) {
        throw std::runtime_error("bad image file");
    }
    count = readBigEndian(f);
    uint32_t rows = readBigEndian(f);
    uint32_t cols = readBigEndian(f);
    std::vector<unsigned char> raw(count * rows * cols);
    f.read(reinterpret_cast<char*>(raw.data()), raw.size());
    std::vector<float> images(raw.size());
    for (size_t i = 0; i < raw.size(); i++) {
        images[i] = raw[i] / 255.0f;                   // pixels to [0, 1]
    }
    return images;
}

std::vector<int> loadLabels(const std::string& path) {
    std::ifstream f(path, std::ios::binary);
    if (!f || readBigEndian(f) != 2049) {
        throw std::runtime_error("bad label file " + path);
    }
    uint32_t count = readBigEndian(f);
    std::vector<unsigned char> raw(count);
    f.read(reinterpret_cast<char*>(raw.data()), raw.size());
    return std::vector<int>(raw.begin(), raw.end());
}

// ---------------------------------------------------------------- the network
constexpr int D = 784;   // inputs
constexpr int H = 128;   // hidden units
constexpr int K = 10;    // classes

struct Net {
    std::vector<float> W1, b1, W2, b2;      // W1: H x D, W2: K x H (row-major)
    std::vector<float> gW1, gb1, gW2, gb2;  // gradient accumulators

    explicit Net(std::mt19937& rng)
        : W1(H * D), b1(H, 0), W2(K * H), b2(K, 0),
          gW1(H * D), gb1(H), gW2(K * H), gb2(K) {
        std::normal_distribution<float> n1(0.0f, std::sqrt(2.0f / D));
        std::normal_distribution<float> n2(0.0f, std::sqrt(2.0f / H));
        for (float& w : W1) {
            w = n1(rng);
        }
        for (float& w : W2) {
            w = n2(rng);
        }
    }

    // Forward pass for one image. Fills z1 (pre-ReLU), a1 (post-ReLU) and p (probabilities).
    void forward(const float* x, float* z1, float* a1, float* p) const {
        for (int h = 0; h < H; h++) {
            float s = b1[h];
            const float* row = &W1[h * D];
            for (int d = 0; d < D; d++) {
                s += row[d] * x[d];
            }
            z1[h] = s;
            a1[h] = s > 0 ? s : 0;
        }
        float maxZ = -1e30f;
        for (int k = 0; k < K; k++) {
            float s = b2[k];
            for (int h = 0; h < H; h++) {
                s += W2[k * H + h] * a1[h];
            }
            p[k] = s;
            maxZ = std::max(maxZ, s);
        }
        float sum = 0;
        for (int k = 0; k < K; k++) {
            p[k] = std::exp(p[k] - maxZ);
            sum += p[k];
        }
        for (int k = 0; k < K; k++) {
            p[k] /= sum;
        }
    }

    // Backward pass for one image, ADDING into the gradient accumulators.
    void backward(const float* x, const float* z1, const float* a1, const float* p, int label, float scale) {
        float dz2[K];
        for (int k = 0; k < K; k++) {
            dz2[k] = (p[k] - (k == label ? 1.0f : 0.0f)) * scale;   // (P - Y) / B
        }
        float da1[H] = {0};
        for (int k = 0; k < K; k++) {
            gb2[k] += dz2[k];
            for (int h = 0; h < H; h++) {
                gW2[k * H + h] += dz2[k] * a1[h];     // dW2 = dZ2^T A1
                da1[h] += dz2[k] * W2[k * H + h];     // dA1 = dZ2 W2
            }
        }
        for (int h = 0; h < H; h++) {
            float dz1 = z1[h] > 0 ? da1[h] : 0.0f;   // ReLU gate
            if (dz1 == 0.0f) {
                continue;
            }
            gb1[h] += dz1;
            float* g = &gW1[h * D];
            for (int d = 0; d < D; d++) {
                g[d] += dz1 * x[d];                   // dW1 = dZ1^T X
            }
        }
    }

    void step(float lr) {
        auto update = [lr](std::vector<float>& w, std::vector<float>& g) {
            for (size_t i = 0; i < w.size(); i++) {
                w[i] -= lr * g[i];
                g[i] = 0.0f;                          // reset for the next batch
            }
        };
        update(W1, gW1);
        update(b1, gb1);
        update(W2, gW2);
        update(b2, gb2);
    }
};

double accuracy(const Net& net, const std::vector<float>& X, const std::vector<int>& y) {
    float z1[H], a1[H], p[K];
    int correct = 0;
    for (size_t i = 0; i < y.size(); i++) {
        net.forward(&X[i * D], z1, a1, p);
        int predicted = int(std::max_element(p, p + K) - p);
        if (predicted == y[i]) {
            correct++;
        }
    }
    return double(correct) / y.size();
}

int main() {
    size_t nTrain = 0;
    size_t nTest = 0;
    std::vector<float> Xtr = loadImages("mnist/train-images-idx3-ubyte", nTrain);
    std::vector<int> ytr = loadLabels("mnist/train-labels-idx1-ubyte");
    std::vector<float> Xte = loadImages("mnist/t10k-images-idx3-ubyte", nTest);
    std::vector<int> yte = loadLabels("mnist/t10k-labels-idx1-ubyte");
    std::printf("loaded %zu training and %zu test images\n", nTrain, nTest);

    std::mt19937 rng(0);
    Net net(rng);
    const int batch = 64;
    const float lr = 0.1f;
    std::vector<int> order(nTrain);
    std::iota(order.begin(), order.end(), 0);
    float z1[H], a1[H], p[K];

    double acc = 0.0;
    for (int epoch = 1; epoch <= 3; epoch++) {
        std::shuffle(order.begin(), order.end(), rng);
        for (size_t start = 0; start < nTrain; start += batch) {
            size_t end = std::min(start + batch, nTrain);
            float scale = 1.0f / float(end - start);
            for (size_t k = start; k < end; k++) {
                const float* x = &Xtr[size_t(order[k]) * D];
                net.forward(x, z1, a1, p);
                net.backward(x, z1, a1, p, ytr[order[k]], scale);
            }
            net.step(lr);
        }
        acc = accuracy(net, Xte, yte);
        std::printf("epoch %d: test accuracy %.4f\n", epoch, acc);   // ≈ 0.96 after 3 epochs on real MNIST
    }
    return acc > 0.9 ? 0 : 1;
}
```

With `-O3 -march=native`, each epoch on real MNIST takes a few seconds and the network reaches about **96% after 3 epochs**. It's the same maths as the NumPy version; the NumPy one scores a bit higher (97.6% after 5 epochs) because it normalises the inputs and trains longer — exercise 4 closes the gap.

> **Interview:** "Why is training memory-hungry?" — backprop needs every layer's forward activations (here `z1`, `a1`, `p`). For big models those cached activations dominate memory, which is why tricks like gradient checkpointing (recompute instead of store) exist.

## 7. Common backprop bugs

| Symptom | Likely bug |
|---|---|
| Loss doesn't move | Learning rate too small, gradients zeroed too early, or updating a copy instead of the real weights. |
| Loss → `nan` | Learning rate too large, or `log(0)` / `exp(big)` without the stability tricks. |
| Gradient check fails for W but passes for b | Transpose in the wrong place (`X.T @ dOut` vs `dOut.T @ X`). |
| Training accuracy stuck at ~10% on MNIST | Labels not aligned with images after shuffling, or dead ReLUs from bad init. |
| Works for batch size 1, wrong for 64 | Forgot to divide by B, or summed over the wrong axis. |

## Checkpoint

- [ ] I can derive dW₂, db₂, dA₁, dZ₁, dW₁, db₁ for a 2-layer network and state each shape.
- [ ] My NumPy MLP passes a gradient check with relative error < 1e-6.
- [ ] I trained an MLP on MNIST to > 97% test accuracy in NumPy.
- [ ] I compiled and ran the C++ version and understand every loop.

## Exercises

1. Add a `Sigmoid` and a `Tanh` layer class to the NumPy MLP (forward + backward) and gradient-check them.
2. Replace ReLU with sigmoid in the MNIST network. How does training speed change? Explain using the sigmoid's maximum slope of 0.25.
3. Add **L2 weight decay** to the MNIST training: `dW += lam * W` with lam = 1e-4. Effect on the train/test gap after 20 epochs?
4. Make the C++ version normalise its inputs and add a second hidden layer (784-256-128-10).
5. Show that dZ₂ = (P − Y)/B is correct by deriving ∂L/∂z_k for one example: L = −log(e^(z_y) / Σⱼ e^(zⱼ)).

:::details Show solution
1.
```python
import numpy as np
class Sigmoid:
    def forward(self, X):
        self.out = 1 / (1 + np.exp(-X)); return self.out
    def backward(self, dOut):
        return dOut * self.out * (1 - self.out)
    def params(self): return []
class Tanh:
    def forward(self, X):
        self.out = np.tanh(X); return self.out
    def backward(self, dOut):
        return dOut * (1 - self.out ** 2)
    def params(self): return []
# quick check on f(x) = sum(layer(x) * c)
rng = np.random.default_rng(0); x = rng.normal(size=5); c = rng.normal(size=5)
for L in (Sigmoid(), Tanh()):
    L.forward(x); g = L.backward(c); h = 1e-6
    num = np.array([(np.sum(L.forward(x + h*e) * c) - np.sum(L.forward(x - h*e) * c)) / (2*h) for e in np.eye(5)])
    print(type(L).__name__, np.allclose(g, num))   # True True
```
2. It learns noticeably slower. Each sigmoid multiplies the backward signal by σ′ ≤ 0.25, and saturated units (large |z|) give ≈ 0, so gradients shrink layer after layer — the **vanishing gradient** problem. ReLU passes gradients through unchanged wherever it's active.
3. Weight decay keeps the weights smaller; after 20 epochs the training accuracy is slightly lower but the test accuracy is equal or slightly higher, i.e. the gap shrinks.
4. Compute the training mean/std once, apply `(x - mean) / std` when loading, and add a `W3, b3` layer with the same forward/backward pattern (the hidden-to-hidden layer needs its own ReLU gate and a `da2` buffer).
5. L = −z_y + log Σⱼ e^(zⱼ). Then ∂L/∂z_k = −[k = y] + e^(z_k)/Σⱼ e^(zⱼ) = p_k − y_k. Averaging over a batch of B gives (P − Y)/B.
:::

## External resources

- **3Blue1Brown — Neural Networks, chapters 2–4** ("Gradient descent", "What is backpropagation really doing?", "Backpropagation calculus").
- **Andrej Karpathy — "Yes you should understand backprop"** (blog post) and the **CS231n backprop lecture & notes** (cs231n.github.io/optimization-2).
- **Michael Nielsen — *Neural Networks and Deep Learning*, Chapter 2** (how backprop works, with proofs).
- **Goodfellow et al. — *Deep Learning*, Section 6.5** (back-propagation and other differentiation algorithms).
- **Yann LeCun's MNIST page** and **Papers with Code — MNIST leaderboard**: see how far the state of the art goes (99.8%).
