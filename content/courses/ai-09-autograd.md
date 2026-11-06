# Level 9 · Build Your Own Autograd Engine

> **Key idea:** in Level 8 you derived every gradient by hand. That doesn't scale to 100-layer networks. **Automatic differentiation** records every operation as it happens (building a graph), then walks the graph backwards applying each operation's local chain-rule step. That's what `loss.backward()` does in PyTorch — and you'll build it yourself in ~100 lines.

**Goals of this level**
- Understand the **computational graph** and **reverse-mode automatic differentiation**.
- Build a scalar autograd engine (`Value`) in Python, then a neural-network library on top of it.
- Build the same engine in **C++ with `std::shared_ptr`** graph nodes.
- Verify both against **PyTorch**.

## 1. The computational graph

Every expression is a graph of simple operations. For `L = (a·b + c)²`:

```text
a ──┐
    ×──► d ──┐
b ──┘        +──► e ──► square ──► L
c ───────────┘
```

**Forward:** compute values from left to right.
**Backward:** start with ∂L/∂L = 1 and move right to left. At each node, use its **local derivative** and the chain rule to pass gradients to its inputs.

```text
a = 2, b = −3, c = 10
d = a·b = −6         e = d + c = 4         L = e² = 16

∂L/∂e = 2e = 8
∂L/∂d = ∂L/∂e · 1 = 8              ∂L/∂c = 8
∂L/∂a = ∂L/∂d · b = 8·(−3) = −24   ∂L/∂b = ∂L/∂d · a = 8·2 = 16
```

Each operation only needs to know **its own** derivative rule:

| Operation | Local rule (given the output gradient g) |
|---|---|
| out = x + y | x.grad += g, y.grad += g |
| out = x · y | x.grad += g·y, y.grad += g·x |
| out = xⁿ | x.grad += g·n·xⁿ⁻¹ |
| out = tanh(x) | x.grad += g·(1 − out²) |
| out = relu(x) | x.grad += g·[x > 0] |
| out = eˣ | x.grad += g·out |

> **Key:** gradients are **added** (`+=`), not assigned. If a value is used twice (like `x` in `x·x`), it receives gradient from both uses — that's the multivariable chain rule.

**Why "reverse mode"?** A network has millions of inputs (weights) and one output (the loss). Going backwards from the single output gives *all* gradients in one sweep, costing about as much as one forward pass. Going forwards would need one sweep per weight.

## 2. A scalar autograd engine in Python

```python
import math

class Value:
    """A number that remembers how it was computed, so it can backpropagate."""

    def __init__(self, data, parents=(), op=""):
        self.data = data
        self.grad = 0.0
        self._parents = parents          # the Values this one was computed from
        self._backward = lambda: None    # how to push my grad to my parents
        self.op = op

    # ---- operations: each one defines its local backward rule ----
    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), "+")
        def _backward():
            self.grad += out.grad
            other.grad += out.grad
        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), "*")
        def _backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _backward
        return out

    def __pow__(self, n):
        assert isinstance(n, (int, float)), "only constant exponents"
        out = Value(self.data ** n, (self,), f"**{n}")
        def _backward():
            self.grad += n * self.data ** (n - 1) * out.grad
        out._backward = _backward
        return out

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,), "tanh")
        def _backward():
            self.grad += (1 - t * t) * out.grad
        out._backward = _backward
        return out

    def relu(self):
        out = Value(max(0.0, self.data), (self,), "relu")
        def _backward():
            self.grad += (1.0 if self.data > 0 else 0.0) * out.grad
        out._backward = _backward
        return out

    def exp(self):
        e = math.exp(self.data)
        out = Value(e, (self,), "exp")
        def _backward():
            self.grad += e * out.grad
        out._backward = _backward
        return out

    def log(self):
        out = Value(math.log(self.data), (self,), "log")
        def _backward():
            self.grad += (1.0 / self.data) * out.grad
        out._backward = _backward
        return out

    # ---- convenience: build the rest from the operations above ----
    def __neg__(self):
        return self * -1

    def __sub__(self, other):
        return self + (-other)

    def __truediv__(self, other):
        return self * other ** -1

    def __radd__(self, other):
        return self + other

    def __rmul__(self, other):
        return self * other

    def __rsub__(self, other):
        return (-self) + other

    # ---- backpropagation ----
    def backward(self):
        # 1. Topological order: every node appears after all the nodes it depends on.
        order, visited = [], set()
        def visit(v):
            if v not in visited:
                visited.add(v)
                for p in v._parents:
                    visit(p)
                order.append(v)
        visit(self)
        # 2. Seed and sweep backwards.
        self.grad = 1.0
        for v in reversed(order):
            v._backward()

    def __repr__(self):
        return f"Value(data={self.data:.4f}, grad={self.grad:.4f})"


# The example from section 1:
a, b, c = Value(2.0), Value(-3.0), Value(10.0)
L = (a * b + c) ** 2
L.backward()
print(L, a, b, c)
assert (a.grad, b.grad, c.grad) == (-24.0, 16.0, 8.0)

# A value used twice: d/dx (x*x + x) = 2x + 1 = 7 at x = 3
x = Value(3.0)
y = x * x + x
y.backward()
assert x.grad == 7.0
print("d/dx (x*x + x) at 3 =", x.grad)
```

### Why the topological sort?

A node's `_backward` must run only **after** its output's gradient is complete — i.e. after every node that uses it has already pushed its contribution. Visiting parents first and then reversing gives exactly that order.

## 3. A neural-network library on top of `Value`

```python
import math
import random

# (Paste the Value class from section 2 here — repeated so this block runs on its own.)
class Value:
    def __init__(self, data, parents=()):
        self.data, self.grad, self._parents, self._backward = data, 0.0, parents, lambda: None
    def __add__(self, o):
        o = o if isinstance(o, Value) else Value(o)
        out = Value(self.data + o.data, (self, o))
        def bw():
            self.grad += out.grad; o.grad += out.grad
        out._backward = bw; return out
    def __mul__(self, o):
        o = o if isinstance(o, Value) else Value(o)
        out = Value(self.data * o.data, (self, o))
        def bw():
            self.grad += o.data * out.grad; o.grad += self.data * out.grad
        out._backward = bw; return out
    def __pow__(self, n):
        out = Value(self.data ** n, (self,))
        def bw():
            self.grad += n * self.data ** (n - 1) * out.grad
        out._backward = bw; return out
    def tanh(self):
        t = math.tanh(self.data); out = Value(t, (self,))
        def bw():
            self.grad += (1 - t * t) * out.grad
        out._backward = bw; return out
    def __neg__(self): return self * -1
    def __sub__(self, o): return self + (-o)
    def __radd__(self, o): return self + o
    def __rmul__(self, o): return self * o
    def backward(self):
        order, seen = [], set()
        def visit(v):
            if v not in seen:
                seen.add(v)
                for p in v._parents:
                    visit(p)
                order.append(v)
        visit(self); self.grad = 1.0
        for v in reversed(order):
            v._backward()

class Neuron:
    def __init__(self, n_in, nonlinear=True):
        self.w = [Value(random.uniform(-1, 1)) for _ in range(n_in)]
        self.b = Value(0.0)
        self.nonlinear = nonlinear

    def __call__(self, x):
        z = sum((wi * xi for wi, xi in zip(self.w, x)), self.b)
        return z.tanh() if self.nonlinear else z

    def parameters(self):
        return self.w + [self.b]

class Layer:
    def __init__(self, n_in, n_out, **kw):
        self.neurons = [Neuron(n_in, **kw) for _ in range(n_out)]

    def __call__(self, x):
        out = [n(x) for n in self.neurons]
        return out[0] if len(out) == 1 else out

    def parameters(self):
        return [p for n in self.neurons for p in n.parameters()]

class MLP:
    def __init__(self, n_in, sizes):
        dims = [n_in] + sizes
        self.layers = [Layer(dims[i], dims[i + 1], nonlinear=(i < len(sizes) - 1)) for i in range(len(sizes))]

    def __call__(self, x):
        for layer in self.layers:
            x = layer(x)
        return x

    def parameters(self):
        return [p for layer in self.layers for p in layer.parameters()]

random.seed(1)
# Tiny dataset: 4 points, targets +1 / -1
xs = [[2.0, 3.0, -1.0], [3.0, -1.0, 0.5], [0.5, 1.0, 1.0], [1.0, 1.0, -1.0]]
ys = [1.0, -1.0, -1.0, 1.0]
model = MLP(3, [4, 4, 1])
print("parameters:", len(model.parameters()))                 # 41

for step in range(200):
    preds = [model(x) for x in xs]
    loss = sum((p - y) ** 2 for p, y in zip(preds, ys))       # builds one big graph
    for p in model.parameters():
        p.grad = 0.0                                          # zero the grads (like optimizer.zero_grad())
    loss.backward()                                           # autograd does all the calculus
    for p in model.parameters():
        p.data -= 0.05 * p.grad                               # SGD step
    if step % 50 == 0:
        print(f"step {step:3d}  loss {loss.data:.5f}")

print("predictions:", [round(model(x).data, 3) for x in xs], "targets:", ys)
assert loss.data < 0.05
```

> **Warning:** forgetting to zero the gradients is the most common autograd bug — because gradients accumulate (`+=`), the second `backward()` would add to the first. PyTorch has exactly the same behaviour, which is why every training loop calls `optimizer.zero_grad()`.

## 4. Check against PyTorch

PyTorch's autograd follows the same rules, so it must agree with ours.

```python
import torch

a = torch.tensor(2.0, requires_grad=True)
b = torch.tensor(-3.0, requires_grad=True)
c = torch.tensor(10.0, requires_grad=True)
L = (a * b + c) ** 2
L.backward()
print(a.grad.item(), b.grad.item(), c.grad.item())     # -24.0 16.0 8.0 — same as ours
assert (a.grad.item(), b.grad.item(), c.grad.item()) == (-24.0, 16.0, 8.0)

x = torch.tensor(0.7, requires_grad=True)
y = torch.tanh(x * 3) * x
y.backward()
# by hand: d/dx [x * tanh(3x)] = tanh(3x) + 3x * (1 - tanh(3x)^2)
t = torch.tanh(torch.tensor(2.1))
expected = t + 2.1 * (1 - t ** 2)
print(x.grad.item(), expected.item())
assert abs(x.grad.item() - expected.item()) < 1e-6
```

## 5. The same engine in C++ (with `shared_ptr`)

In C++ the graph is a set of nodes that point to their parents. Several outputs can share the same parent, so **`std::shared_ptr`** is the natural owner: a node stays alive as long as some later node (or your variable) refers to it. Each node stores a `std::function` closure for its backward rule.

```cpp
#include <cassert>
#include <cmath>
#include <cstdio>
#include <functional>
#include <memory>
#include <random>
#include <unordered_set>
#include <vector>

struct Node;
using Var = std::shared_ptr<Node>;

struct Node {
    double data = 0.0;
    double grad = 0.0;
    std::vector<Var> parents;              // keeps the inputs alive
    std::function<void()> backward;        // local chain-rule step

    explicit Node(double d) : data(d) {}
};

Var make(double d) {
    return std::make_shared<Node>(d);
}

// ---- operations ----
// Note: capturing `out` itself would create a reference cycle (out -> backward -> out)
// and leak. We capture a raw pointer to out: safe, because the closure is owned by out.
Var operator+(const Var& a, const Var& b) {
    Var out = make(a->data + b->data);
    out->parents = {a, b};
    Node* o = out.get();
    out->backward = [a, b, o]() {
        a->grad += o->grad;
        b->grad += o->grad;
    };
    return out;
}

Var operator*(const Var& a, const Var& b) {
    Var out = make(a->data * b->data);
    out->parents = {a, b};
    Node* o = out.get();
    out->backward = [a, b, o]() {
        a->grad += b->data * o->grad;
        b->grad += a->data * o->grad;
    };
    return out;
}

Var tanhV(const Var& a) {
    double t = std::tanh(a->data);
    Var out = make(t);
    out->parents = {a};
    Node* o = out.get();
    out->backward = [a, o, t]() {
        a->grad += (1.0 - t * t) * o->grad;
    };
    return out;
}

Var square(const Var& a) {
    return a * a;                            // reuse * : a gets gradient from both uses
}

// ---- backpropagation ----
void buildOrder(Node* n, std::unordered_set<Node*>& seen, std::vector<Node*>& order) {
    if (seen.count(n) > 0) {
        return;
    }
    seen.insert(n);
    for (const Var& p : n->parents) {
        buildOrder(p.get(), seen, order);
    }
    order.push_back(n);
}

void backward(const Var& root) {
    std::vector<Node*> order;
    std::unordered_set<Node*> seen;
    buildOrder(root.get(), seen, order);
    root->grad = 1.0;
    for (auto it = order.rbegin(); it != order.rend(); ++it) {
        if ((*it)->backward) {
            (*it)->backward();
        }
    }
}

int main() {
    // The worked example: L = (a*b + c)^2
    Var a = make(2.0);
    Var b = make(-3.0);
    Var c = make(10.0);
    Var L = square(a * b + c);
    backward(L);
    std::printf("L = %.1f, dL/da = %.1f, dL/db = %.1f, dL/dc = %.1f\n", L->data, a->grad, b->grad, c->grad);
    assert(a->grad == -24.0 && b->grad == 16.0 && c->grad == 8.0);

    // Train a single tanh neuron to output 0.5 for input [1, 2].
    std::mt19937 rng(0);
    std::uniform_real_distribution<double> u(-1.0, 1.0);
    Var w1 = make(u(rng));
    Var w2 = make(u(rng));
    Var bias = make(0.0);
    Var x1 = make(1.0);
    Var x2 = make(2.0);
    Var target = make(-0.5);                      // we'll compute (out - 0.5)^2 as (out + target)^2
    double loss = 0.0;
    for (int step = 0; step < 200; step++) {
        Var out = tanhV(w1 * x1 + w2 * x2 + bias);
        Var err = out + target;
        Var l = square(err);
        for (Var p : {w1, w2, bias}) {
            p->grad = 0.0;                         // zero grads before each backward
        }
        backward(l);
        for (Var p : {w1, w2, bias}) {
            p->data -= 0.1 * p->grad;
        }
        loss = l->data;
    }
    std::printf("final loss %.2e\n", loss);
    assert(loss < 1e-6);
    return 0;
}
```

> **Interview:** "Why not capture `out` (the shared_ptr) inside its own backward lambda?" — Because then `out` owns a function that owns `out`: a **reference cycle**. Reference counts never reach zero and the whole graph leaks. Capturing a raw `Node*` (non-owning) is safe here because the lambda can't outlive the node that owns it. (`std::weak_ptr` is the other standard way to break cycles.)

## 6. From scalars to tensors

Our engine creates one graph node per **number**, so a 784×128 layer would create 100,000 nodes per example — far too slow. Real frameworks make each node a **tensor operation** (a whole matrix multiply) with a vectorised backward rule — exactly the rules you derived in Level 8:

| Tensor op | Backward |
|---|---|
| Y = X @ W.T | dX = dY @ W, dW = dY.T @ X |
| Y = X + b (broadcast) | dX = dY, db = dY summed over the broadcast axis |
| Y = relu(X) | dX = dY * (X > 0) |

```python
import numpy as np

class Tensor:
    """Minimal tensor autograd: same idea as Value, but each node holds a whole array."""
    def __init__(self, data, parents=()):
        self.data = np.asarray(data, dtype=float)
        self.grad = np.zeros_like(self.data)
        self._parents = parents
        self._backward = lambda: None

    def matmul_T(self, W):                  # self @ W.T
        out = Tensor(self.data @ W.data.T, (self, W))
        def bw():
            self.grad += out.grad @ W.data
            W.grad += out.grad.T @ self.data
        out._backward = bw
        return out

    def add_bias(self, b):
        out = Tensor(self.data + b.data, (self, b))
        def bw():
            self.grad += out.grad
            b.grad += out.grad.sum(axis=0)  # undo the broadcast
        out._backward = bw
        return out

    def relu(self):
        out = Tensor(np.maximum(0, self.data), (self,))
        def bw():
            self.grad += out.grad * (self.data > 0)
        out._backward = bw
        return out

    def mse(self, target):
        diff = self.data - target
        out = Tensor(np.mean(diff ** 2), (self,))
        def bw():
            self.grad += out.grad * 2 * diff / diff.size
        out._backward = bw
        return out

    def backward(self):
        order, seen = [], set()
        def visit(v):
            if id(v) not in seen:
                seen.add(id(v))
                for p in v._parents:
                    visit(p)
                order.append(v)
        visit(self)
        self.grad = np.ones_like(self.data)
        for v in reversed(order):
            v._backward()

# Check against PyTorch on a small 2-layer network.
import torch
rng = np.random.default_rng(0)
Xn, W1n, b1n, W2n, b2n = rng.normal(size=(5, 3)), rng.normal(size=(4, 3)), rng.normal(size=4), rng.normal(size=(2, 4)), rng.normal(size=2)
target = rng.normal(size=(5, 2))

X, W1, b1, W2, b2 = map(Tensor, (Xn, W1n, b1n, W2n, b2n))
loss = X.matmul_T(W1).add_bias(b1).relu().matmul_T(W2).add_bias(b2).mse(target)
loss.backward()

tW1 = torch.tensor(W1n, requires_grad=True)
tb1 = torch.tensor(b1n, requires_grad=True)
tW2 = torch.tensor(W2n, requires_grad=True)
tb2 = torch.tensor(b2n, requires_grad=True)
tl = ((torch.relu(torch.tensor(Xn) @ tW1.T + tb1) @ tW2.T + tb2 - torch.tensor(target)) ** 2).mean()
tl.backward()
for ours, theirs in [(W1, tW1), (b1, tb1), (W2, tW2), (b2, tb2)]:
    assert np.allclose(ours.grad, theirs.grad.numpy())
print("tensor autograd matches PyTorch; loss =", round(float(loss.data), 6))
```

That's genuinely the core of PyTorch: tensors that remember the operation that created them, and a backward sweep in topological order.

## Checkpoint

- [ ] I can draw the computational graph of an expression and backpropagate through it by hand.
- [ ] I know why gradients accumulate with `+=` and why we must zero them each step.
- [ ] My Python `Value` engine trains a small MLP, and its gradients match PyTorch.
- [ ] I can explain the reference-cycle problem in the C++ version and how it was avoided.

## Exercises

1. Add `__truediv__` support to the second `Value` class and check d/dx (1/x) at x = 4 (should be −1/16).
2. Add `sigmoid()` to `Value`, using σ′ = σ(1 − σ). Train the 4-point MLP with sigmoid instead of tanh (targets 0/1).
3. Write a function `draw(root)` that prints every node of the graph with its op, data and grad (a text "graphviz").
4. In the C++ engine add `operator-`, `relu`, and `exp`, then implement softmax + cross-entropy for 3 logits and check the gradient equals p − onehot.
5. Extend the NumPy `Tensor` with `softmax_cross_entropy(labels)` and train a 784-64-10 network on MNIST with it.

:::details Show solution
1. Implement division as multiplication by a power: `def __truediv__(self, o): return self * (o if isinstance(o, Value) else Value(o)) ** -1`. For x = 4: `y = Value(1.0) * x ** -1; y.backward()` gives x.grad = −1·4⁻² = −0.0625.
2.
```python
def sigmoid(self):
    s = 1 / (1 + math.exp(-self.data))
    out = Value(s, (self,))
    def bw():
        self.grad += s * (1 - s) * out.grad
    out._backward = bw
    return out
```
3. Do the same topological traversal as `backward`, then print `type/op`, `data` and `grad` for each node, indenting by depth.
4. With z = [z₀, z₁, z₂]: build m = exp(z₀) + exp(z₁) + exp(z₂), p_k = exp(z_k)/m (division = multiply by m^(−1), add a `pow` op), loss = −log(p_y) (add `log`). After `backward`, z_k.grad should equal p_k − [k = y].
5. Add an op whose forward computes the mean cross-entropy from logits and whose backward sets `self.grad += out.grad * (P - onehot) / B` — the Level 8 formula as one fused node. Training then looks like a mini PyTorch loop.
:::

## External resources

- **Andrej Karpathy — "The spelled-out intro to neural networks and backpropagation: building micrograd"** (YouTube, 2.5 h). This level follows the same idea; watch it after you've written your own.
- **micrograd** (github.com/karpathy/micrograd) and **tinygrad** (github.com/tinygrad/tinygrad): small, readable autograd engines.
- **PyTorch docs — "Autograd mechanics"** (pytorch.org/docs/stable/notes/autograd.html).
- **Baydin et al., "Automatic Differentiation in Machine Learning: a Survey"** (JMLR 2018) — the MS-level reference on forward vs reverse mode.
- **cppreference — `std::shared_ptr`, `std::weak_ptr`**: ownership and breaking cycles.
