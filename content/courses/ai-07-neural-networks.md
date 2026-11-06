# Level 7 · Neurons, Layers & the Forward Pass

> **Key idea:** a neural network is a stack of logistic-regression-like units. Each layer does `matrix × input + bias` and then bends the result with a simple non-linear function. The bending is what lets networks learn curved decision boundaries that a single linear model never could.

**Goals of this level**
- Understand the artificial **neuron**, the **perceptron**, and why one neuron can't learn XOR.
- Know the main **activation functions** and why they're needed.
- Build a multi-layer network's **forward pass** in NumPy and in C++, with correct shapes.
- Solve XOR with a 2-layer network (with hand-picked weights — training them is Level 8).

## 1. The artificial neuron

```text
x₁ ──w₁──┐
x₂ ──w₂──┼──► z = Σ wᵢxᵢ + b ──► a = f(z) ──► output
x₃ ──w₃──┘
```

1. **Weighted sum:** z = w · x + b (a dot product, Level 1).
2. **Activation:** a = f(z), a simple non-linear function.

With f = sigmoid this is exactly logistic regression (Level 5). The biological story (dendrites, firing) is a loose inspiration — what matters is the maths.

## 2. The perceptron (1958) and its limit

Rosenblatt's perceptron uses a step activation (output 1 if z > 0, else 0) and a simple learning rule: when it's wrong, nudge the weights towards the right answer.

```python
import numpy as np

def train_perceptron(X, y, epochs=20, lr=0.1):
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epochs):
        for xi, target in zip(X, y):
            predicted = 1 if xi @ w + b > 0 else 0
            error = target - predicted            # -1, 0 or +1
            w += lr * error * xi                  # move the boundary towards the mistake
            b += lr * error
    return w, b

def accuracy(w, b, X, y):
    return np.mean([(1 if xi @ w + b > 0 else 0) == t for xi, t in zip(X, y)])

X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
y_and = np.array([0, 0, 0, 1])
y_xor = np.array([0, 1, 1, 0])

w, b = train_perceptron(X, y_and)
print("AND accuracy:", accuracy(w, b, X, y_and))     # 1.0
w, b = train_perceptron(X, y_xor, epochs=1000)
print("XOR accuracy:", accuracy(w, b, X, y_xor))     # never 1.0 — at most 0.75
assert accuracy(w, b, X, y_xor) < 1.0
```

**Why XOR is impossible for one neuron:** one neuron's decision boundary is a single straight line (Level 5). XOR's positive points (0,1) and (1,0) sit on opposite corners with the negative points between them — no single line separates them. This observation (Minsky & Papert, 1969) helped cause the first "AI winter". The fix: **add a hidden layer**.

## 3. Activation functions

| Name | Formula | Range | Notes |
|---|---|---|---|
| Sigmoid | 1 / (1 + e^(−z)) | (0, 1) | Output probabilities. Saturates → tiny gradients in deep nets. |
| Tanh | (e^z − e^(−z)) / (e^z + e^(−z)) | (−1, 1) | Zero-centred sigmoid. Still saturates. |
| **ReLU** | max(0, z) | [0, ∞) | The default for hidden layers. Cheap, doesn't saturate for z > 0. |
| Leaky ReLU | max(0.01z, z) | (−∞, ∞) | Fixes "dead" ReLUs that are stuck at 0. |
| GELU | z · Φ(z) | ≈ (−0.17, ∞) | Smooth ReLU used in transformers (BERT, GPT). |
| Softmax | e^(zᵢ) / Σ e^(zⱼ) | probabilities | Output layer for multi-class classification. |

```python
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def relu(z):
    return np.maximum(0, z)

def leaky_relu(z, slope=0.01):
    return np.where(z > 0, z, slope * z)

def gelu(z):
    # the tanh approximation used by GPT-2
    return 0.5 * z * (1 + np.tanh(np.sqrt(2 / np.pi) * (z + 0.044715 * z ** 3)))

z = np.array([-3.0, -1.0, 0.0, 1.0, 3.0])
for name, f in [("sigmoid", sigmoid), ("tanh", np.tanh), ("relu", relu),
                ("leaky", leaky_relu), ("gelu", gelu)]:
    print(f"{name:8s}", np.round(f(z), 3))
```

### Why non-linearity is essential

Without activations, two layers collapse into one:

```text
W₂(W₁x + b₁) + b₂ = (W₂W₁)x + (W₂b₁ + b₂) = W'x + b'
```

A product of matrices is just another matrix — 100 linear layers are no more powerful than one. The non-linear "bend" between layers is what adds expressive power.

## 4. A layer, in matrix form

A **layer** of m neurons, each looking at the same n inputs, has:

- weights **W** of shape (m, n) — row i holds neuron i's weights,
- biases **b** of shape (m,).

```text
z = W x + b          (m,) = (m, n)·(n,) + (m,)
a = f(z)             applied element by element
```

For a **batch** of B examples stacked as rows of X (shape (B, n)), the standard convention is

```text
Z = X Wᵀ + b         (B, m) = (B, n)·(n, m) + (m,)  ← b broadcasts to every row
```

(Many libraries store W as (n, m) so the formula is `X @ W`; PyTorch's `nn.Linear` stores (m, n) and computes `X @ W.T`. Both are fine — just be consistent.)

## 5. A multi-layer perceptron (MLP)

Stack layers; the output of one is the input of the next:

```text
input x (784) → [Linear 784→128, ReLU] → [Linear 128→64, ReLU] → [Linear 64→10] → softmax → 10 probabilities
```

The middle layers are **hidden layers**; their outputs are **hidden features** the network invents for itself. Counting parameters:

```text
784·128 + 128  = 100,480
128·64  + 64   =   8,256
64·10   + 10   =     650
total          = 109,386 learnable numbers
```

```python
import numpy as np

rng = np.random.default_rng(0)

def init_layer(n_in, n_out):
    # He initialisation (Level 10): keeps signals from shrinking/exploding through ReLU layers.
    W = rng.normal(0, np.sqrt(2.0 / n_in), size=(n_out, n_in))
    b = np.zeros(n_out)
    return W, b

def relu(z):
    return np.maximum(0, z)

def softmax_rows(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

sizes = [784, 128, 64, 10]
layers = [init_layer(a, b) for a, b in zip(sizes[:-1], sizes[1:])]
n_params = sum(W.size + b.size for W, b in layers)
print("parameters:", n_params)                        # 109386
assert n_params == 109386

def forward(X):
    a = X
    for i, (W, b) in enumerate(layers):
        z = a @ W.T + b                               # (B, n_in) @ (n_in, n_out) -> (B, n_out)
        a = relu(z) if i < len(layers) - 1 else z     # no ReLU on the last layer: raw scores
        print(f"  after layer {i + 1}: shape {a.shape}")
    return softmax_rows(a)

batch = rng.random((32, 784))                          # 32 fake "images"
probs = forward(batch)
print("output shape:", probs.shape, "rows sum to 1:", np.allclose(probs.sum(axis=1), 1))
```

With random weights the outputs are meaningless (≈ 10% for each class). **Training** (Level 8) will tune the 109,386 numbers.

## 6. Solving XOR with one hidden layer

Two hidden neurons are enough. Hand-pick weights so that:

- hidden neuron h₁ fires for "x₁ OR x₂",
- hidden neuron h₂ fires for "x₁ AND x₂",
- output = h₁ AND NOT h₂ → exactly XOR.

```python
import numpy as np

def step(z):
    return (z > 0).astype(float)

X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)

W1 = np.array([[1.0, 1.0],      # h1: x1 + x2 - 0.5 > 0   -> OR
               [1.0, 1.0]])     # h2: x1 + x2 - 1.5 > 0   -> AND
b1 = np.array([-0.5, -1.5])
W2 = np.array([[1.0, -2.0]])    # out: h1 - 2*h2 - 0.5 > 0 -> OR and not AND
b2 = np.array([-0.5])

H = step(X @ W1.T + b1)
out = step(H @ W2.T + b2).ravel()
print("hidden features:\n", H)
print("XOR outputs:", out)                      # [0. 1. 1. 0.]
assert (out == [0, 1, 1, 0]).all()
```

Look at the hidden features: the 4 input points get mapped to (0,0), (1,0), (1,0), (1,1). In this **new space** the XOR classes *are* separable by a line. **That's what hidden layers do: transform the data until the problem becomes linearly separable.**

## 7. How powerful are networks? (Universal approximation)

The **universal approximation theorem**: a network with **one** hidden layer and enough neurons can approximate any continuous function on a bounded region as closely as you like.

Intuition with ReLUs: each hidden ReLU adds a "kink" to a piecewise-linear function. With enough kinks you can trace any curve.

```python
import numpy as np

# Build f(x) ≈ sin(x) on [0, 2π] by hand from ReLU "kinks" — no training.
knots = np.linspace(0, 2 * np.pi, 21)
values = np.sin(knots)
slopes = np.diff(values) / np.diff(knots)

def relu(z):
    return np.maximum(0, z)

def approx(x):
    out = values[0] + slopes[0] * (x - knots[0])
    for k in range(1, len(slopes)):
        out += (slopes[k] - slopes[k - 1]) * relu(x - knots[k])   # one hidden ReLU per knot
    return out

x = np.linspace(0, 2 * np.pi, 1000)
err = np.max(np.abs(approx(x) - np.sin(x)))
print(f"max error with 20 hidden ReLUs: {err:.4f}")    # ≈ 0.012
assert err < 0.02
```

The theorem says such weights *exist*; it doesn't say training will find them, or how many neurons you'll need. In practice **deep** (many layers) networks need far fewer neurons than wide shallow ones — each layer builds on the features of the one before (edges → shapes → objects).

## 8. The forward pass in C++

A reusable dense layer and an MLP, with flat row-major weight storage.

```cpp
#include <cassert>
#include <cmath>
#include <cstdio>
#include <random>
#include <vector>

struct Dense {
    size_t in = 0;
    size_t out = 0;
    std::vector<double> W;   // out * in, row-major: W[o * in + i]
    std::vector<double> b;   // out

    Dense(size_t nIn, size_t nOut, std::mt19937& rng) : in(nIn), out(nOut), W(nIn * nOut), b(nOut, 0.0) {
        std::normal_distribution<double> dist(0.0, std::sqrt(2.0 / nIn));   // He initialisation
        for (double& w : W) {
            w = dist(rng);
        }
    }

    // z = W x + b
    std::vector<double> forward(const std::vector<double>& x) const {
        assert(x.size() == in);
        std::vector<double> z(out);
        for (size_t o = 0; o < out; o++) {
            double s = b[o];
            const double* row = &W[o * in];
            for (size_t i = 0; i < in; i++) {
                s += row[i] * x[i];
            }
            z[o] = s;
        }
        return z;
    }
};

void reluInPlace(std::vector<double>& v) {
    for (double& x : v) {
        if (x < 0.0) {
            x = 0.0;
        }
    }
}

void softmaxInPlace(std::vector<double>& v) {
    double m = v[0];
    for (double x : v) {
        m = std::max(m, x);
    }
    double sum = 0.0;
    for (double& x : v) {
        x = std::exp(x - m);
        sum += x;
    }
    for (double& x : v) {
        x /= sum;
    }
}

struct MLP {
    std::vector<Dense> layers;

    MLP(const std::vector<size_t>& sizes, std::mt19937& rng) {
        for (size_t i = 0; i + 1 < sizes.size(); i++) {
            layers.emplace_back(sizes[i], sizes[i + 1], rng);
        }
    }

    std::vector<double> forward(std::vector<double> a) const {
        for (size_t l = 0; l < layers.size(); l++) {
            a = layers[l].forward(a);
            if (l + 1 < layers.size()) {
                reluInPlace(a);           // hidden layers: ReLU
            }
        }
        softmaxInPlace(a);                // output layer: probabilities
        return a;
    }

    size_t parameterCount() const {
        size_t n = 0;
        for (const Dense& d : layers) {
            n += d.W.size() + d.b.size();
        }
        return n;
    }
};

int main() {
    std::mt19937 rng(0);
    MLP net({784, 128, 64, 10}, rng);
    std::printf("parameters: %zu\n", net.parameterCount());     // 109386
    assert(net.parameterCount() == 109386);

    std::vector<double> image(784, 0.5);                        // a fake grey image
    std::vector<double> p = net.forward(image);
    double total = 0.0;
    for (double v : p) {
        total += v;
    }
    std::printf("10 class probabilities sum to %.6f\n", total);
    assert(std::fabs(total - 1.0) < 1e-9);
    return 0;
}
```

## Checkpoint

- [ ] I can draw a neuron and write its formula.
- [ ] I can explain why a single neuron can't learn XOR and how a hidden layer fixes it.
- [ ] I can explain why stacking layers without activations is pointless.
- [ ] Given layer sizes, I can compute the number of parameters and every intermediate shape.
- [ ] My NumPy and C++ forward passes produce valid probability vectors.

## Exercises

1. How many parameters does a network with sizes [3, 5, 5, 2] have? Shapes of every W and b?
2. Find hand-picked weights for a network computing XNOR (the opposite of XOR).
3. Show numerically that a 2-layer network **without** activations equals a single linear layer: compute W' = W₂W₁ and b' = W₂b₁ + b₂ and compare outputs.
4. Implement tanh and leaky ReLU in the C++ `MLP`, selectable per layer with an `enum class Activation`.
5. Use the "ReLU kinks" idea to approximate f(x) = x² on [−2, 2]. How many hidden units do you need for a max error below 0.01?

:::details Show solution
1. Layer 1: W (5, 3), b (5,) → 20. Layer 2: W (5, 5), b (5,) → 30. Layer 3: W (2, 5), b (2,) → 12. **Total 62.**
2. Keep the OR and AND hidden units and flip the output: out = step(−h₁ + 2h₂ + 0.5). Check: (0,0) → h = (0,0) → 0.5 > 0 → 1; (0,1) → (1,0) → −0.5 → 0; (1,1) → (1,1) → 1.5 → 1. ✓
3.
```python
import numpy as np
rng = np.random.default_rng(0)
W1, b1 = rng.normal(size=(4, 3)), rng.normal(size=4)
W2, b2 = rng.normal(size=(2, 4)), rng.normal(size=2)
x = rng.normal(size=3)
two_layers = W2 @ (W1 @ x + b1) + b2
one_layer = (W2 @ W1) @ x + (W2 @ b1 + b2)
print(np.allclose(two_layers, one_layer))   # True
```
4. Add `enum class Activation { ReLU, Tanh, Leaky, None };`, store one per layer, and `switch` on it after `forward`: `std::tanh(x)`, or `x > 0 ? x : 0.01 * x`.
5. Piecewise-linear interpolation of x² with knot spacing h has max error h²/4, so you need h ≤ 0.2: **20 intervals ⇒ about 20 hidden ReLUs** on [−2, 2].
:::

## External resources

- **3Blue1Brown — "But what is a neural network?"** (Neural Networks, chapter 1). Watch it now.
- **Michael Nielsen — *Neural Networks and Deep Learning*, Chapters 1 and 4** (free at neuralnetworksanddeeplearning.com). Chapter 4 is a visual proof of universal approximation.
- **TensorFlow Playground** (playground.tensorflow.org): train tiny networks in your browser and watch hidden layers bend the data. Try XOR and the spiral.
- **CS231n — "Neural Networks Part 1: Setting up the Architecture"** (cs231n.github.io).
- **Goodfellow, Bengio & Courville — *Deep Learning*, Chapter 6** "Deep Feedforward Networks".
