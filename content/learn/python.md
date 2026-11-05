# Python for C++ Developers

Python is the glue of tooling, test automation, data analysis and AI. Many interviews allow it, and embedded teams use it for test rigs, build scripts and log analysis. This guide maps your C++ intuition onto Python 3.12+.

## 1. Mental model shifts

| C++ | Python |
|---|---|
| static types checked at compile time | dynamic types; optional type hints checked by tools (mypy, pyright) |
| variables are storage | **names bound to objects** (everything is a reference to an object) |
| value semantics by default | reference semantics; assignment never copies |
| RAII / destructors | garbage collection (refcount + cycle GC) + **context managers** (`with`) |
| compiled to machine code | bytecode interpreted by CPython (3.13 adds an experimental JIT and a free-threaded build) |
| templates | duck typing + `typing.Protocol` / generics |
| `int` is 32/64-bit | `int` is arbitrary precision (no overflow!) |

```python
a = [1, 2, 3]
b = a            # same list object — like a reference
b.append(4)
print(a)         # [1, 2, 3, 4]
c = a.copy()     # shallow copy (copy.deepcopy for nested)
print(a is b, a == c)   # True True  — `is` = identity, `==` = equality
```

**Mutable default argument trap:**

```python
def add(item, bucket=[]):      # ❌ one list shared across calls
    bucket.append(item); return bucket
def add(item, bucket=None):    # ✅
    if bucket is None: bucket = []
    bucket.append(item); return bucket
```

## 2. Core types & complexity

| Type | C++ analogue | Notes |
|---|---|---|
| `list` | `std::vector` | append O(1) amortised; insert/pop(0) O(n) |
| `tuple` | `std::tuple` (immutable) | hashable if contents are |
| `dict` | `std::unordered_map` | insertion-ordered (3.7+), avg O(1) |
| `set` / `frozenset` | `std::unordered_set` | |
| `collections.deque` | `std::deque` | O(1) at both ends — use for BFS queues |
| `heapq` (on a list) | `priority_queue` | **min**-heap; negate for max-heap |
| `collections.Counter` | `unordered_map<T,int>` | frequency counting |
| `collections.defaultdict` | `map[k]` default-insert | |
| `bisect` | `lower_bound` / `upper_bound` | on sorted lists |
| `str` | `std::string` (immutable!) | build with `''.join(parts)`, not `+=` in loops |
| `bytes` / `bytearray` | `std::vector<uint8_t>` | binary protocols |

## 3. Idioms (Pythonic code)

```python
# Comprehensions
squares = [x * x for x in range(10) if x % 2 == 0]
index = {name: i for i, name in enumerate(names)}
unique = {w.lower() for w in words}

# Unpacking
a, b = b, a                          # swap
first, *rest = [1, 2, 3, 4]
for i, (k, v) in enumerate(d.items()): ...
for x, y in zip(xs, ys): ...

# Slicing
s[::-1]          # reversed copy
arr[2:5]         # elements 2,3,4
arr[-1]          # last

# Truthiness: empty containers, 0, None, "" are falsy
if not items: ...

# Ternary and walrus
label = "even" if n % 2 == 0 else "odd"
while (chunk := f.read(4096)): process(chunk)

# Sorting with keys (stable)
people.sort(key=lambda p: (p.dept, -p.salary))
top3 = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:3]

# any / all / sum / min / max with generators (lazy)
has_neg = any(x < 0 for x in nums)
total = sum(len(w) for w in words)
```

## 4. Functions, closures, decorators

```python
def connect(host: str, port: int = 8080, *, timeout: float = 5.0, **opts) -> "Connection":
    ...                                  # `*` makes timeout keyword-only

from functools import lru_cache, wraps
import time

@lru_cache(maxsize=None)                 # memoisation in one line — great for DP
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)

def timed(fn):                           # a decorator is a function wrapping a function
    @wraps(fn)
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            print(f"{fn.__name__} took {time.perf_counter() - t0:.3f}s")
    return wrapper

@timed
def work(): ...
```

## 5. Classes & the data model

```python
from dataclasses import dataclass, field

@dataclass(frozen=True, slots=True)      # auto __init__, __repr__, __eq__, immutable, compact
class Sample:
    sensor_id: int
    value: float
    tags: tuple[str, ...] = ()

class RingBuffer:
    def __init__(self, capacity: int):
        self._buf = [None] * capacity
        self._head = self._size = 0

    def push(self, x) -> None:
        cap = len(self._buf)
        self._buf[(self._head + self._size) % cap] = x
        if self._size < cap: self._size += 1
        else: self._head = (self._head + 1) % cap

    def __len__(self) -> int: return self._size                      # len(rb)
    def __iter__(self):                                               # for x in rb
        cap = len(self._buf)
        for i in range(self._size): yield self._buf[(self._head + i) % cap]
    def __repr__(self) -> str: return f"RingBuffer({list(self)})"
```

Dunder methods = operator overloading: `__eq__`, `__lt__`, `__hash__`, `__add__`, `__getitem__`, `__enter__`/`__exit__`, `__call__`. "Private" is a convention (`_name`); `__name` triggers name mangling.

## 6. Resource management: context managers (Python's RAII)

```python
with open("log.txt", encoding="utf-8") as f:     # file closed even on exceptions
    for line in f: ...

from contextlib import contextmanager
@contextmanager
def critical_section(lock):
    lock.acquire()
    try: yield
    finally: lock.release()
```

## 7. Generators & iterators

```python
def read_frames(port):                  # lazy, constant memory — like a C++ coroutine generator
    buf = bytearray()
    while chunk := port.read(64):
        buf += chunk
        while (end := buf.find(b"\n")) != -1:
            yield bytes(buf[:end]); del buf[:end + 1]

import itertools
itertools.islice(gen, 10); itertools.chain(a, b); itertools.product(range(3), repeat=2)
itertools.permutations(xs); itertools.combinations(xs, 2); itertools.accumulate(xs)
```

## 8. Type hints (modern)

```python
from typing import Protocol, Iterable

def mean(xs: Iterable[float]) -> float: ...
def lookup(d: dict[str, int], key: str) -> int | None: ...    # 3.10+ union syntax

class Transport(Protocol):              # structural typing ≈ a C++20 concept
    def write(self, data: bytes) -> int: ...

def first[T](xs: list[T]) -> T:         # 3.12 generic syntax
    return xs[0]
```

Run `mypy` or `pyright` in CI; hints don't affect runtime.

## 9. Error handling

```python
try:
    value = int(text)
except ValueError as e:
    log.warning("bad input %r: %s", text, e)
    raise ConfigError("invalid port") from e     # chain exceptions
else:
    use(value)                                    # only if no exception
finally:
    cleanup()
```

EAFP ("easier to ask forgiveness than permission") is idiomatic: try and catch rather than pre-checking.

## 10. Concurrency

- The **GIL** (global interpreter lock) lets only one thread run Python bytecode at a time in standard CPython → threads help for **I/O-bound** work, not CPU-bound. (Python 3.13+ offers an experimental free-threaded build without the GIL.)
- CPU-bound: `multiprocessing` / `concurrent.futures.ProcessPoolExecutor`, or push work into NumPy/C extensions which release the GIL.
- Async I/O: `asyncio` with `async`/`await` — single-threaded cooperative concurrency (great for many sockets).

```python
from concurrent.futures import ThreadPoolExecutor
with ThreadPoolExecutor(max_workers=8) as ex:
    results = list(ex.map(fetch, urls))

import asyncio
async def main():
    results = await asyncio.gather(*(fetch_async(u) for u in urls))
asyncio.run(main())
```

## 11. Python for embedded/tooling work

```python
import struct
# Parse a little-endian packet: uint8 type, uint16 length, float32 value
ptype, length, value = struct.unpack_from("<BHf", payload, 0)
packet = struct.pack("<BHf", 1, 4, 21.5)

import serial                                   # pyserial
with serial.Serial("/dev/ttyUSB0", 115200, timeout=1) as port:
    port.write(b"PING\n"); print(port.readline())

int.from_bytes(b"\x01\x02", "big")              # 258
(0xDEADBEEF).to_bytes(4, "little")
crc = binascii.crc32(data)                      # import binascii
```

Also: `ctypes`/`cffi` to call C libraries, **pybind11/nanobind** to expose C++ to Python, `pytest` for hardware-in-the-loop test rigs, `numpy`/`pandas`/`matplotlib` for log analysis, `click`/`argparse` for CLIs.

## 12. Interview-ready Python snippets

```python
from collections import Counter, defaultdict, deque
import heapq, bisect

def top_k(nums, k): return [x for x, _ in Counter(nums).most_common(k)]

def bfs(adj, src):
    dist = {src: 0}; q = deque([src])
    while q:
        u = q.popleft()
        for v in adj[u]:
            if v not in dist: dist[v] = dist[u] + 1; q.append(v)
    return dist

def dijkstra(adj, src):                       # adj: {u: [(v, w), ...]}
    dist = {src: 0}; pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float("inf")): continue
        for v, w in adj[u]:
            if d + w < dist.get(v, float("inf")):
                dist[v] = d + w; heapq.heappush(pq, (d + w, v))
    return dist

i = bisect.bisect_left(sorted_list, target)   # lower_bound
```

## 13. Tooling

`uv` or `pip` + `venv` for environments, `ruff` (lint + format), `mypy`/`pyright` (types), `pytest` (tests), `pyproject.toml` for configuration.

## Interview Q&A

- **List vs tuple?** Mutable vs immutable (tuples are hashable → dict keys).
- **What's the GIL?** A mutex in CPython allowing one thread to execute bytecode at a time; limits CPU-bound threading.
- **How is memory managed?** Reference counting (immediate frees) plus a cyclic garbage collector.
- **`is` vs `==`?** Identity vs value equality. Use `is` only for `None`/sentinels.
- **What's a generator?** A function with `yield` that produces values lazily and keeps its state between calls.
- **Shallow vs deep copy?** Copy the container only vs recursively copy contained objects.
