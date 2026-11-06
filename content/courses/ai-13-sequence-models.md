# Level 13 · Embeddings, RNNs & LSTMs

> **Key idea:** text, speech and time series are **sequences** — order matters and lengths vary. Two ideas unlock them: **embeddings** turn discrete symbols (words, characters) into learnable vectors, and **recurrent networks** read a sequence one step at a time while carrying a "memory" vector forward. This level builds a character-level language model that writes Shakespeare-like text.

**Goals of this level**
- Turn text into numbers: tokens, vocabularies, one-hot vectors and **embeddings**.
- Build a counting **bigram** language model and understand perplexity.
- Implement a **vanilla RNN** with **backpropagation through time** in NumPy (with gradient check) and in C++.
- Understand **vanishing/exploding gradients**, then use **LSTMs/GRUs** in PyTorch to generate text.

## 1. Text as numbers

**Tokenisation** splits text into units:

| Level | "unbelievable!" becomes | Vocabulary size |
|---|---|---|
| Characters | u, n, b, e, l, i, e, v, a, b, l, e, ! | ~100 |
| Words | unbelievable, ! | 100,000+ (and unknown words) |
| **Subwords (BPE)** | un, believ, able, ! | 30k–100k — what GPT/BERT use |

Each token gets an integer ID. A **one-hot** vector for ID 3 in a vocabulary of 5 is [0, 0, 0, 1, 0]. One-hot vectors are huge and say nothing about meaning — "cat" is as far from "kitten" as from "carburettor".

### Embeddings

An **embedding** is a learnable table E of shape (vocab_size, d): row i is the d-dimensional vector for token i. Looking up a row is mathematically the same as one-hot × E — but much cheaper.

```python
import numpy as np

vocab = ["<pad>", "the", "cat", "sat", "dog"]
V, d = len(vocab), 3
rng = np.random.default_rng(0)
E = rng.normal(size=(V, d))                 # the embedding table (learned in practice)

token = vocab.index("cat")                  # 2
one_hot = np.eye(V)[token]                  # [0 0 1 0 0]
print(np.allclose(one_hot @ E, E[token]))   # True: lookup == one-hot times the matrix

sentence = [vocab.index(w) for w in ["the", "cat", "sat"]]
print(E[sentence].shape)                    # (3, 3): one vector per token
```

During training, embeddings of tokens used in similar contexts end up close together. The famous **word2vec** result: vector("king") − vector("man") + vector("woman") ≈ vector("queen"). Embeddings are the input layer of every language model — including GPT.

## 2. A bigram language model (no neural network yet)

A **language model** predicts the next token given the previous ones. The simplest one only looks at the previous **character**: count how often each pair occurs, and turn the counts into probabilities.

```python
import numpy as np
import os, urllib.request

URL = "https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt"
if not os.path.exists("shakespeare.txt"):
    urllib.request.urlretrieve(URL, "shakespeare.txt")
text = open("shakespeare.txt").read()
chars = sorted(set(text))
V = len(chars)
stoi = {c: i for i, c in enumerate(chars)}
ids = np.array([stoi[c] for c in text])
print(f"{len(text):,} characters, vocabulary of {V}")       # 1,115,394 characters, 65 symbols

split = int(0.9 * len(ids))
train, val = ids[:split], ids[split:]

# Count bigrams: counts[a, b] = how often b follows a
counts = np.ones((V, V))                                    # +1 "smoothing": no zero probabilities
np.add.at(counts, (train[:-1], train[1:]), 1)
P = counts / counts.sum(axis=1, keepdims=True)              # each row sums to 1

nll = -np.mean(np.log(P[val[:-1], val[1:]]))
print(f"validation loss {nll:.3f} nats/char, perplexity {np.exp(nll):.1f}")   # ≈ 2.48, ≈ 12

rng = np.random.default_rng(0)
c = stoi["T"]
out = ["T"]
for _ in range(80):
    c = rng.choice(V, p=P[c])
    out.append(chars[c])
print("".join(out))                         # vaguely English letter patterns, no real words
assert nll < 2.6
```

**Perplexity** = e^(loss) ≈ "how many characters the model is choosing between, on average". Uniform guessing gives 65; the bigram model ≈ 12. A good LSTM gets ≈ 4. The goal of this level is to beat the bigram by giving the model **memory**.

## 3. Recurrent neural networks

An RNN processes one token at a time and keeps a **hidden state** h — a summary of everything seen so far:

```text
hₜ = tanh(W_xh · xₜ + W_hh · hₜ₋₁ + b_h)      new memory from the input and the old memory
yₜ = W_hy · hₜ + b_y                          scores for the next token
pₜ = softmax(yₜ)
```

The **same weights** are used at every time step (like a convolution shares weights across positions). Drawn "unrolled" over time:

```text
x₁      x₂      x₃
│       │       │
▼       ▼       ▼
h₀ ──► h₁ ──► h₂ ──► h₃ ...
        │       │       │
        ▼       ▼       ▼
        y₁      y₂      y₃
```

### Backpropagation through time (BPTT)

Unrolled, an RNN is just a deep network with shared weights — so backprop works. Go backwards through time; at each step the gradient arriving at hₜ comes from two places: the output yₜ **and** the future step hₜ₊₁.

```text
dhₜ = W_hyᵀ · dyₜ + dh_next             (from this step's output and from the future)
dzₜ = dhₜ ⊙ (1 − hₜ²)                   (back through tanh)
dW_xh += dzₜ · xₜᵀ,   dW_hh += dzₜ · hₜ₋₁ᵀ,   db_h += dzₜ
dh_next = W_hhᵀ · dzₜ                   (pass to step t − 1)
```

In practice we **truncate**: unroll for, say, 25–100 steps, backprop, update, then continue from the last hidden state.

```python
import numpy as np

class CharRNN:
    def __init__(self, V, H, seed=0):
        rng = np.random.default_rng(seed)
        self.Wxh = rng.normal(0, 0.01, (H, V))
        self.Whh = rng.normal(0, 0.01, (H, H))
        self.Why = rng.normal(0, 0.01, (V, H))
        self.bh = np.zeros(H)
        self.by = np.zeros(V)
        self.V, self.H = V, H

    def params(self):
        return [self.Wxh, self.Whh, self.Why, self.bh, self.by]

    def loss_and_grads(self, inputs, targets, h_prev):
        """inputs/targets: lists of token ids. Returns loss, gradients, last hidden state."""
        xs, hs, ps = {}, {-1: h_prev}, {}
        loss = 0.0
        for t, (i, tgt) in enumerate(zip(inputs, targets)):          # ---- forward through time
            xs[t] = np.zeros(self.V)
            xs[t][i] = 1.0                                           # one-hot input
            hs[t] = np.tanh(self.Wxh @ xs[t] + self.Whh @ hs[t - 1] + self.bh)
            y = self.Why @ hs[t] + self.by
            ps[t] = np.exp(y - y.max())
            ps[t] /= ps[t].sum()
            loss -= np.log(ps[t][tgt])
        grads = [np.zeros_like(p) for p in self.params()]
        dWxh, dWhh, dWhy, dbh, dby = grads
        dh_next = np.zeros(self.H)
        for t in reversed(range(len(inputs))):                       # ---- backward through time
            dy = ps[t].copy()
            dy[targets[t]] -= 1                                      # softmax + cross-entropy
            dWhy += np.outer(dy, hs[t])
            dby += dy
            dh = self.Why.T @ dy + dh_next                           # from the output AND the future
            dz = dh * (1 - hs[t] ** 2)                               # through tanh
            dWxh += np.outer(dz, xs[t])
            dWhh += np.outer(dz, hs[t - 1])
            dbh += dz
            dh_next = self.Whh.T @ dz
        return loss, grads, hs[len(inputs) - 1]

# ---- gradient check on a tiny model ----
rnn = CharRNN(V=5, H=4, seed=1)
inputs, targets = [0, 1, 2, 3], [1, 2, 3, 4]
h0 = np.zeros(4)
_, grads, _ = rnn.loss_and_grads(inputs, targets, h0)
for p, g in zip(rnn.params(), grads):
    idx = tuple(np.random.default_rng(0).integers(0, s) for s in p.shape)
    old = p[idx]
    p[idx] = old + 1e-5
    lp = rnn.loss_and_grads(inputs, targets, h0)[0]
    p[idx] = old - 1e-5
    lm = rnn.loss_and_grads(inputs, targets, h0)[0]
    p[idx] = old
    assert abs((lp - lm) / 2e-5 - g[idx]) < 1e-6
print("BPTT gradients pass the numerical check")

# ---- train on a short repeating text ----
text = "hello world, hello rnn. " * 20
chars = sorted(set(text))
stoi = {c: i for i, c in enumerate(chars)}
data = [stoi[c] for c in text]
rnn = CharRNN(V=len(chars), H=32)
mem = [np.zeros_like(p) for p in rnn.params()]                      # Adagrad memory
seq, pos, h = 16, 0, np.zeros(32)
for it in range(3000):
    if pos + seq + 1 >= len(data):
        pos, h = 0, np.zeros(32)
    loss, grads, h = rnn.loss_and_grads(data[pos:pos + seq], data[pos + 1:pos + seq + 1], h)
    for p, g, m in zip(rnn.params(), grads, mem):
        np.clip(g, -5, 5, out=g)                                     # gradient clipping (Level 10)
        m += g * g
        p -= 0.1 * g / np.sqrt(m + 1e-8)                             # Adagrad step
    pos += seq
print(f"final loss per char: {loss / seq:.3f}")

# Sample from the trained RNN
h, idx, out = np.zeros(32), stoi["h"], "h"
for _ in range(40):
    x = np.zeros(len(chars)); x[idx] = 1
    h = np.tanh(rnn.Wxh @ x + rnn.Whh @ h + rnn.bh)
    idx = int(np.argmax(rnn.Why @ h + rnn.by))                       # greedy: most likely next char
    out += chars[idx]
print("generated:", out)
assert loss / seq < 0.3
```

## 4. Why vanilla RNNs struggle: vanishing and exploding gradients

The gradient from step T back to step 1 is multiplied by W_hhᵀ and a tanh slope **at every step**. Over 100 steps that's a product of 100 matrices: if their "size" is below 1 the gradient **vanishes** (the RNN can't learn long-range dependencies); above 1 it **explodes**.

```python
import numpy as np

rng = np.random.default_rng(0)
H = 50
for scale in (0.5, 1.0, 1.5):
    W = rng.normal(0, scale / np.sqrt(H), (H, H))      # "size" of W ≈ scale
    g = np.ones(H)
    for _ in range(100):
        g = W.T @ g                                    # backprop through 100 steps (ignoring tanh)
    print(f"scale {scale}: gradient norm after 100 steps = {np.linalg.norm(g):.2e}")
```

Exploding gradients are fixed by **clipping**. Vanishing gradients need a different architecture.

## 5. LSTM and GRU

The **LSTM** (Long Short-Term Memory, 1997) adds a **cell state** c — a conveyor belt that runs through time with only element-wise changes, so information (and gradients) can flow for hundreds of steps. **Gates** (sigmoids between 0 and 1) decide what to forget, what to write and what to output:

```text
fₜ = σ(W_f·[hₜ₋₁, xₜ] + b_f)       forget gate: how much of the old memory to keep
iₜ = σ(W_i·[hₜ₋₁, xₜ] + b_i)       input gate: how much new information to write
gₜ = tanh(W_g·[hₜ₋₁, xₜ] + b_g)    candidate new information
oₜ = σ(W_o·[hₜ₋₁, xₜ] + b_o)       output gate: how much of the memory to reveal

cₜ = fₜ ⊙ cₜ₋₁ + iₜ ⊙ gₜ          update the conveyor belt (addition, not multiplication by W!)
hₜ = oₜ ⊙ tanh(cₜ)
```

Because cₜ = fₜ ⊙ cₜ₋₁ + …, the gradient through the cell is multiplied only by f (close to 1 when the network wants to remember) — not by a weight matrix at every step. This is the same insight as ResNet's skip connections.

The **GRU** (2014) is a simplified LSTM with 2 gates and no separate cell; it often performs similarly with fewer parameters.

```python
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def lstm_step(x, h, c, W, b):
    """One LSTM step. W: (4H, H + D) holds the 4 gates' weights stacked; b: (4H,)."""
    H = h.shape[0]
    z = W @ np.concatenate([h, x]) + b
    f = sigmoid(z[0:H])
    i = sigmoid(z[H:2 * H])
    g = np.tanh(z[2 * H:3 * H])
    o = sigmoid(z[3 * H:4 * H])
    c = f * c + i * g
    h = o * np.tanh(c)
    return h, c

# Compare with PyTorch's LSTMCell (same equations; PyTorch orders gates i, f, g, o).
import torch
torch.manual_seed(0)
D, H = 3, 4
cell = torch.nn.LSTMCell(D, H)
Wi, Wf, Wg, Wo = cell.weight_ih.detach().numpy().reshape(4, H, D)
Ui, Uf, Ug, Uo = cell.weight_hh.detach().numpy().reshape(4, H, H)
bias = (cell.bias_ih + cell.bias_hh).detach().numpy().reshape(4, H)
W = np.vstack([np.hstack([Uf, Wf]), np.hstack([Ui, Wi]), np.hstack([Ug, Wg]), np.hstack([Uo, Wo])])
b = np.concatenate([bias[1], bias[0], bias[2], bias[3]])

x = np.random.default_rng(0).normal(size=D).astype(np.float32)
h0 = np.zeros(H, np.float32)
c0 = np.zeros(H, np.float32)
ours_h, ours_c = lstm_step(x, h0, c0, W, b)
th, tc = cell(torch.tensor(x)[None], (torch.tensor(h0)[None], torch.tensor(c0)[None]))
assert np.allclose(ours_h, th.detach().numpy()[0], atol=1e-6)
print("our LSTM step matches torch.nn.LSTMCell")
```

## 6. A character-level LSTM that writes Shakespeare (PyTorch)

```python
import os, urllib.request
import torch
import torch.nn as nn
import torch.nn.functional as F

URL = "https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt"
if not os.path.exists("shakespeare.txt"):
    urllib.request.urlretrieve(URL, "shakespeare.txt")
text = open("shakespeare.txt").read()
chars = sorted(set(text))
stoi = {c: i for i, c in enumerate(chars)}
data = torch.tensor([stoi[c] for c in text])
n = int(0.9 * len(data))
train_data, val_data = data[:n], data[n:]

class CharLSTM(nn.Module):
    def __init__(self, V, emb=64, hidden=256, layers=2):
        super().__init__()
        self.embed = nn.Embedding(V, emb)                         # token id -> vector
        self.lstm = nn.LSTM(emb, hidden, num_layers=layers, batch_first=True, dropout=0.1)
        self.head = nn.Linear(hidden, V)                          # hidden state -> next-char scores

    def forward(self, idx, state=None):
        out, state = self.lstm(self.embed(idx), state)            # (B, T, hidden)
        return self.head(out), state                              # (B, T, V)

def batch(split, B=32, T=100):
    d = train_data if split == "train" else val_data
    starts = torch.randint(0, len(d) - T - 1, (B,))
    x = torch.stack([d[s:s + T] for s in starts])
    y = torch.stack([d[s + 1:s + T + 1] for s in starts])        # targets = inputs shifted by one
    return x, y

torch.manual_seed(0)
model = CharLSTM(len(chars))
opt = torch.optim.Adam(model.parameters(), lr=3e-3)
for step in range(1500):
    x, y = batch("train")
    logits, _ = model(x)
    loss = F.cross_entropy(logits.reshape(-1, len(chars)), y.reshape(-1))
    opt.zero_grad()
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    opt.step()
    if step % 500 == 0 or step == 1499:
        model.eval()
        with torch.no_grad():
            xv, yv = batch("val", B=64)
            val = F.cross_entropy(model(xv)[0].reshape(-1, len(chars)), yv.reshape(-1)).item()
        model.train()
        print(f"step {step:4d}  train {loss.item():.3f}  val {val:.3f}")   # val ≈ 1.5 at the end (bigram: 2.48)

@torch.no_grad()
def generate(model, start="ROMEO:", n=300, temperature=0.8):
    model.eval()
    idx = torch.tensor([[stoi[c] for c in start]])
    logits, state = model(idx)
    out = start
    for _ in range(n):
        probs = F.softmax(logits[0, -1] / temperature, dim=-1)   # temperature < 1 = more conservative
        nxt = torch.multinomial(probs, 1)
        out += chars[nxt.item()]
        logits, state = model(nxt.view(1, 1), state)              # feed back, keep the memory
    return out

print(generate(model))
assert val < 2.0
```

After a few minutes on a CPU the model invents character names, line breaks and plausible Early-Modern-English-looking words. Training longer (and bigger) gets surprisingly convincing — and this is exactly the "next-token prediction" objective that GPT uses.

**Temperature** divides the logits before softmax: < 1 makes the distribution sharper (safer, more repetitive), > 1 flatter (more creative, more mistakes).

## 7. A vanilla RNN in C++

The same `CharRNN` as section 3 — forward, BPTT, Adagrad and sampling — in plain C++.

```cpp
#include <algorithm>
#include <cassert>
#include <cmath>
#include <cstdio>
#include <map>
#include <random>
#include <string>
#include <vector>

using Vec = std::vector<double>;
using Mat = std::vector<Vec>;     // simple row-major matrix: Mat[r][c]

Mat randMat(int rows, int cols, std::mt19937& rng) {
    std::normal_distribution<double> n(0.0, 0.01);
    Mat m(rows, Vec(cols));
    for (auto& row : m) {
        for (double& v : row) {
            v = n(rng);
        }
    }
    return m;
}

struct RNN {
    int V, H;
    Mat Wxh, Whh, Why;
    Vec bh, by;
    // Adagrad memory
    Mat mWxh, mWhh, mWhy;
    Vec mbh, mby;

    RNN(int v, int h, std::mt19937& rng)
        : V(v), H(h), Wxh(randMat(h, v, rng)), Whh(randMat(h, h, rng)), Why(randMat(v, h, rng)),
          bh(h, 0.0), by(v, 0.0), mWxh(h, Vec(v, 0.0)), mWhh(h, Vec(h, 0.0)), mWhy(v, Vec(h, 0.0)),
          mbh(h, 0.0), mby(v, 0.0) {}

    Vec step(int token, const Vec& hPrev) const {          // h_t = tanh(Wxh[:, token] + Whh h + bh)
        Vec h(H);
        for (int i = 0; i < H; i++) {
            double s = Wxh[i][token] + bh[i];              // one-hot input = pick a column
            for (int j = 0; j < H; j++) {
                s += Whh[i][j] * hPrev[j];
            }
            h[i] = std::tanh(s);
        }
        return h;
    }

    Vec probs(const Vec& h) const {
        Vec y(V);
        double mx = -1e30;
        for (int k = 0; k < V; k++) {
            y[k] = by[k];
            for (int j = 0; j < H; j++) {
                y[k] += Why[k][j] * h[j];
            }
            mx = std::max(mx, y[k]);
        }
        double sum = 0.0;
        for (double& v : y) {
            v = std::exp(v - mx);
            sum += v;
        }
        for (double& v : y) {
            v /= sum;
        }
        return y;
    }

    // One truncated-BPTT update on a chunk. Returns the loss and updates hPrev.
    double train(const std::vector<int>& in, const std::vector<int>& tg, Vec& hPrev, double lr) {
        int T = int(in.size());
        std::vector<Vec> hs(T + 1), ps(T);
        hs[0] = hPrev;                                     // hs[t + 1] is the state after step t
        double loss = 0.0;
        for (int t = 0; t < T; t++) {
            hs[t + 1] = step(in[t], hs[t]);
            ps[t] = probs(hs[t + 1]);
            loss -= std::log(ps[t][tg[t]]);
        }
        Mat dWxh(H, Vec(V, 0.0)), dWhh(H, Vec(H, 0.0)), dWhy(V, Vec(H, 0.0));
        Vec dbh(H, 0.0), dby(V, 0.0), dhNext(H, 0.0);
        for (int t = T - 1; t >= 0; t--) {
            Vec dy = ps[t];
            dy[tg[t]] -= 1.0;
            Vec dh = dhNext;
            for (int k = 0; k < V; k++) {
                dby[k] += dy[k];
                for (int j = 0; j < H; j++) {
                    dWhy[k][j] += dy[k] * hs[t + 1][j];
                    dh[j] += Why[k][j] * dy[k];
                }
            }
            Vec dz(H);
            for (int i = 0; i < H; i++) {
                dz[i] = dh[i] * (1.0 - hs[t + 1][i] * hs[t + 1][i]);   // through tanh
                dbh[i] += dz[i];
                dWxh[i][in[t]] += dz[i];
                for (int j = 0; j < H; j++) {
                    dWhh[i][j] += dz[i] * hs[t][j];
                }
            }
            for (int j = 0; j < H; j++) {
                dhNext[j] = 0.0;
                for (int i = 0; i < H; i++) {
                    dhNext[j] += Whh[i][j] * dz[i];
                }
            }
        }
        auto adagrad = [lr](double& w, double g, double& m) {
            g = std::clamp(g, -5.0, 5.0);                   // gradient clipping
            m += g * g;
            w -= lr * g / std::sqrt(m + 1e-8);
        };
        for (int i = 0; i < H; i++) {
            for (int j = 0; j < V; j++) {
                adagrad(Wxh[i][j], dWxh[i][j], mWxh[i][j]);
            }
            for (int j = 0; j < H; j++) {
                adagrad(Whh[i][j], dWhh[i][j], mWhh[i][j]);
            }
            adagrad(bh[i], dbh[i], mbh[i]);
        }
        for (int k = 0; k < V; k++) {
            for (int j = 0; j < H; j++) {
                adagrad(Why[k][j], dWhy[k][j], mWhy[k][j]);
            }
            adagrad(by[k], dby[k], mby[k]);
        }
        hPrev = hs[T];
        return loss / T;
    }
};

int main() {
    std::string text;
    for (int i = 0; i < 20; i++) {
        text += "hello world, hello rnn. ";
    }
    std::map<char, int> stoi;
    std::vector<char> itos;
    for (char c : text) {
        if (!stoi.count(c)) {
            stoi[c] = int(itos.size());
            itos.push_back(c);
        }
    }
    std::vector<int> data;
    for (char c : text) {
        data.push_back(stoi[c]);
    }

    std::mt19937 rng(0);
    const int H = 32;
    const int seq = 16;
    RNN rnn(int(itos.size()), H, rng);
    Vec h(H, 0.0);
    size_t pos = 0;
    double loss = 0.0;
    for (int it = 0; it < 3000; it++) {
        if (pos + seq + 1 >= data.size()) {
            pos = 0;
            h.assign(H, 0.0);
        }
        std::vector<int> in(data.begin() + pos, data.begin() + pos + seq);
        std::vector<int> tg(data.begin() + pos + 1, data.begin() + pos + seq + 1);
        loss = rnn.train(in, tg, h, 0.1);
        pos += seq;
    }
    std::printf("final loss per char: %.3f\n", loss);

    std::string out = "h";
    Vec state(H, 0.0);
    int tok = stoi['h'];
    for (int i = 0; i < 40; i++) {
        state = rnn.step(tok, state);
        Vec p = rnn.probs(state);
        tok = int(std::max_element(p.begin(), p.end()) - p.begin());
        out += itos[tok];
    }
    std::printf("generated: %s\n", out.c_str());
    assert(loss < 0.3);
    return 0;
}
```

## 8. Where sequence models went next

- **Seq2seq (2014):** an encoder RNN reads a sentence into a vector; a decoder RNN writes the translation.
- **Attention (2015):** let the decoder look back at *every* encoder state instead of one squeezed vector — huge gains in translation.
- **Transformers (2017):** keep the attention, drop the recurrence entirely. Every position looks at every other position in parallel — no sequential bottleneck, much faster on GPUs. That's Level 14, and it's what GPT, BERT and modern LLMs are.

## Checkpoint

- [ ] I can explain why an embedding lookup equals one-hot × matrix, and what makes embeddings useful.
- [ ] I can compute perplexity from a cross-entropy loss and interpret it.
- [ ] I can write the RNN forward equations and explain where the two gradient sources in BPTT come from.
- [ ] I can explain why LSTMs avoid vanishing gradients (the additive cell update).
- [ ] I trained a character-level LSTM and generated text with temperature sampling.

## Exercises

1. Build a **trigram** counting model (previous two characters). Does its validation loss beat the bigram? What goes wrong as you increase the context to 5 characters?
2. In the NumPy `CharRNN`, replace greedy sampling with sampling from the distribution (with temperature). How does the output change at T = 0.5, 1.0, 1.5?
3. Replace `nn.LSTM` with `nn.GRU` in the PyTorch model. Compare parameter counts and validation loss after 1500 steps.
4. Implement the LSTM backward pass for one time step in NumPy and gradient-check it.
5. Train word-level embeddings with a tiny **skip-gram** model (predict neighbouring words from the centre word) on Tiny Shakespeare, then print the 5 nearest neighbours of "king" by cosine similarity.

:::details Show solution
1. Use counts of shape (V, V, V). The trigram's validation loss is lower (~2.1 nats/char vs 2.48). With longer contexts the table grows as V^n and most contexts are never seen in training, so the counts become sparse and the model overfits — the motivation for neural models, which generalise across similar contexts.
2. Replace `argmax` with `rng.choice(V, p=softmax(y / T))`. Low T repeats the most likely patterns; T = 1 samples the learned distribution; high T produces more random, misspelled text.
3. A GRU has 3 gate blocks instead of 4, so ~25% fewer recurrent parameters. On this task the validation loss is usually very similar (within ~0.05).
4. With z = W[h; x] + b split into f, i, g, o: given dh and dc_next, do = dh ⊙ tanh(c), dc = dc_next + dh ⊙ o ⊙ (1 − tanh²(c)), df = dc ⊙ c_prev, di = dc ⊙ g, dg = dc ⊙ i, dc_prev = dc ⊙ f; then multiply by each gate's activation slope (σ(1 − σ) or 1 − g²), stack into dz, and dW = dz [h; x]ᵀ, d[h; x] = Wᵀ dz. Check with finite differences exactly as in section 3.
5. Use `nn.Embedding(V, 100)` for centre words and another for context words, maximise σ(u·v) for real (centre, neighbour) pairs and σ(−u·v) for random "negative" pairs. After a few epochs, neighbours of "king" include words like "queen", "duke", "prince" and "lord".
:::

## External resources

- **Andrej Karpathy — "The Unreasonable Effectiveness of Recurrent Neural Networks"** (blog) and **min-char-rnn.py** (the 100-line NumPy RNN that section 3 follows).
- **Christopher Olah — "Understanding LSTM Networks"** (colah.github.io): the classic visual explanation.
- **CS224n — Natural Language Processing with Deep Learning** (Stanford; YouTube + notes): word vectors, RNNs, LSTMs, attention. The MS-level NLP course.
- **Jay Alammar — "The Illustrated Word2vec"**.
- **Papers:** Hochreiter & Schmidhuber 1997 (LSTM), Mikolov et al. 2013 (word2vec), Cho et al. 2014 (GRU), Bahdanau et al. 2015 (attention).
