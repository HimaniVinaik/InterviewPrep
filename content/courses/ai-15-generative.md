# Level 15 · Generative Models

> **Key idea:** a classifier learns P(label | image). A **generative model** learns the data itself — P(image) — well enough to **create new examples** that look real. Four families dominate: **autoencoders/VAEs** (compress and decode), **GANs** (a forger vs a detective), **autoregressive models** (predict the next piece — your GPT from Level 14), and **diffusion models** (learn to remove noise), which power today's image generators.

**Goals of this level**
- Build an **autoencoder** and see what a learned "latent space" is.
- Understand and train a **VAE**: the reparameterisation trick and the KL term, explained simply.
- Train a **GAN** and understand why GAN training is unstable.
- Understand **diffusion** from first principles and train a small one yourself.

## 1. What does "learning the data distribution" mean?

Think of all 28×28 images: almost all are random noise. Real handwritten digits occupy a tiny, structured region of that space. A generative model learns **where that region is**, so it can draw new points from it.

| Family | How it generates | Strengths | Weaknesses |
|---|---|---|---|
| VAE | decode a random latent vector | fast, smooth latent space | blurry samples |
| GAN | generator maps noise → image | very sharp samples, fast | unstable training, mode collapse |
| Autoregressive | one token/pixel at a time | exact likelihood, best for text | slow sequential sampling |
| **Diffusion** | start from noise, denoise step by step | top image quality, stable training | many steps (slower sampling) |

## 2. Autoencoders

An **autoencoder** squeezes the input through a narrow **bottleneck** and tries to reconstruct it:

```text
x (784) ──encoder──► z (e.g. 8 numbers) ──decoder──► x̂ (784)       loss = ‖x − x̂‖²
```

To reconstruct well through 8 numbers, z must capture the essence of the digit (which digit, slant, thickness). z is the **latent code** and the space of all z is the **latent space**.

```python
import gzip, os, struct, urllib.request
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

def mnist(train=True):
    URL = "https://storage.googleapis.com/cvdf-datasets/mnist/"
    name = ("train" if train else "t10k") + "-images-idx3-ubyte.gz"
    os.makedirs("mnist", exist_ok=True)
    path = os.path.join("mnist", name)
    if not os.path.exists(path):
        urllib.request.urlretrieve(URL + name, path)
    with gzip.open(path) as f:
        f.read(16)
        return torch.tensor(np.frombuffer(f.read(), np.uint8).reshape(-1, 784).astype(np.float32) / 255.0)

def show(img, threshold=0.5):
    """Print a 28x28 image as text art."""
    rows = img.reshape(28, 28)
    for r in range(0, 28, 2):                                  # every 2nd row keeps the aspect ratio
        print("".join("#" if v > threshold else ("+" if v > 0.25 else " ") for v in rows[r]))

X = mnist()
torch.manual_seed(0)
encoder = nn.Sequential(nn.Linear(784, 256), nn.ReLU(), nn.Linear(256, 8))
decoder = nn.Sequential(nn.Linear(8, 256), nn.ReLU(), nn.Linear(256, 784), nn.Sigmoid())
opt = torch.optim.Adam(list(encoder.parameters()) + list(decoder.parameters()), lr=1e-3)

for epoch in range(3):
    perm = torch.randperm(len(X))
    for i in range(0, len(X), 128):
        x = X[perm[i:i + 128]]
        loss = F.mse_loss(decoder(encoder(x)), x)
        opt.zero_grad()
        loss.backward()
        opt.step()
    print(f"epoch {epoch + 1}: reconstruction MSE {loss.item():.4f}")

with torch.no_grad():
    x = mnist(train=False)[:1]
    print("original:")
    show(x[0])
    print("reconstructed from just 8 numbers:")
    show(decoder(encoder(x))[0])
assert loss.item() < 0.03
```

Autoencoders are used for compression, denoising (train with noisy inputs, clean targets) and anomaly detection (unusual inputs reconstruct badly). But a plain autoencoder is a poor *generator*: random points in its latent space often decode to garbage, because nothing forces the codes to fill the space nicely. VAEs fix that.

## 3. Variational Autoencoders (VAEs)

A VAE's encoder outputs a **distribution** for z — a mean μ and a standard deviation σ for each latent dimension — instead of a single point. Training has two goals:

1. **Reconstruct** the input from a z sampled from that distribution.
2. Keep every encoded distribution **close to a standard normal N(0, 1)** — measured by the **KL divergence** (Level 3).

Goal 2 packs all the codes into one smooth "cloud" around the origin, so **any** sample z ~ N(0, 1) decodes to something sensible.

```text
loss = reconstruction loss + KL( N(μ, σ²) ‖ N(0, 1) )

KL for one dimension = ½ (μ² + σ² − 1 − log σ²)       (0 when μ = 0, σ = 1)
```

### The reparameterisation trick

Sampling is random — you can't backpropagate through "pick a random number". The trick: sample noise ε ~ N(0, 1) separately and compute

```text
z = μ + σ · ε
```

Now z is a normal function of μ and σ (ε is just a fixed input), so gradients flow to the encoder.

```python
import numpy as np

# Check the KL formula numerically: KL(N(mu, s^2) || N(0,1)) = E_q[log q(z) - log p(z)]
rng = np.random.default_rng(0)
mu, s = 1.5, 0.5
z = mu + s * rng.normal(size=2_000_000)                       # reparameterised samples
log_q = -0.5 * np.log(2 * np.pi * s ** 2) - (z - mu) ** 2 / (2 * s ** 2)
log_p = -0.5 * np.log(2 * np.pi) - z ** 2 / 2
monte_carlo = np.mean(log_q - log_p)
closed_form = 0.5 * (mu ** 2 + s ** 2 - 1 - np.log(s ** 2))
print(f"KL: Monte Carlo {monte_carlo:.4f}  closed form {closed_form:.4f}")   # both ≈ 1.443
assert abs(monte_carlo - closed_form) < 0.01
```

```python
import gzip, os, urllib.request
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

def mnist():
    URL = "https://storage.googleapis.com/cvdf-datasets/mnist/train-images-idx3-ubyte.gz"
    os.makedirs("mnist", exist_ok=True)
    path = "mnist/train-images-idx3-ubyte.gz"
    if not os.path.exists(path):
        urllib.request.urlretrieve(URL, path)
    with gzip.open(path) as f:
        f.read(16)
        return torch.tensor(np.frombuffer(f.read(), np.uint8).reshape(-1, 784).astype(np.float32) / 255.0)

class VAE(nn.Module):
    def __init__(self, latent=16):
        super().__init__()
        self.enc = nn.Sequential(nn.Linear(784, 400), nn.ReLU())
        self.mu = nn.Linear(400, latent)
        self.logvar = nn.Linear(400, latent)           # predict log σ² (any real number, stable)
        self.dec = nn.Sequential(nn.Linear(latent, 400), nn.ReLU(), nn.Linear(400, 784))

    def forward(self, x):
        h = self.enc(x)
        mu, logvar = self.mu(h), self.logvar(h)
        eps = torch.randn_like(mu)
        z = mu + torch.exp(0.5 * logvar) * eps         # reparameterisation trick
        return self.dec(z), mu, logvar

def vae_loss(logits, x, mu, logvar):
    recon = F.binary_cross_entropy_with_logits(logits, x, reduction="sum")      # pixels as Bernoulli
    kl = 0.5 * torch.sum(mu ** 2 + logvar.exp() - 1 - logvar)                  # the KL formula above
    return (recon + kl) / len(x), kl / len(x)

X = mnist()
torch.manual_seed(0)
vae = VAE()
opt = torch.optim.Adam(vae.parameters(), lr=1e-3)
for epoch in range(5):
    perm = torch.randperm(len(X))
    for i in range(0, len(X), 128):
        x = X[perm[i:i + 128]]
        logits, mu, logvar = vae(x)
        loss, kl = vae_loss(logits, x, mu, logvar)
        opt.zero_grad()
        loss.backward()
        opt.step()
    print(f"epoch {epoch + 1}: loss {loss.item():.1f}  (KL part {kl.item():.1f})")

# Generate brand-new digits: sample z ~ N(0, I) and decode.
with torch.no_grad():
    samples = torch.sigmoid(vae.dec(torch.randn(3, 16)))
for img in samples:
    rows = img.reshape(28, 28)
    for r in range(0, 28, 2):
        print("".join("#" if v > 0.5 else ("+" if v > 0.25 else " ") for v in rows[r]))
    print("-" * 28)
assert loss.item() < 120
```

The printed samples are new digits that never appeared in the training set. Walking in a straight line between two latent codes smoothly morphs one digit into another — a sign the latent space is well organised.

## 4. Generative Adversarial Networks (GANs)

Two networks play a game:

- the **generator** G turns random noise z into a fake sample G(z) — a forger;
- the **discriminator** D outputs the probability that its input is real — a detective.

```text
D's loss: −[ log D(real) + log(1 − D(G(z))) ]     (classify real as 1, fake as 0)
G's loss: −log D(G(z))                            (make D call the fakes real)
```

They improve together until the fakes are indistinguishable from the data. Watch it work on a 2-D toy problem: the real data is 8 small clusters on a circle.

```python
import math
import torch
import torch.nn as nn

torch.manual_seed(0)

def real_batch(n):
    k = torch.randint(0, 8, (n,))
    angle = k.float() * (2 * math.pi / 8)
    centres = torch.stack([torch.cos(angle), torch.sin(angle)], dim=1) * 2.0
    return centres + 0.05 * torch.randn(n, 2)

G = nn.Sequential(nn.Linear(2, 128), nn.ReLU(), nn.Linear(128, 128), nn.ReLU(), nn.Linear(128, 2))
D = nn.Sequential(nn.Linear(2, 128), nn.LeakyReLU(0.2), nn.Linear(128, 128), nn.LeakyReLU(0.2), nn.Linear(128, 1))
optG = torch.optim.Adam(G.parameters(), lr=1e-3, betas=(0.5, 0.999))
optD = torch.optim.Adam(D.parameters(), lr=1e-3, betas=(0.5, 0.999))
bce = nn.BCEWithLogitsLoss()
ones, zeros = torch.ones(256, 1), torch.zeros(256, 1)

for step in range(4000):
    # 1. Train the detective on real (label 1) and fake (label 0) samples.
    fake = G(torch.randn(256, 2)).detach()          # detach: don't update G in this step
    lossD = bce(D(real_batch(256)), ones) + bce(D(fake), zeros)
    optD.zero_grad()
    lossD.backward()
    optD.step()
    # 2. Train the forger to fool the detective.
    lossG = bce(D(G(torch.randn(256, 2))), ones)
    optG.zero_grad()
    lossG.backward()
    optG.step()

with torch.no_grad():
    samples = G(torch.randn(4000, 2))
radius = samples.norm(dim=1)
angles = torch.atan2(samples[:, 1], samples[:, 0])
modes = torch.round(angles / (2 * math.pi / 8)).long() % 8
covered = len(torch.unique(modes[(radius - 2).abs() < 0.3]))
print(f"mean radius {radius.mean():.2f} (real: 2.00), clusters covered: {covered}/8")
assert (radius.mean() - 2).abs() < 0.3
```

**Why GANs are hard to train:**
- It's a two-player game, not a single loss going down — training can oscillate.
- **Mode collapse:** the generator finds a few outputs that fool D and only produces those (e.g. only 3 of the 8 clusters). Run the code with different seeds and watch "clusters covered" vary.
- Remedies: Wasserstein loss with gradient penalty (WGAN-GP), spectral normalisation, careful architectures (DCGAN, StyleGAN).

## 5. Diffusion models

Diffusion is the idea behind Stable Diffusion, DALL·E 3, Midjourney and Sora-style video models. Two processes:

**Forward (fixed, no learning):** gradually add Gaussian noise to a real sample over T steps until it's pure noise. With a noise schedule β₁…β_T and ᾱₜ = Π(1 − βₛ), you can jump to any step directly:

```text
xₜ = √ᾱₜ · x₀ + √(1 − ᾱₜ) · ε,      ε ~ N(0, I)
```

**Reverse (learned):** train a network ε_θ(xₜ, t) to **predict the noise** ε that was added. The loss is a plain MSE:

```text
loss = ‖ ε − ε_θ(√ᾱₜ x₀ + √(1 − ᾱₜ) ε, t) ‖²
```

To **generate**, start from pure noise x_T and repeatedly remove a little of the predicted noise:

```text
xₜ₋₁ = 1/√(1 − βₜ) · ( xₜ − βₜ/√(1 − ᾱₜ) · ε_θ(xₜ, t) ) + √βₜ · z
```

Why it works: denoising a *slightly* noisy image is an easy, well-defined regression problem — and chaining many easy steps turns noise into data. Training is stable (just MSE), unlike GANs.

```python
import math
import torch
import torch.nn as nn

torch.manual_seed(0)

def two_moons(n):
    t = torch.rand(n) * math.pi
    upper = torch.stack([torch.cos(t), torch.sin(t)], 1)
    lower = torch.stack([1 - torch.cos(t), 0.5 - torch.sin(t)], 1)
    pts = torch.where(torch.rand(n, 1) < 0.5, upper, lower)
    return (pts - torch.tensor([0.5, 0.25])) * 1.5 + 0.03 * torch.randn(n, 2)

T = 100
betas = torch.linspace(1e-4, 0.05, T)
alphas = 1 - betas
alpha_bar = torch.cumprod(alphas, dim=0)

class Denoiser(nn.Module):
    """Predicts the noise in x_t, given x_t and the step t."""
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(2 + 16, 128), nn.SiLU(), nn.Linear(128, 128), nn.SiLU(),
                                 nn.Linear(128, 128), nn.SiLU(), nn.Linear(128, 2))

    def forward(self, x, t):
        freqs = torch.exp(torch.arange(8) * -0.7)                 # sinusoidal embedding of t (Level 14)
        ang = t[:, None].float() * freqs[None]
        return self.net(torch.cat([x, torch.sin(ang), torch.cos(ang)], dim=1))

model = Denoiser()
opt = torch.optim.Adam(model.parameters(), lr=2e-3)
for step in range(3000):
    x0 = two_moons(512)
    t = torch.randint(0, T, (512,))
    eps = torch.randn_like(x0)
    ab = alpha_bar[t][:, None]
    xt = ab.sqrt() * x0 + (1 - ab).sqrt() * eps                    # forward process, one jump
    loss = ((model(xt, t) - eps) ** 2).mean()                       # predict the noise
    opt.zero_grad()
    loss.backward()
    opt.step()
print(f"final denoising loss {loss.item():.3f}")

@torch.no_grad()
def sample(n):
    x = torch.randn(n, 2)                                           # start from pure noise
    for t in reversed(range(T)):
        tt = torch.full((n,), t)
        eps = model(x, tt)
        x = (x - betas[t] / (1 - alpha_bar[t]).sqrt() * eps) / alphas[t].sqrt()
        if t > 0:
            x = x + betas[t].sqrt() * torch.randn_like(x)           # keep some randomness
    return x

gen = sample(2000)
real = two_moons(2000)
# Nearest-neighbour distance from each generated point to the real data: small = on the moons
d = torch.cdist(gen, real).min(dim=1).values
print(f"median distance to real data {d.median():.3f} (pure noise scores ≈ 0.29)")
assert d.median() < 0.15
```

Image diffusion models are exactly this, with a big U-Net or transformer instead of a small MLP, images instead of 2-D points, and **conditioning** (a text embedding fed to the denoiser) so you can ask for "a cat in a spacesuit". **Latent diffusion** (Stable Diffusion) runs the process in the latent space of an autoencoder to save compute.

## 6. Forward diffusion in C++

The forward process is simple enough to write anywhere. This checks the closed form numerically: after many noising steps the sample mean and variance match √ᾱₜ·x₀ and 1 − ᾱₜ.

```cpp
#include <cassert>
#include <cmath>
#include <cstdio>
#include <random>
#include <vector>

int main() {
    const int T = 100;
    std::vector<double> beta(T), alphaBar(T);
    double prod = 1.0;
    for (int t = 0; t < T; t++) {
        beta[t] = 1e-4 + (0.05 - 1e-4) * t / (T - 1);   // linear schedule
        prod *= 1.0 - beta[t];
        alphaBar[t] = prod;
    }

    // Noise x0 = 1.5 step by step, many times, and compare with the closed form.
    std::mt19937 rng(0);
    std::normal_distribution<double> n01(0.0, 1.0);
    const int trials = 200000;
    const int tCheck = 49;
    double sum = 0.0;
    double sumSq = 0.0;
    for (int k = 0; k < trials; k++) {
        double x = 1.5;
        for (int t = 0; t <= tCheck; t++) {
            x = std::sqrt(1.0 - beta[t]) * x + std::sqrt(beta[t]) * n01(rng);   // one small noising step
        }
        sum += x;
        sumSq += x * x;
    }
    double mean = sum / trials;
    double var = sumSq / trials - mean * mean;
    double expectMean = std::sqrt(alphaBar[tCheck]) * 1.5;
    double expectVar = 1.0 - alphaBar[tCheck];
    std::printf("t=%d: mean %.4f (closed form %.4f), variance %.4f (closed form %.4f)\n",
                tCheck, mean, expectMean, var, expectVar);
    assert(std::fabs(mean - expectMean) < 0.01 && std::fabs(var - expectVar) < 0.01);
    return 0;
}
```

## Checkpoint

- [ ] I can explain the difference between a discriminative and a generative model.
- [ ] I can explain what a latent space is, and why a VAE's KL term makes it good for sampling.
- [ ] I can write down the reparameterisation trick and explain why it's needed.
- [ ] I can describe GAN training as a game and name two of its failure modes.
- [ ] I can explain diffusion's forward and reverse processes and why the training loss is just MSE on noise.

## Exercises

1. Train the autoencoder with a **2-D** latent space. Encode the test set and print the average (z₁, z₂) per digit class. Are the classes separated?
2. In the VAE, multiply the KL term by β = 4 ("β-VAE"). What happens to reconstruction quality and to the smoothness of samples?
3. Make the GAN produce **only** the clusters in the right half of the circle by changing the real data. Then add 4 more clusters and see whether mode collapse gets worse.
4. In the diffusion code, change T to 20 and then 300. How does sample quality change? What's the trade-off?
5. Make the diffusion model **conditional**: give it a label (upper moon = 0, lower = 1) as an extra input, then generate only the upper moon. (This is how text-to-image conditioning works.)

:::details Show solution
1. With 2 latent numbers the reconstructions get blurrier, but class means are clearly spread out — e.g. 0s and 1s far apart, 4/9 and 3/5/8 overlapping — because the autoencoder discovers digit identity as the most useful thing to encode, without ever seeing labels.
2. A larger β pushes the codes closer to N(0, 1): reconstructions get blurrier but random samples look more consistently digit-like and latent dimensions become more "disentangled" (one dimension ≈ slant, another ≈ thickness).
3. Choose angles only in (−π/2, π/2]. With 12 clusters, coverage typically drops — mode collapse is more visible when there are more modes to cover.
4. Fewer steps → each denoising jump is bigger and harder, so samples are noisier/off the moons; more steps → better samples but proportionally slower generation. Modern samplers (DDIM, DPM-Solver) get good results in 20–50 steps.
5. Concatenate a learned embedding (or just the 0/1 value) of the label to the network input; during training pass the true label of each x₀ (track which moon it came from); when sampling pass label 0. A common extra trick is **classifier-free guidance**: train with the label dropped 10% of the time, then extrapolate ε = ε_uncond + w·(ε_cond − ε_uncond) with w > 1 for stronger conditioning.
:::

## External resources

- **Lilian Weng's blog** (lilianweng.github.io): "From Autoencoder to Beta-VAE", "From GAN to WGAN", "What are Diffusion Models?" — clear, MS-level summaries with maths.
- **Kingma & Welling 2013** ("Auto-Encoding Variational Bayes"), **Goodfellow et al. 2014** ("Generative Adversarial Nets"), **Ho et al. 2020** ("Denoising Diffusion Probabilistic Models"), **Rombach et al. 2022** ("Latent Diffusion / Stable Diffusion").
- **Hugging Face Diffusion Models Course** (huggingface.co/learn) and the `diffusers` library.
- **Stanford CS236 — Deep Generative Models** (lecture notes at deepgenerativemodels.github.io): the MS course on this topic.
- **Understanding Deep Learning** by Simon Prince (free PDF at udlbook.github.io): excellent chapters on VAEs, GANs, normalising flows and diffusion.
