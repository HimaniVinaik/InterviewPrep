# Level 14 · Attention & Transformers

> **Key idea:** instead of passing memory along one step at a time (RNNs), let **every token look directly at every other token** and decide how much each one matters. That operation — **attention** — plus a few tricks you already know (residual connections, layer norm, MLPs) is the **transformer**, the architecture behind GPT, BERT, modern translation, image models and LLM assistants.

**Goals of this level**
- Understand **queries, keys and values** and scaled dot-product attention — by hand, in NumPy, and in C++.
- Understand **causal masking**, **multi-head attention** and **positional encodings**.
- Assemble a **transformer block** and train a **tiny GPT** on Shakespeare yourself.
- Implement **BPE tokenisation**, and understand KV caching, sampling, BERT vs GPT, pre-training, fine-tuning and RLHF.

## 1. Attention as a soft dictionary lookup

A Python dict returns the value whose key **exactly** matches your query. Attention returns a **weighted mix of all values**, weighted by how well each key matches the query:

```text
query q:  "what am I looking for?"
keys kⱼ:  "what does token j contain?"
values vⱼ: "what will token j hand over if chosen?"

score_j  = q · kⱼ                       (dot product = similarity, Level 1)
weight_j = softmax(scores)_j            (positive, sum to 1)
output   = Σ_j weight_j · vⱼ
```

Example: in "The animal didn't cross the street because **it** was too tired", the query for "it" should match the key of "animal" strongly, so the output for "it" is mostly the value (meaning) of "animal".

## 2. Scaled dot-product attention

For a sequence of T tokens, each with a d-dimensional vector, stack them into matrices. Every token produces its own query, key and value through learned linear layers:

```text
Q = X W_Q,   K = X W_K,   V = X W_V           X: (T, d_model)   Q, K: (T, d_k)   V: (T, d_v)

Attention(Q, K, V) = softmax( Q Kᵀ / √d_k ) · V
                              (T, T)              (T, d_v)
```

- `Q Kᵀ` is a (T, T) table: entry (i, j) = how much token i wants to attend to token j.
- **Why divide by √d_k?** A dot product of two random d_k-dimensional vectors has variance d_k. Without scaling, large d_k makes scores huge, the softmax becomes almost one-hot, and its gradients vanish. Dividing by √d_k keeps the variance at 1.

### Causal masking (for generating text)

A language model predicting token t must not peek at tokens after t. Set those scores to −∞ before the softmax, so their weights become 0:

```text
scores (T = 4) after masking:     weights after softmax:
s₁₁  −∞   −∞   −∞                1     0     0     0
s₂₁  s₂₂  −∞   −∞                ·     ·     0     0
s₃₁  s₃₂  s₃₃  −∞                ·     ·     ·     0
s₄₁  s₄₂  s₄₃  s₄₄               ·     ·     ·     ·     (each row sums to 1)
```

```python
import numpy as np

def softmax(z, axis=-1):
    z = z - z.max(axis=axis, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)

def attention(Q, K, V, causal=False):
    d_k = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d_k)                          # (T, T)
    if causal:
        T = scores.shape[0]
        mask = np.triu(np.ones((T, T), dtype=bool), k=1)     # True above the diagonal = the future
        scores = np.where(mask, -np.inf, scores)
    weights = softmax(scores, axis=-1)                        # each row sums to 1
    return weights @ V, weights

# Tiny worked example: 3 tokens, d_k = 2
Q = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
K = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
V = np.array([[10.0, 0.0], [0.0, 10.0], [5.0, 5.0]])
out, w = attention(Q, K, V)
print("weights:\n", w.round(3))
print("outputs:\n", out.round(3))

out_c, w_c = attention(Q, K, V, causal=True)
print("causal weights:\n", w_c.round(3))
assert np.allclose(w_c.sum(axis=1), 1) and w_c[0, 1] == 0 and w_c[0, 2] == 0 and w_c[1, 2] == 0

# Check against PyTorch's fused implementation
import torch
import torch.nn.functional as F
t = lambda a: torch.tensor(a, dtype=torch.float64)
ref = F.scaled_dot_product_attention(t(Q)[None], t(K)[None], t(V)[None], is_causal=True)[0]
assert np.allclose(out_c, ref.numpy())
print("matches torch.nn.functional.scaled_dot_product_attention")
```

## 3. Multi-head attention

One attention "head" can only focus on one kind of relationship at a time. **Multi-head attention** runs h heads in parallel, each with its own smaller W_Q, W_K, W_V (d_k = d_model / h), then concatenates their outputs and mixes them with one more linear layer W_O:

```text
head_i = Attention(X W_Q⁽ⁱ⁾, X W_K⁽ⁱ⁾, X W_V⁽ⁱ⁾)
MultiHead(X) = concat(head_1, …, head_h) · W_O
```

Different heads learn different jobs: one tracks the previous word, one links pronouns to nouns, one follows syntax, and so on. Same compute as a single big head, more flexibility.

## 4. Positional information

Attention is a weighted **sum** — it has no idea of order (shuffle the tokens and each output just moves with its token). We must add position information to the inputs:

| Method | Idea | Used by |
|---|---|---|
| Learned positional embeddings | A table pos → vector, added to the token embedding | GPT-2, BERT |
| Sinusoidal encodings | Fixed sin/cos waves of different frequencies | the original Transformer |
| **RoPE** (rotary) | Rotate q and k by an angle proportional to position | LLaMA, most modern LLMs |

```python
import numpy as np

def sinusoidal(T, d):
    pos = np.arange(T)[:, None]
    i = np.arange(d // 2)[None, :]
    angles = pos / (10000 ** (2 * i / d))
    pe = np.zeros((T, d))
    pe[:, 0::2] = np.sin(angles)        # even dimensions
    pe[:, 1::2] = np.cos(angles)        # odd dimensions
    return pe

pe = sinusoidal(50, 16)
print(pe.shape)                          # (50, 16): one vector per position, added to the token embeddings
# Nearby positions have similar encodings; far-apart ones less so:
print(round(pe[10] @ pe[11], 2), round(pe[10] @ pe[40], 2))
```

## 5. The transformer block

A GPT-style ("decoder-only") block — notice how many pieces you've already built:

```text
x ─► LayerNorm ─► Multi-Head Causal Attention ─► (+) ─► LayerNorm ─► MLP (Linear → GELU → Linear) ─► (+) ─► out
│                                                 ▲    │                                              ▲
└─────────────────────────────────────────────────┘    └──────────────────────────────────────────────┘
              residual connection (Level 11)                         residual connection
```

- **Attention** lets tokens exchange information ("communication").
- **The MLP** (applied to each position separately, usually 4× wider) processes it ("computation").
- **Residual connections** keep gradients flowing through dozens of layers.
- **LayerNorm** (Level 10) before each sub-layer ("pre-norm") stabilises training.

A full GPT = token embedding + position embedding → N blocks → final LayerNorm → linear layer to vocabulary logits. GPT-2 small: 12 blocks, 12 heads, d_model = 768 → 124M parameters. Same design, just bigger.

## 6. Train your own tiny GPT

A character-level GPT on Tiny Shakespeare, written out fully (in the spirit of Karpathy's nanoGPT):

```python
import math, os, urllib.request
import torch
import torch.nn as nn
import torch.nn.functional as F

URL = "https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt"
if not os.path.exists("shakespeare.txt"):
    urllib.request.urlretrieve(URL, "shakespeare.txt")
text = open("shakespeare.txt").read()
chars = sorted(set(text))
V = len(chars)
stoi = {c: i for i, c in enumerate(chars)}
data = torch.tensor([stoi[c] for c in text])
n = int(0.9 * len(data))
train_data, val_data = data[:n], data[n:]

block_size, d_model, n_heads, n_layers = 128, 128, 4, 4

class CausalSelfAttention(nn.Module):
    def __init__(self):
        super().__init__()
        self.qkv = nn.Linear(d_model, 3 * d_model)       # Q, K, V for all heads in one matmul
        self.proj = nn.Linear(d_model, d_model)          # W_O
        self.drop = nn.Dropout(0.1)

    def forward(self, x):
        B, T, C = x.shape
        q, k, v = self.qkv(x).split(C, dim=2)
        # (B, T, C) -> (B, heads, T, head_dim): each head attends independently
        q = q.view(B, T, n_heads, C // n_heads).transpose(1, 2)
        k = k.view(B, T, n_heads, C // n_heads).transpose(1, 2)
        v = v.view(B, T, n_heads, C // n_heads).transpose(1, 2)
        att = (q @ k.transpose(-2, -1)) / math.sqrt(C // n_heads)          # (B, h, T, T)
        mask = torch.triu(torch.ones(T, T, dtype=torch.bool, device=x.device), diagonal=1)
        att = att.masked_fill(mask, float("-inf"))                         # causal: no peeking ahead
        att = self.drop(F.softmax(att, dim=-1))
        y = (att @ v).transpose(1, 2).reshape(B, T, C)                     # concatenate the heads
        return self.proj(y)

class Block(nn.Module):
    def __init__(self):
        super().__init__()
        self.ln1 = nn.LayerNorm(d_model)
        self.attn = CausalSelfAttention()
        self.ln2 = nn.LayerNorm(d_model)
        self.mlp = nn.Sequential(nn.Linear(d_model, 4 * d_model), nn.GELU(),
                                 nn.Linear(4 * d_model, d_model), nn.Dropout(0.1))

    def forward(self, x):
        x = x + self.attn(self.ln1(x))         # communicate (+ residual)
        x = x + self.mlp(self.ln2(x))          # compute     (+ residual)
        return x

class TinyGPT(nn.Module):
    def __init__(self):
        super().__init__()
        self.tok = nn.Embedding(V, d_model)
        self.pos = nn.Embedding(block_size, d_model)     # learned positions
        self.blocks = nn.Sequential(*[Block() for _ in range(n_layers)])
        self.ln_f = nn.LayerNorm(d_model)
        self.head = nn.Linear(d_model, V)

    def forward(self, idx):
        B, T = idx.shape
        x = self.tok(idx) + self.pos(torch.arange(T, device=idx.device))
        return self.head(self.ln_f(self.blocks(x)))     # (B, T, V) next-token logits

    @torch.no_grad()
    def generate(self, idx, n, temperature=0.8, top_k=20):
        for _ in range(n):
            logits = self(idx[:, -block_size:])[:, -1, :] / temperature
            if top_k:
                kth = torch.topk(logits, top_k).values[:, -1, None]
                logits = logits.masked_fill(logits < kth, float("-inf"))   # keep only the top-k
            nxt = torch.multinomial(F.softmax(logits, dim=-1), 1)
            idx = torch.cat([idx, nxt], dim=1)
        return idx

def get_batch(split, B=32):
    d = train_data if split == "train" else val_data
    ix = torch.randint(0, len(d) - block_size - 1, (B,))
    x = torch.stack([d[i:i + block_size] for i in ix])
    y = torch.stack([d[i + 1:i + block_size + 1] for i in ix])
    return x, y

torch.manual_seed(0)
model = TinyGPT()
print(f"parameters: {sum(p.numel() for p in model.parameters()) / 1e6:.2f}M")   # ≈ 0.83M
opt = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.1)
steps = 1500
sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=1e-3, total_steps=steps, pct_start=0.1)

for step in range(steps):
    x, y = get_batch("train")
    loss = F.cross_entropy(model(x).view(-1, V), y.view(-1))
    opt.zero_grad(set_to_none=True)
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    opt.step()
    sched.step()
    if step % 500 == 0 or step == steps - 1:
        model.eval()
        with torch.no_grad():
            val = sum(F.cross_entropy(model(xv).view(-1, V), yv.view(-1)).item()
                      for xv, yv in (get_batch("val") for _ in range(5))) / 5
        model.train()
        print(f"step {step:4d}  train {loss.item():.3f}  val {val:.3f}")   # val ≈ 1.84 after 1500 steps

model.eval()
start = torch.tensor([[stoi[c] for c in "ROMEO:\n"]])
print("".join(chars[i] for i in model.generate(start, 300)[0].tolist()))
assert val < 2.0
```

On a laptop CPU this trains in about five minutes (validation loss ≈ 1.84) and already produces Shakespeare-shaped dialogue.

**An honest comparison:** with the same tiny budget, Level 13's LSTM reached 1.52 — better! Transformers have weaker built-in assumptions about sequences, so they need more training steps and data to shine; their advantage is that they **scale**: every position is processed in parallel, so they use GPUs far better and keep improving as you make them bigger. Scale this model to 6 layers, d_model = 384, block_size = 256 and train ~30 minutes on a GPU, and the validation loss drops to about 1.5 and below, with noticeably better text.

> **Key:** this ~100-line model contains every essential idea of ChatGPT-scale models. The differences are scale (billions of parameters, trillions of tokens), subword tokenisation, engineering (distributed training, mixed precision, FlashAttention) — and post-training (section 9).

## 7. Attention in C++

Scaled dot-product attention with a causal mask, from scratch:

```cpp
#include <cassert>
#include <cmath>
#include <cstdio>
#include <limits>
#include <vector>

using Mat = std::vector<std::vector<double>>;

// out = softmax(Q K^T / sqrt(d)) V, optionally masking the future.
Mat attention(const Mat& Q, const Mat& K, const Mat& V, bool causal, Mat* weightsOut = nullptr) {
    size_t T = Q.size();
    size_t d = Q[0].size();
    size_t dv = V[0].size();
    Mat weights(T, std::vector<double>(T, 0.0));
    Mat out(T, std::vector<double>(dv, 0.0));
    const double scale = 1.0 / std::sqrt(double(d));
    for (size_t i = 0; i < T; i++) {
        // 1. scores for query i
        double maxScore = -std::numeric_limits<double>::infinity();
        for (size_t j = 0; j < T; j++) {
            if (causal && j > i) {
                weights[i][j] = -std::numeric_limits<double>::infinity();   // the future: masked
                continue;
            }
            double s = 0.0;
            for (size_t c = 0; c < d; c++) {
                s += Q[i][c] * K[j][c];
            }
            weights[i][j] = s * scale;
            maxScore = std::max(maxScore, weights[i][j]);
        }
        // 2. softmax over the row (exp(-inf) = 0 handles the mask)
        double sum = 0.0;
        for (size_t j = 0; j < T; j++) {
            weights[i][j] = std::exp(weights[i][j] - maxScore);
            sum += weights[i][j];
        }
        for (size_t j = 0; j < T; j++) {
            weights[i][j] /= sum;
        }
        // 3. weighted sum of values
        for (size_t j = 0; j < T; j++) {
            for (size_t c = 0; c < dv; c++) {
                out[i][c] += weights[i][j] * V[j][c];
            }
        }
    }
    if (weightsOut) {
        *weightsOut = weights;
    }
    return out;
}

int main() {
    Mat Q = {{1, 0}, {0, 1}, {1, 1}};
    Mat K = {{1, 0}, {0, 1}, {1, 1}};
    Mat V = {{10, 0}, {0, 10}, {5, 5}};
    Mat w;
    Mat out = attention(Q, K, V, true, &w);
    for (size_t i = 0; i < out.size(); i++) {
        std::printf("token %zu: weights [%.3f %.3f %.3f]  output [%.3f %.3f]\n",
                    i, w[i][0], w[i][1], w[i][2], out[i][0], out[i][1]);
    }
    assert(w[0][1] == 0.0 && w[0][2] == 0.0 && w[1][2] == 0.0);   // nothing attends to the future
    assert(std::fabs(out[0][0] - 10.0) < 1e-12);                 // token 0 can only see itself
    return 0;
}
```

Attention costs **O(T²·d)** time and O(T²) memory for the score table — the reason long context windows are expensive, and the motivation for FlashAttention (computes it in tiles without storing the full T×T table) and other efficient-attention research.

## 8. Tokenisation with Byte-Pair Encoding (BPE)

Real LLMs don't use characters (sequences too long) or whole words (vocabulary too big). **BPE** starts from bytes/characters and repeatedly **merges the most frequent adjacent pair** into a new token:

```python
from collections import Counter

def train_bpe(text, num_merges):
    tokens = list(text)                                   # start from characters
    merges = []
    for _ in range(num_merges):
        pairs = Counter(zip(tokens, tokens[1:]))
        if not pairs:
            break
        best = max(pairs, key=pairs.get)                  # most frequent adjacent pair
        merges.append(best)
        merged, i = [], 0
        while i < len(tokens):
            if i + 1 < len(tokens) and (tokens[i], tokens[i + 1]) == best:
                merged.append(tokens[i] + tokens[i + 1])  # replace the pair by one token
                i += 2
            else:
                merged.append(tokens[i])
                i += 1
        tokens = merged
    return merges, tokens

def encode(text, merges):
    tokens = list(text)
    for a, b in merges:                                   # apply merges in the learned order
        out, i = [], 0
        while i < len(tokens):
            if i + 1 < len(tokens) and tokens[i] == a and tokens[i + 1] == b:
                out.append(a + b)
                i += 2
            else:
                out.append(tokens[i])
                i += 1
        tokens = out
    return tokens

corpus = "low lower lowest newer newest wider widest " * 50
merges, toks = train_bpe(corpus, 12)
print("first merges:", merges[:6])
print("encoded 'lowest newest':", encode("lowest newest", merges))
print(f"{len(corpus)} characters -> {len(toks)} tokens")
assert "".join(encode("lowest newest", merges)) == "lowest newest"
```

Frequent pieces such as "st", "lowe" and "newe" quickly become single tokens, while rare words split into known pieces — so there are no unknown words. GPT-2's tokenizer has 50,257 tokens; GPT-4-class tokenizers ~100k–200k.

## 9. From tiny GPT to LLM assistants

| Concept | What it means |
|---|---|
| **Decoder-only (GPT)** | Causal attention; trained to predict the next token. Generates text. |
| **Encoder-only (BERT)** | Bidirectional attention; trained to fill in masked words. Great for classification/search embeddings. |
| **Encoder–decoder (T5, original Transformer)** | Encoder reads the input, decoder writes the output with **cross-attention** to it. Translation, summarisation. |
| **Pre-training** | Next-token prediction on trillions of tokens of text/code. Learns language and knowledge. |
| **Scaling laws** | Loss falls smoothly and predictably as parameters, data and compute grow (Kaplan 2020, Chinchilla 2022). |
| **Supervised fine-tuning (SFT)** | Continue training on examples of good assistant answers. |
| **RLHF / RLAIF / DPO** | Fine-tune so preferred answers become more likely, using human or AI preference comparisons (Level 16 has the RL basics). |
| **KV cache** | When generating, cache each layer's K and V for past tokens so each new token costs O(T) instead of recomputing everything. |
| **LoRA** | Fine-tune large models cheaply by learning small low-rank updates W + AB instead of changing W. |
| **RAG** | Retrieval-Augmented Generation: fetch relevant documents (via embedding similarity) and put them in the prompt. |
| **Sampling** | Temperature, top-k, top-p (nucleus) control the creativity of generation. |

## Checkpoint

- [ ] I can compute attention by hand for 2–3 tokens and explain the role of Q, K, V.
- [ ] I can explain the √d_k scaling and causal masking.
- [ ] I can draw a transformer block and say what each part is for.
- [ ] I trained a tiny GPT and generated text from it.
- [ ] I can explain BPE, KV caching, and the difference between GPT and BERT.

## Exercises

1. In the NumPy example, compute the first row of the **non-causal** attention weights by hand and check against the printout.
2. Replace the manual attention in `CausalSelfAttention` with `F.scaled_dot_product_attention(q, k, v, is_causal=True)`. Same results? How much faster?
3. Remove the positional embedding from TinyGPT and retrain. What happens to the validation loss, and why?
4. Implement a **KV cache** in `generate`: keep K and V of past tokens per layer and only compute q, k, v for the newest token. Verify the generated text is identical to the uncached version with the same seed.
5. Train TinyGPT on BPE tokens (from section 8, with ~200 merges) instead of characters. Compare validation loss **per character** (convert: loss_per_token × tokens / characters).
6. Read the "Attention Is All You Need" paper (section 3) and map every equation to a line of TinyGPT.

:::details Show solution
1. Row 0: q₀ = [1, 0]. Scores q₀·kⱼ/√2 = [1, 0, 1]/1.414 = [0.707, 0, 0.707]. Softmax: e^0.707 ≈ 2.028, e^0 = 1 → weights ≈ [2.028, 1, 2.028]/5.056 ≈ **[0.401, 0.198, 0.401]**.
2. Yes (up to floating-point noise; dropout must be handled with `dropout_p`). On a GPU the fused kernel (FlashAttention) is much faster and uses far less memory for long sequences.
3. The loss gets noticeably worse: without positions, attention can't tell "the cat ate the fish" from "the fish ate the cat" — every token only sees an unordered bag of the previous tokens (the causal mask leaks a little order information, so it doesn't collapse completely).
4. Store `past_k, past_v` per block; on each new token compute k, v for that token only, concatenate with the cache along the time axis, and attend with the single new query (no mask needed: the cache only contains the past). The tokens produced are identical; per-step cost drops from O(T²) to O(T).
5. BPE sequences are shorter, so the model sees more text per context window; per-character loss is usually similar or slightly better for the same model size and training time.
6. Equation (1) = the `att` computation; multi-head = the `view/transpose` into heads and the `proj`; the position-wise FFN = `self.mlp`; residual + LayerNorm = the `x = x + ...(ln(x))` lines (GPT uses pre-norm instead of the paper's post-norm).
:::

## External resources

- **Andrej Karpathy — "Let's build GPT: from scratch, in code, spelled out"** (YouTube, 2 h) and **nanoGPT** (github.com/karpathy/nanoGPT); also "Let's build the GPT Tokenizer".
- **Jay Alammar — "The Illustrated Transformer"** and **"The Illustrated GPT-2"**.
- **Vaswani et al. 2017 — "Attention Is All You Need"**; **The Annotated Transformer** (Harvard NLP) walks through it line by line in PyTorch.
- **3Blue1Brown — "Attention in transformers, visually explained"** (Neural Networks, chapters 5–6).
- **CS224n** (Stanford) lectures on self-attention and transformers; **Hugging Face LLM Course** (huggingface.co/learn) for using real pretrained models.
- **Papers to read next:** Radford et al. 2019 (GPT-2), Devlin et al. 2019 (BERT), Hoffmann et al. 2022 (Chinchilla), Ouyang et al. 2022 (InstructGPT/RLHF), Dao et al. 2022 (FlashAttention), Hu et al. 2021 (LoRA).
