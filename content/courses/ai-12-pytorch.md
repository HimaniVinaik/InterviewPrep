# Level 12 · PyTorch in Practice (+ LibTorch C++)

> **Key idea:** PyTorch is everything you built in Levels 8–10 — tensors, autograd, layers, optimisers — written in fast C++/CUDA with a Python interface. Because you've built the pieces yourself, nothing here is magic: `loss.backward()` is your Level 9 engine, `nn.Linear` is your Level 8 layer, `torch.optim.Adam` is your Level 10 optimiser.

**Goals of this level**
- Use tensors fluently: shapes, dtypes, devices, views, broadcasting, NumPy interop.
- Understand autograd details: `requires_grad`, gradient accumulation, `no_grad`, `detach`.
- Write models with `nn.Module`, feed them with `Dataset`/`DataLoader`, and use **the standard training loop**.
- Run on a GPU, use mixed precision, save/resume checkpoints.
- **Deploy to C++**: export a model and run it with LibTorch, and train a model directly in the LibTorch C++ API.

## 1. Tensors

A tensor is an n-dimensional array (like a NumPy array) that can live on a GPU and track gradients.

```python
import numpy as np
import torch

a = torch.tensor([[1.0, 2.0], [3.0, 4.0]])     # from data
z = torch.zeros(2, 3)                          # filled with 0
r = torch.randn(4, 5)                          # standard normal
i = torch.arange(6)                            # 0..5

print(a.shape, a.dtype, a.device)              # torch.Size([2, 2]) torch.float32 cpu

# Shape operations
x = torch.arange(12)
print(x.view(3, 4))                            # same memory, new shape (needs contiguous memory)
print(x.reshape(2, 6))                         # like view, copies if it has to
y = torch.randn(2, 3, 4)
print(y.permute(2, 0, 1).shape)                # reorder axes -> (4, 2, 3)
print(y.unsqueeze(0).shape)                    # add an axis -> (1, 2, 3, 4)
print(y.sum(dim=1).shape)                      # reduce an axis -> (2, 4)

# Maths and broadcasting work like NumPy
m = torch.randn(3, 4)
v = torch.randn(4)
print((m @ v).shape, (m + v).shape)            # (3,)  (3, 4)

# NumPy interop: shares memory on the CPU (no copy!)
n = np.ones(3, dtype=np.float32)
t = torch.from_numpy(n)
n[0] = 42.0
print(t)                                       # tensor([42., 1., 1.]) — same buffer
assert t[0].item() == 42.0
```

> **Warning:** the default float type is **float32** (NumPy's is float64). Mixing them, or mixing CPU and GPU tensors, raises errors — check `.dtype` and `.device` first when something fails.

## 2. Autograd in practice

```python
import torch

w = torch.tensor([1.0, -2.0], requires_grad=True)   # "track operations on me"
x = torch.tensor([3.0, 4.0])
loss = ((w * x).sum() - 1.0) ** 2
loss.backward()                                     # fills w.grad
print(w.grad)                                       # 2 * (w·x - 1) * x = 2 * (-6) * [3, 4] = [-36, -48]
assert torch.allclose(w.grad, torch.tensor([-36.0, -48.0]))

# Gradients ACCUMULATE: calling backward again adds to .grad (Level 9).
loss = ((w * x).sum() - 1.0) ** 2
loss.backward()
print(w.grad)                                       # [-72, -96] — doubled!
w.grad.zero_()                                      # what optimizer.zero_grad() does

# No tracking needed for evaluation: saves memory and time.
with torch.no_grad():
    pred = (w * x).sum()
print(pred.requires_grad)                           # False

# detach(): use a value without letting gradients flow back through it.
target = (w * 2).detach()
print(target.requires_grad)                         # False
```

## 3. Models with `nn.Module`

Subclass `nn.Module`, create layers in `__init__`, and describe the computation in `forward`. PyTorch automatically finds all parameters of sub-modules.

```python
import torch
import torch.nn as nn

class MLP(nn.Module):
    def __init__(self, n_in=784, hidden=128, n_out=10):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(n_in, hidden),       # W: (hidden, n_in), b: (hidden,) — like Level 8
            nn.ReLU(),
            nn.Linear(hidden, n_out),
        )

    def forward(self, x):
        return self.net(x.flatten(1))      # (B, 1, 28, 28) -> (B, 784) -> (B, 10) logits

model = MLP()
for name, p in model.named_parameters():
    print(f"{name:14s} {tuple(p.shape)}")
print("total:", sum(p.numel() for p in model.parameters()))      # 101,770

logits = model(torch.randn(32, 1, 28, 28))
print(logits.shape)                                              # (32, 10)

# state_dict: an ordered dict name -> tensor. This is what you save to disk.
print(list(model.state_dict().keys()))
```

## 4. Data: `Dataset` and `DataLoader`

A `Dataset` answers two questions: how many items (`__len__`) and "give me item i" (`__getitem__`). A `DataLoader` shuffles, batches and (optionally) loads in parallel worker processes.

```python
import gzip, os, struct, urllib.request
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader

URL = "https://storage.googleapis.com/cvdf-datasets/mnist/"

class MNIST(Dataset):
    """MNIST from the raw IDX files — the same format you parsed in Level 8."""
    def __init__(self, train=True, root="mnist", augment=False):
        prefix = "train" if train else "t10k"
        os.makedirs(root, exist_ok=True)
        paths = []
        for kind in ("images-idx3", "labels-idx1"):
            name = f"{prefix}-{kind}-ubyte.gz"
            path = os.path.join(root, name)
            if not os.path.exists(path):
                urllib.request.urlretrieve(URL + name, path)
            paths.append(path)
        with gzip.open(paths[0]) as f:
            _, n, r, c = struct.unpack(">IIII", f.read(16))
            self.images = torch.tensor(np.frombuffer(f.read(), np.uint8).reshape(n, 1, r, c).copy())
        with gzip.open(paths[1]) as f:
            f.read(8)
            self.labels = torch.tensor(np.frombuffer(f.read(), np.uint8).astype(np.int64))
        self.augment = augment

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, i):
        x = self.images[i].float() / 255.0
        x = (x - 0.1307) / 0.3081                  # normalise with the dataset mean/std
        if self.augment:                           # tiny random shift = data augmentation
            dx, dy = np.random.randint(-2, 3, size=2)
            x = torch.roll(x, shifts=(int(dy), int(dx)), dims=(1, 2))
        return x, self.labels[i]

train_ds = MNIST(train=True, augment=True)
loader = DataLoader(train_ds, batch_size=64, shuffle=True, num_workers=0)
xb, yb = next(iter(loader))
print(len(train_ds), xb.shape, yb.shape)          # 60000 torch.Size([64, 1, 28, 28]) torch.Size([64])
```

You can also use `torchvision.datasets.MNIST(root, download=True, transform=...)`, and `torchvision.transforms` for augmentation (random crops, flips, colour jitter) — the custom class above just shows there's nothing hidden.

## 5. The standard training loop

Memorise this shape — almost every PyTorch project looks like it:

```python
import gzip, os, struct, urllib.request
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset

def load_mnist(train, root="mnist"):
    URL = "https://storage.googleapis.com/cvdf-datasets/mnist/"
    prefix = "train" if train else "t10k"
    os.makedirs(root, exist_ok=True)
    out = []
    for kind, header in (("images-idx3", 16), ("labels-idx1", 8)):
        name = f"{prefix}-{kind}-ubyte.gz"
        path = os.path.join(root, name)
        if not os.path.exists(path):
            urllib.request.urlretrieve(URL + name, path)
        with gzip.open(path) as f:
            out.append(np.frombuffer(f.read()[header:], np.uint8))
    x = torch.tensor(out[0].reshape(-1, 1, 28, 28).astype(np.float32) / 255.0)
    return TensorDataset((x - 0.1307) / 0.3081, torch.tensor(out[1].astype(np.int64)))

class CNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(), nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(nn.Flatten(), nn.Dropout(0.3), nn.Linear(64 * 7 * 7, 10))

    def forward(self, x):
        return self.classifier(self.features(x))

def train_one_epoch(model, loader, opt, device):
    model.train()                                   # BatchNorm/Dropout in training mode
    total, n = 0.0, 0
    for x, y in loader:
        x, y = x.to(device), y.to(device)           # move the batch to the GPU (if any)
        logits = model(x)                           # 1. forward
        loss = F.cross_entropy(logits, y)           # 2. loss
        opt.zero_grad()                             # 3. clear old gradients
        loss.backward()                             # 4. backprop
        opt.step()                                  # 5. update
        total += loss.item() * len(y)
        n += len(y)
    return total / n

@torch.no_grad()                                    # no graph needed for evaluation
def evaluate(model, loader, device):
    model.eval()                                    # BatchNorm running stats, Dropout off
    correct, n = 0, 0
    for x, y in loader:
        x, y = x.to(device), y.to(device)
        correct += (model(x).argmax(1) == y).sum().item()
        n += len(y)
    return correct / n

device = "cuda" if torch.cuda.is_available() else "cpu"
torch.manual_seed(0)
train_loader = DataLoader(load_mnist(True), batch_size=128, shuffle=True)
test_loader = DataLoader(load_mnist(False), batch_size=1000)

model = CNN().to(device)                            # move the weights to the device
opt = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-4)
sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=2e-3, total_steps=2 * len(train_loader))

best = 0.0
for epoch in range(2):
    model.train()
    for x, y in train_loader:
        x, y = x.to(device), y.to(device)
        loss = F.cross_entropy(model(x), y)
        opt.zero_grad()
        loss.backward()
        opt.step()
        sched.step()                                # OneCycle steps every batch
    acc = evaluate(model, test_loader, device)
    print(f"epoch {epoch + 1}: test accuracy {acc:.4f}")   # ≈ 0.99
    if acc > best:                                  # checkpoint the best model
        best = acc
        torch.save({"model": model.state_dict(), "opt": opt.state_dict(), "epoch": epoch}, "best.pt")

# Resume / reload later:
ckpt = torch.load("best.pt", weights_only=True)
model.load_state_dict(ckpt["model"])
print("reloaded, accuracy", evaluate(model, test_loader, device))
assert best > 0.98

# Export for C++ (section 8): trace the model with an example input.
model.eval()
traced = torch.jit.trace(model.cpu(), torch.randn(1, 1, 28, 28))
traced.save("mnist_cnn.pt")
```

(`train_one_epoch` is the reusable version of the loop body above — in your own projects, call it once per epoch.)

## 6. GPUs, speed and memory

| Tool | What it does |
|---|---|
| `.to("cuda")` | Move tensors/models to the GPU. Model **and** data must be on the same device. |
| `DataLoader(num_workers=4, pin_memory=True)` | Load the next batches in parallel while the GPU computes. |
| `torch.autocast("cuda", dtype=torch.bfloat16)` | **Mixed precision**: run most ops in 16-bit → ~2× faster, half the memory. |
| `torch.compile(model)` | JIT-compiles the model into fused kernels; often 1.3–2× faster. |
| `torch.backends.cudnn.benchmark = True` | Let cuDNN pick the fastest convolution algorithm for your shapes. |
| Gradient accumulation | Simulate a big batch: call `backward()` on k small batches, then one `step()`. |

```python
import torch
import torch.nn as nn

model = nn.Sequential(nn.Linear(512, 512), nn.ReLU(), nn.Linear(512, 10))
opt = torch.optim.AdamW(model.parameters(), lr=1e-3)
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)
amp_dtype = torch.bfloat16                       # bfloat16 needs no loss scaling

accumulate = 4                                   # effective batch = 4 × 32
for step in range(8):
    x = torch.randn(32, 512, device=device)
    y = torch.randint(0, 10, (32,), device=device)
    with torch.autocast(device_type=device, dtype=amp_dtype):
        loss = nn.functional.cross_entropy(model(x), y) / accumulate
    loss.backward()                              # gradients add up across the small batches
    if (step + 1) % accumulate == 0:
        opt.step()
        opt.zero_grad()
print("mixed precision + gradient accumulation ran on", device)
```

## 7. Fine-tuning a pre-trained model (transfer learning)

You rarely train big vision models from scratch. Take a network trained on ImageNet, replace its last layer, and fine-tune on your data — good results with only a few hundred images.

```python
# no-test (downloads ~45 MB of pretrained weights)
import torch.nn as nn
import torchvision

model = torchvision.models.resnet18(weights="IMAGENET1K_V1")    # pretrained backbone
for p in model.parameters():
    p.requires_grad = False                                     # freeze everything...
model.fc = nn.Linear(model.fc.in_features, 5)                   # ...and add a new 5-class head
# Train only model.fc first; later unfreeze the last block with a small learning rate.
```

## 8. Deploying to C++ with LibTorch

**LibTorch** is PyTorch's C++ library (the same engine without Python). Download it from pytorch.org (or use the copy inside your pip install: `python -c "import torch; print(torch.utils.cmake_prefix_path)"`).

The simplest path: **TorchScript**. `torch.jit.trace` (end of section 5) records the operations of one forward pass into `mnist_cnn.pt`, which C++ loads without any Python:

```cpp
// infer.cpp — load the TorchScript model and classify MNIST test images in C++.
#include <torch/script.h>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <vector>

uint32_t readBE(std::ifstream& f) {
    unsigned char b[4];
    f.read(reinterpret_cast<char*>(b), 4);
    return (uint32_t(b[0]) << 24) | (uint32_t(b[1]) << 16) | (uint32_t(b[2]) << 8) | b[3];
}

int main() {
    torch::jit::script::Module model = torch::jit::load("mnist_cnn.pt");
    model.eval();

    // Read the raw (un-gzipped) test files.
    std::ifstream fi("mnist/t10k-images-idx3-ubyte", std::ios::binary);
    std::ifstream fl("mnist/t10k-labels-idx1-ubyte", std::ios::binary);
    readBE(fi);
    uint32_t n = readBE(fi);
    readBE(fi);
    readBE(fi);
    readBE(fl);
    readBE(fl);
    std::vector<uint8_t> pixels(size_t(n) * 28 * 28), labels(n);
    fi.read(reinterpret_cast<char*>(pixels.data()), pixels.size());
    fl.read(reinterpret_cast<char*>(labels.data()), labels.size());

    // Build one (n, 1, 28, 28) float tensor, normalised exactly like in training.
    torch::Tensor x = torch::from_blob(pixels.data(), {int64_t(n), 1, 28, 28}, torch::kUInt8)
                          .to(torch::kFloat32).div(255.0).sub(0.1307).div(0.3081);
    torch::Tensor y = torch::from_blob(labels.data(), {int64_t(n)}, torch::kUInt8).to(torch::kInt64);

    torch::NoGradGuard noGrad;                          // inference only
    std::vector<torch::jit::IValue> inputs{x};
    torch::Tensor logits = model.forward(inputs).toTensor();
    double accuracy = logits.argmax(1).eq(y).to(torch::kFloat32).mean().item<double>();
    std::cout << "C++ inference on " << n << " images: accuracy " << accuracy << "\n";   // same as Python
    return accuracy > 0.98 ? 0 : 1;
}
```

Build it with CMake (the recommended way):

```text
# CMakeLists.txt
cmake_minimum_required(VERSION 3.18)
project(mnist_infer CXX)
find_package(Torch REQUIRED)            # cmake -DCMAKE_PREFIX_PATH=/path/to/libtorch ..
add_executable(infer infer.cpp)
target_link_libraries(infer "${TORCH_LIBRARIES}")
set_property(TARGET infer PROPERTY CXX_STANDARD 20)
```

```bash
mkdir build && cd build
cmake -DCMAKE_PREFIX_PATH=$(python3 -c "import torch; print(torch.utils.cmake_prefix_path)") ..
cmake --build . --config Release
./infer
```

> **Note:** TorchScript still works but is in maintenance mode. For new deployments PyTorch recommends `torch.export` (+ AOTInductor to compile to a shared library) or exporting to **ONNX** and running with ONNX Runtime / TensorRT — covered in Level 17. The C++ side looks very similar.

### Training directly in C++

LibTorch also has a full **C++ frontend** that mirrors the Python API — modules, optimisers, data loaders. Useful when the whole system is C++ (robotics, games, embedded Linux):

```cpp
// train.cpp — train an MLP on MNIST entirely in C++ with LibTorch.
#include <torch/torch.h>
#include <cstdio>

struct NetImpl : torch::nn::Module {
    torch::nn::Linear fc1{nullptr}, fc2{nullptr};

    NetImpl() {
        fc1 = register_module("fc1", torch::nn::Linear(784, 128));   // register so parameters() finds it
        fc2 = register_module("fc2", torch::nn::Linear(128, 10));
    }

    torch::Tensor forward(torch::Tensor x) {
        x = x.view({x.size(0), 784});
        x = torch::relu(fc1->forward(x));
        return fc2->forward(x);                                        // logits
    }
};
TORCH_MODULE(Net);                                                     // creates Net = shared_ptr wrapper

int main() {
    torch::manual_seed(0);
    // Reads the raw IDX files from the "mnist" folder.
    auto train = torch::data::datasets::MNIST("mnist", torch::data::datasets::MNIST::Mode::kTrain)
                     .map(torch::data::transforms::Normalize<>(0.1307, 0.3081))
                     .map(torch::data::transforms::Stack<>());
    auto test = torch::data::datasets::MNIST("mnist", torch::data::datasets::MNIST::Mode::kTest)
                    .map(torch::data::transforms::Normalize<>(0.1307, 0.3081))
                    .map(torch::data::transforms::Stack<>());
    auto trainLoader = torch::data::make_data_loader<torch::data::samplers::RandomSampler>(std::move(train), 128);
    auto testLoader = torch::data::make_data_loader(std::move(test), 1000);

    Net net;
    torch::optim::Adam opt(net->parameters(), torch::optim::AdamOptions(1e-3));

    double accuracy = 0.0;
    for (int epoch = 1; epoch <= 2; epoch++) {
        net->train();
        for (auto& batch : *trainLoader) {
            torch::Tensor loss = torch::nn::functional::cross_entropy(net->forward(batch.data), batch.target);
            opt.zero_grad();
            loss.backward();
            opt.step();
        }
        net->eval();
        torch::NoGradGuard noGrad;
        int64_t correct = 0, total = 0;
        for (auto& batch : *testLoader) {
            correct += net->forward(batch.data).argmax(1).eq(batch.target).sum().item<int64_t>();
            total += batch.target.size(0);
        }
        accuracy = double(correct) / double(total);
        std::printf("epoch %d: test accuracy %.4f\n", epoch, accuracy);   // ≈ 0.965 after 2 epochs
    }
    torch::save(net, "mnist_mlp_cpp.pt");
    return accuracy > 0.95 ? 0 : 1;
}
```

Look how closely it matches the Python: `register_module` ≈ assigning sub-modules in `__init__`, `->forward` ≈ calling the module, `NoGradGuard` ≈ `torch.no_grad()`.

## 9. Habits of effective PyTorch users

- **Set seeds** (`torch.manual_seed`, `np.random.seed`) for reproducible experiments.
- **Print shapes** when anything is confusing: `print(x.shape)` beats an hour of guessing.
- **Start tiny**: overfit one batch (Level 10) before launching a long run.
- **Log everything**: loss, accuracy, learning rate, gradient norm — TensorBoard (`torch.utils.tensorboard`) or Weights & Biases.
- **Don't** call `.item()` or move tensors to the CPU inside the hot loop unnecessarily — it forces the GPU to synchronise.
- Use `model.eval()` + `torch.no_grad()` (or `torch.inference_mode()`) for evaluation, and switch back with `model.train()`.

## Checkpoint

- [ ] I can create, reshape, index and broadcast tensors and move them between CPU and GPU.
- [ ] I can write the standard training loop from memory, including `zero_grad`, `backward`, `step`, `train()`/`eval()`.
- [ ] I can write a custom `Dataset` and use a `DataLoader`.
- [ ] I saved a checkpoint, reloaded it, exported the model, and ran it from C++.

## Exercises

1. Rewrite your Level 8 NumPy MLP in PyTorch **without** `nn.Linear` or `torch.optim`: create the weight tensors yourself with `requires_grad=True` and update them manually inside `torch.no_grad()`.
2. Add a validation split (5,000 images from the training set), early stopping, and a "best model" checkpoint to the section 5 loop.
3. Time one epoch of the CNN with `batch_size` 32, 128 and 512. Why does a bigger batch train faster per epoch but sometimes generalise worse?
4. Implement a custom `nn.Module` for the Level 11 `ResidualBlock` and build a small ResNet for MNIST. Does it beat the plain CNN?
5. In C++, extend `train.cpp` with a convolutional layer (`torch::nn::Conv2d(torch::nn::Conv2dOptions(1, 32, 3).padding(1))`) and max-pooling (`torch::max_pool2d`). What accuracy do you get after 2 epochs?

:::details Show solution
1.
```python
import torch
torch.manual_seed(0)
X = torch.randn(512, 20)
y = (X[:, 0] + X[:, 1] > 0).long()
W1 = (torch.randn(64, 20) * (2 / 20) ** 0.5).requires_grad_()
b1 = torch.zeros(64, requires_grad=True)
W2 = (torch.randn(2, 64) * (2 / 64) ** 0.5).requires_grad_()
b2 = torch.zeros(2, requires_grad=True)
for step in range(300):
    logits = torch.relu(X @ W1.T + b1) @ W2.T + b2
    loss = torch.nn.functional.cross_entropy(logits, y)
    loss.backward()
    with torch.no_grad():                    # updates must not be recorded in the graph
        for p in (W1, b1, W2, b2):
            p -= 0.5 * p.grad
            p.grad.zero_()
print(loss.item())                           # small: the network learned the rule
```
2. `torch.utils.data.random_split(ds, [55000, 5000])`, evaluate on the 5,000 after every epoch, save when it improves, stop after 3 epochs without improvement.
3. Bigger batches use the hardware better (fewer, larger matrix multiplies), so an epoch is faster. But there are fewer update steps per epoch and less gradient noise, which can land in "sharper" minima that generalise slightly worse; people compensate by scaling the learning rate with the batch size and using warm-up.
4. On MNIST a small ResNet reaches ~99.3–99.5%, slightly better than the plain CNN; the benefit grows with depth and on harder datasets like CIFAR-10.
5. With one conv(1→32) + ReLU + 2×2 pool before the linear layers you should reach ~98.5–99% after 2 epochs.
:::

## External resources

- **PyTorch tutorials** (pytorch.org/tutorials): "Learn the Basics", "Deep Learning with PyTorch: A 60 Minute Blitz", "Writing Custom Datasets".
- **PyTorch C++ frontend docs** (pytorch.org/cppdocs) and "Loading a TorchScript Model in C++" tutorial; **pytorch/examples** repo has C++ examples (`cpp/mnist`).
- **Deep Learning with PyTorch** by Stevens, Antiga & Viehmann (free from the PyTorch site).
- **Dive into Deep Learning (d2l.ai)** — every chapter has PyTorch code.
- **Weights & Biases / TensorBoard** guides for experiment tracking.
