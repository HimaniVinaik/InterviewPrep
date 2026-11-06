# Level 10 · Training Deep Networks Well

> **Key idea:** the backprop maths from Level 8 works for any depth, but deep networks are fragile: signals can vanish or explode, plain gradient descent zig-zags, and big models memorise their training data. This level is the toolbox practitioners use every day — good **initialisation**, better **optimisers** (momentum, Adam), **normalisation**, **dropout**, **learning-rate schedules**, and a **debugging** checklist.

**Goals of this level**
- See vanishing/exploding activations happen, and fix them with Xavier/He initialisation.
- Implement **SGD with momentum, RMSProp and Adam** from scratch and compare them.
- Implement **batch normalisation** and **dropout** (forward and backward).
- Use **learning-rate schedules**, **gradient clipping**, and a systematic debugging routine.

## 1. Initialisation: keeping signals alive

Pass a random input through 20 layers. If each layer's weights are slightly too small, the signal shrinks every layer and reaches ~0; too big, and it explodes. Gradients do the same on the way back.

The fix is to choose the weight scale so that **the variance of the activations stays the same from layer to layer**:

| Scheme | Weight std | For |
|---|---|---|
| Xavier / Glorot | √(1 / n_in) (or √(2 / (n_in + n_out))) | tanh, sigmoid |
| **He / Kaiming** | √(2 / n_in) | ReLU (the factor 2 makes up for ReLU zeroing half the values) |

```python
import numpy as np

rng = np.random.default_rng(0)
x = rng.normal(size=(1000, 512))           # a batch of inputs with std 1

def run(scale_fn, activation, layers=20):
    a = x
    for _ in range(layers):
        W = rng.normal(0, scale_fn(512), size=(512, 512))
        a = activation(a @ W)
    return a.std()

relu = lambda z: np.maximum(0, z)
print("ReLU, std 0.01      :", run(lambda n: 0.01, relu))            # ~1e-16 -> vanished
print("ReLU, std 1.0       :", run(lambda n: 1.0, relu))             # ~1e+24 -> exploded
print("ReLU, He sqrt(2/n)  :", run(lambda n: np.sqrt(2 / n), relu))  # ~1 -> healthy
print("tanh, Xavier sqrt(1/n):", run(lambda n: np.sqrt(1 / n), np.tanh))
assert 0.2 < run(lambda n: np.sqrt(2 / n), relu) < 5
```

> **Tip:** PyTorch's `nn.Linear` already uses a sensible default (Kaiming-uniform). You only think about this when writing layers yourself — or when a deep model refuses to train.

## 2. Optimisers: smarter steps

Plain SGD: `w ← w − lr·g`. Its problems: it zig-zags across steep valleys, crawls along flat ones, and uses one learning rate for every weight.

### Momentum

Keep a running "velocity" — an average of recent gradients. Consistent directions build up speed; zig-zags cancel out.

```text
v ← β·v + g            (β ≈ 0.9)
w ← w − lr·v
```

Like a ball rolling downhill: it doesn't stop at every bump.

### RMSProp

Divide each weight's step by a running average of its squared gradients, so weights with big gradients take smaller steps and weights with tiny gradients take bigger ones:

```text
s ← ρ·s + (1 − ρ)·g²
w ← w − lr · g / (√s + ε)
```

### Adam (Adaptive Moment estimation) — the default choice

Momentum **and** RMSProp, plus a bias correction because m and v start at 0:

```text
m ← β₁·m + (1 − β₁)·g          (β₁ = 0.9)     average gradient (direction)
v ← β₂·v + (1 − β₂)·g²         (β₂ = 0.999)   average squared gradient (scale)
m̂ = m / (1 − β₁ᵗ),  v̂ = v / (1 − β₂ᵗ)          bias correction (t = step number)
w ← w − lr · m̂ / (√v̂ + ε)      (lr ≈ 1e-3, ε = 1e-8)
```

**AdamW** applies weight decay directly to the weights (`w ← w − lr·λ·w`) instead of mixing it into the gradient; it's the standard for transformers.

```python
import numpy as np

# The Rosenbrock "banana" function: a long curved valley, minimum at (1, 1).
def f(p):
    x, y = p
    return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2

def grad(p):
    x, y = p
    return np.array([-2 * (1 - x) - 400 * x * (y - x ** 2), 200 * (y - x ** 2)])

class SGD:
    def __init__(self, lr):
        self.lr = lr
    def step(self, p, g):
        return p - self.lr * g

class Momentum:
    def __init__(self, lr, beta=0.9):
        self.lr, self.beta, self.v = lr, beta, 0.0
    def step(self, p, g):
        self.v = self.beta * self.v + g
        return p - self.lr * self.v

class RMSProp:
    def __init__(self, lr, rho=0.9, eps=1e-8):
        self.lr, self.rho, self.eps, self.s = lr, rho, eps, 0.0
    def step(self, p, g):
        self.s = self.rho * self.s + (1 - self.rho) * g ** 2
        return p - self.lr * g / (np.sqrt(self.s) + self.eps)

class Adam:
    def __init__(self, lr, b1=0.9, b2=0.999, eps=1e-8):
        self.lr, self.b1, self.b2, self.eps = lr, b1, b2, eps
        self.m, self.v, self.t = 0.0, 0.0, 0
    def step(self, p, g):
        self.t += 1
        self.m = self.b1 * self.m + (1 - self.b1) * g
        self.v = self.b2 * self.v + (1 - self.b2) * g ** 2
        m_hat = self.m / (1 - self.b1 ** self.t)
        v_hat = self.v / (1 - self.b2 ** self.t)
        return p - self.lr * m_hat / (np.sqrt(v_hat) + self.eps)

results = {}
for name, opt in [("SGD", SGD(1e-3)), ("Momentum", Momentum(1e-3)),
                  ("RMSProp", RMSProp(1e-3)), ("Adam", Adam(2e-2))]:
    p = np.array([-1.5, 2.0])
    for _ in range(5000):
        p = opt.step(p, grad(p))
    results[name] = f(p)
    print(f"{name:9s} final point {p.round(4)}  f = {f(p):.2e}")

assert results["Momentum"] < results["SGD"]        # momentum makes real progress along the valley
assert results["Adam"] < 1e-3
```

| Optimiser | When to use |
|---|---|
| SGD + momentum | CNNs for vision, with a good LR schedule — often generalises best. |
| **Adam / AdamW** | The safe default; transformers, RNNs, most new projects. |
| RMSProp | Older RL / RNN code. |

## 3. Learning-rate schedules

A high learning rate makes fast early progress; a low one fine-tunes at the end. Common schedules:

```text
step decay:   lr = lr₀ · 0.1^(floor(epoch / 30))
cosine:       lr = lr_min + ½(lr₀ − lr_min)(1 + cos(π · t / T))
warmup:       lr grows linearly from ~0 to lr₀ over the first few hundred steps
              (stops Adam's first, poorly-estimated steps from wrecking the model — standard for transformers)
```

```python
import math

def warmup_cosine(step, total, peak=1e-3, warmup=100, floor=1e-5):
    if step < warmup:
        return peak * (step + 1) / warmup                         # linear warm-up
    progress = (step - warmup) / max(1, total - warmup)
    return floor + 0.5 * (peak - floor) * (1 + math.cos(math.pi * progress))

for s in (0, 50, 99, 100, 500, 999):
    print(f"step {s:4d}: lr = {warmup_cosine(s, 1000):.2e}")
assert abs(warmup_cosine(99, 1000) - 1e-3) < 1e-12
assert warmup_cosine(999, 1000) < 2e-5
```

## 4. Batch normalisation

Normalise each feature **across the batch** to mean 0, variance 1, then let the network re-scale it with learnable γ (scale) and β (shift):

```text
μ = mean over the batch,  σ² = variance over the batch
x̂ = (x − μ) / √(σ² + ε)
y = γ·x̂ + β
```

It makes deep networks train faster and tolerate higher learning rates. At **test time** you can't rely on a batch, so BatchNorm uses running averages of μ and σ² collected during training — which is why PyTorch has `model.train()` and `model.eval()`.

**Layer normalisation** normalises across the features of **each example** instead of across the batch; it doesn't care about batch size, so transformers use it (Level 14).

The backward pass is a nice chain-rule exercise. The compact result:

```text
dx̂ = dy · γ
dx  = (1/N) · (1/√(σ²+ε)) · (N·dx̂ − Σ dx̂ − x̂ · Σ(dx̂ · x̂))
dγ  = Σ dy · x̂           dβ = Σ dy
```

```python
import numpy as np

class BatchNorm:
    def __init__(self, n, momentum=0.1, eps=1e-5):
        self.gamma, self.beta = np.ones(n), np.zeros(n)
        self.running_mean, self.running_var = np.zeros(n), np.ones(n)
        self.momentum, self.eps = momentum, eps
        self.training = True

    def forward(self, x):
        if self.training:
            mu, var = x.mean(axis=0), x.var(axis=0)
            self.running_mean = (1 - self.momentum) * self.running_mean + self.momentum * mu
            self.running_var = (1 - self.momentum) * self.running_var + self.momentum * var
        else:
            mu, var = self.running_mean, self.running_var     # test time: use the averages
        self.inv_std = 1.0 / np.sqrt(var + self.eps)
        self.x_hat = (x - mu) * self.inv_std
        return self.gamma * self.x_hat + self.beta

    def backward(self, dy):
        N = dy.shape[0]
        self.dgamma = (dy * self.x_hat).sum(axis=0)
        self.dbeta = dy.sum(axis=0)
        dxhat = dy * self.gamma
        return (self.inv_std / N) * (N * dxhat - dxhat.sum(axis=0) - self.x_hat * (dxhat * self.x_hat).sum(axis=0))

# Gradient check against finite differences.
rng = np.random.default_rng(0)
x = rng.normal(3.0, 2.0, size=(8, 4))
c = rng.normal(size=(8, 4))                       # loss = sum(c * bn(x))
bn = BatchNorm(4)
bn.gamma = rng.normal(size=4)
bn.forward(x)
analytic = bn.backward(c)

numeric = np.zeros_like(x)
h = 1e-6
for i in range(x.shape[0]):
    for j in range(x.shape[1]):
        xp, xm = x.copy(), x.copy()
        xp[i, j] += h
        xm[i, j] -= h
        numeric[i, j] = (np.sum(c * bn.forward(xp)) - np.sum(c * bn.forward(xm))) / (2 * h)
print("batchnorm max gradient error:", np.abs(analytic - numeric).max())
assert np.allclose(analytic, numeric, atol=1e-6)

out = BatchNorm(4).forward(x)
print("output mean ≈ 0:", out.mean(axis=0).round(6), " std ≈ 1:", out.std(axis=0).round(3))
```

## 5. Dropout

During training, randomly set a fraction p of activations to zero on every forward pass. The network can't rely on any single neuron, so it learns redundant, robust features — like training an ensemble of thinned networks that share weights.

**Inverted dropout** scales the survivors by 1/(1 − p) during training, so at test time you simply turn dropout off and the expected activation is unchanged.

```python
import numpy as np

class Dropout:
    def __init__(self, p, seed=0):
        self.p = p
        self.rng = np.random.default_rng(seed)
        self.training = True

    def forward(self, x):
        if not self.training or self.p == 0:
            return x                                       # test time: do nothing
        self.mask = (self.rng.random(x.shape) >= self.p) / (1 - self.p)
        return x * self.mask

    def backward(self, dy):
        return dy * self.mask                              # dropped units get no gradient

d = Dropout(0.5)
x = np.ones((10000, 10))
y = d.forward(x)
print("fraction zeroed:", np.mean(y == 0).round(3), " mean kept the same:", y.mean().round(3))   # 0.5, 1.0
d.training = False
assert (d.forward(x) == x).all()
```

Typical values: p = 0.1–0.5 on fully connected layers. Modern CNNs use less dropout (BatchNorm and data augmentation regularise too); transformers use ~0.1.

## 6. Gradient clipping

If the gradient norm suddenly spikes (common in RNNs and early transformer training), one step can destroy the model. Clip it:

```text
if ‖g‖ > max_norm:  g ← g · max_norm / ‖g‖
```

In PyTorch: `torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)`.

## 7. Putting it together in PyTorch

Everything from this level is one line in PyTorch. This trains a small MLP with BatchNorm, dropout, AdamW, warm-up + cosine schedule and gradient clipping:

```python
import math
import torch
import torch.nn as nn

torch.manual_seed(0)
# A synthetic 10-class problem: 20-D inputs, labels from a hidden random network.
X = torch.randn(21000, 20)
teacher = nn.Sequential(nn.Linear(20, 64), nn.Tanh(), nn.Linear(64, 10))
with torch.no_grad():
    y = teacher(X).argmax(dim=1)
X_train, y_train, X_val, y_val = X[:20000], y[:20000], X[20000:], y[20000:]

model = nn.Sequential(
    nn.Linear(20, 256), nn.BatchNorm1d(256), nn.ReLU(), nn.Dropout(0.1),
    nn.Linear(256, 256), nn.BatchNorm1d(256), nn.ReLU(), nn.Dropout(0.1),
    nn.Linear(256, 10),
)
opt = torch.optim.AdamW(model.parameters(), lr=3e-3, weight_decay=1e-2)
epochs, batch = 20, 128
steps = epochs * math.ceil(len(X_train) / batch)
sched = torch.optim.lr_scheduler.LambdaLR(
    opt, lambda s: min(1.0, (s + 1) / 100) * 0.5 * (1 + math.cos(math.pi * min(s, steps) / steps)))
loss_fn = nn.CrossEntropyLoss()

for epoch in range(epochs):
    model.train()                                    # BatchNorm uses batch stats, dropout on
    perm = torch.randperm(len(X_train))
    for i in range(0, len(perm), batch):
        idx = perm[i:i + batch]
        loss = loss_fn(model(X_train[idx]), y_train[idx])
        opt.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()
        sched.step()
    model.eval()                                     # BatchNorm uses running stats, dropout off
    with torch.no_grad():
        train_loss = loss_fn(model(X_train), y_train).item()
        val_acc = (model(X_val).argmax(1) == y_val).float().mean().item()
    if epoch % 5 == 4:
        print(f"epoch {epoch + 1}: train loss {train_loss:.3f}  val acc {val_acc:.3f}")   # val acc ≈ 0.88
assert val_acc > 0.8
```

With only 5,000 training examples the same model reaches a training loss of ~0.05 but just ~85% validation accuracy — it starts memorising. Quadrupling the data lifts validation accuracy to ~88%. **More data beats almost every trick in this level.**

## 8. Adam in C++

An optimiser is just a little state per parameter. This drop-in struct works with the C++ network from Level 8:

```cpp
#include <cassert>
#include <cmath>
#include <cstdio>
#include <vector>

struct Adam {
    double lr, beta1, beta2, eps;
    int t = 0;
    std::vector<double> m, v;          // one moment pair per parameter

    Adam(size_t n, double lr_ = 1e-3, double b1 = 0.9, double b2 = 0.999, double e = 1e-8)
        : lr(lr_), beta1(b1), beta2(b2), eps(e), m(n, 0.0), v(n, 0.0) {}

    void step(std::vector<double>& w, const std::vector<double>& g) {
        t++;
        double c1 = 1.0 - std::pow(beta1, t);     // bias corrections
        double c2 = 1.0 - std::pow(beta2, t);
        for (size_t i = 0; i < w.size(); i++) {
            m[i] = beta1 * m[i] + (1.0 - beta1) * g[i];
            v[i] = beta2 * v[i] + (1.0 - beta2) * g[i] * g[i];
            double mHat = m[i] / c1;
            double vHat = v[i] / c2;
            w[i] -= lr * mHat / (std::sqrt(vHat) + eps);
        }
    }
};

int main() {
    // Minimise f(x, y) = (x - 3)^2 + 10 (y + 1)^2, a stretched bowl.
    std::vector<double> w = {0.0, 0.0};
    Adam opt(2, 0.1);
    for (int i = 0; i < 2000; i++) {
        std::vector<double> g = {2.0 * (w[0] - 3.0), 20.0 * (w[1] + 1.0)};
        opt.step(w, g);
    }
    std::printf("minimum found at (%.4f, %.4f)\n", w[0], w[1]);   // (3, -1)
    assert(std::fabs(w[0] - 3.0) < 1e-3 && std::fabs(w[1] + 1.0) < 1e-3);
    return 0;
}
```

## 9. Debugging a network that won't learn

Work through this list **in order** — it finds most bugs in minutes:

1. **Check the initial loss.** For K balanced classes, cross-entropy at initialisation should be ≈ ln K (2.30 for 10 classes). Much higher → bad init or a bug in the loss.
2. **Overfit one small batch.** Train on 32 examples only; loss should reach ~0. If it can't, the model/backprop/optimiser has a bug — more data won't help.
3. **Gradient-check** any custom layer (Levels 2, 8).
4. **Look at the data**: plot a few inputs with their labels after all preprocessing. Shuffled labels and wrong normalisation are common.
5. **Learning rate sweep**: try 1e-1, 1e-2, 1e-3, 1e-4 for a few hundred steps; pick the one where the loss falls fastest without spikes.
6. **Watch train vs validation curves.** Both high → underfitting (bigger model, train longer). Train low, val high → overfitting (more data, augmentation, regularisation, early stopping).
7. **Monitor gradient norms and activations** per layer: zeros everywhere = dead ReLUs or vanishing gradients; huge values = exploding.

```python
import math
import torch
import torch.nn as nn

torch.manual_seed(0)
model = nn.Sequential(nn.Linear(100, 64), nn.ReLU(), nn.Linear(64, 10))
x = torch.randn(32, 100)
y = torch.randint(0, 10, (32,))
loss_fn = nn.CrossEntropyLoss()

# Step 1: initial loss should be close to ln(10) = 2.30
init = loss_fn(model(x), y).item()
print(f"initial loss {init:.3f} (expected ≈ {math.log(10):.3f})")
assert abs(init - math.log(10)) < 0.3

# Step 2: overfit this single batch
opt = torch.optim.Adam(model.parameters(), lr=1e-2)
for step in range(300):
    loss = loss_fn(model(x), y)
    opt.zero_grad()
    loss.backward()
    opt.step()
print(f"loss after overfitting one batch: {loss.item():.5f}")   # ≈ 0 -> the pipeline works
assert loss.item() < 0.01
```

## Checkpoint

- [ ] I can explain why He initialisation uses √(2/n_in) and demonstrate vanishing activations with bad init.
- [ ] I implemented momentum, RMSProp and Adam and can say what each one's state represents.
- [ ] I can explain `model.train()` vs `model.eval()` in terms of BatchNorm and dropout.
- [ ] I know the "check initial loss, overfit one batch" debugging routine.

## Exercises

1. Add **Nesterov momentum** to the optimiser comparison: evaluate the gradient at `p − lr·β·v` (the "look-ahead" point). Does it beat plain momentum on Rosenbrock?
2. Plug your NumPy `Adam` into the MNIST MLP from Level 8 (one Adam per weight array, lr = 1e-3). Compare test accuracy after 2 epochs with plain SGD (lr = 0.1).
3. Add `BatchNorm` between the hidden layer and ReLU of the Level 8 NumPy MLP. Can you now use lr = 0.5?
4. Implement **layer normalisation** (normalise across features for each row) and gradient-check it.
5. Show mathematically that inverted dropout keeps the expected value of each activation unchanged.

:::details Show solution
1. Replace the momentum step with `g = grad(p - lr*beta*v); v = beta*v + g; p = p - lr*v`. On Rosenbrock it reaches a lower f in the same number of steps because it corrects course before overshooting.
2. Typical result: after 2 epochs both reach ~97%; Adam gets there with much less learning-rate tuning. (Adam for weights `W` needs its own `m, v` arrays of the same shape.)
3. Usually yes — BatchNorm makes the loss surface smoother so larger learning rates stay stable, and it reaches the same accuracy in fewer epochs.
4.
```python
import numpy as np
def layernorm(x, g, b, eps=1e-5):
    mu = x.mean(axis=1, keepdims=True)
    var = x.var(axis=1, keepdims=True)
    xh = (x - mu) / np.sqrt(var + eps)
    return g * xh + b, (xh, 1 / np.sqrt(var + eps))
def layernorm_backward(dy, g, cache):
    xh, inv = cache
    D = dy.shape[1]
    dxh = dy * g
    return (inv / D) * (D * dxh - dxh.sum(1, keepdims=True) - xh * (dxh * xh).sum(1, keepdims=True))
rng = np.random.default_rng(0)
x = rng.normal(size=(4, 6))
g = rng.normal(size=6)
b = rng.normal(size=6)
c = rng.normal(size=(4, 6))
y, cache = layernorm(x, g, b)
an = layernorm_backward(c, g, cache)
num = np.zeros_like(x)
h = 1e-6
for i in range(4):
    for j in range(6):
        xp, xm = x.copy(), x.copy()
        xp[i, j] += h
        xm[i, j] -= h
        num[i, j] = (np.sum(c * layernorm(xp, g, b)[0]) - np.sum(c * layernorm(xm, g, b)[0])) / (2 * h)
print(np.abs(an - num).max() < 1e-6)   # True
```
(Same formula as BatchNorm, applied along the other axis.)
5. Each unit is kept with probability 1 − p and then multiplied by 1/(1 − p), otherwise set to 0. E[output] = (1 − p) · x/(1 − p) + p · 0 = x.
:::

## External resources

- **CS231n — "Neural Networks Part 2 & 3"** (cs231n.github.io): initialisation, BatchNorm, dropout, babysitting the learning process.
- **Andrej Karpathy — "A Recipe for Training Neural Networks"** (blog post): the debugging checklist, expanded. Read it twice.
- **Sebastian Ruder — "An overview of gradient descent optimization algorithms"** (ruder.io): every optimiser in one place.
- **Papers:** He et al. 2015 ("Delving Deep into Rectifiers"), Kingma & Ba 2014 ("Adam"), Ioffe & Szegedy 2015 ("Batch Normalization"), Srivastava et al. 2014 ("Dropout"), Loshchilov & Hutter 2019 ("AdamW").
- **Google — "Deep Learning Tuning Playbook"** (github.com/google-research/tuning_playbook): how professionals tune hyper-parameters.
