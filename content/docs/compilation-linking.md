# Compilation & Linking

> **Key idea:** A C++ build is a pipeline: **preprocess → compile → assemble → link**. The compiler only ever sees **one translation unit** (a `.cpp` file plus everything it `#include`s). It turns that TU into an object file full of machine code, a list of **symbols it defines**, and a list of **symbols it needs**. The **linker** then stitches the object files and libraries together by matching those needs to definitions. Almost every confusing build error comes from this split: "undefined reference", "multiple definition", a library listed in the wrong order, a C/C++ name-mangling mismatch, or an ODR violation that links fine and misbehaves at run time.

**What you'll be able to do after this guide**
- Explain each build stage, run them one at a time, and inspect what each produces.
- Separate declarations from definitions, and apply the One Definition Rule (ODR) correctly to functions, variables, classes, templates and `inline`.
- Choose between internal, external and no linkage (`static`, anonymous namespaces, `inline`, `extern`).
- Read symbol tables with `nm`, demangle with `c++filt`, and fix `undefined reference` / `multiple definition` errors fast.
- Mix C and C++ with `extern "C"`.
- Build and use static and shared libraries, and understand link order, `rpath`, symbol visibility and LTO.
- Explain how an embedded image is laid out: linker scripts, `.text`/`.data`/`.bss`, the startup code, and the static initialisation order fiasco.

---

## 1. The four stages

```text
 main.cpp ──preprocess──► main.i ──compile──► main.s ──assemble──► main.o ─┐
 util.cpp ──────────────────────────────────────────────────────► util.o ─┼─link──► app
                                       libutil.a / libm.so / libc.so.6 ───┘
```

| Stage | Tool | Input → output | What it does |
|---|---|---|---|
| Preprocess | `cpp` (`g++ -E`) | `.cpp` → `.i` | textual: pastes `#include`s, expands macros, evaluates `#if`, strips comments |
| Compile | `cc1plus` (`g++ -S`) | `.i` → `.s` | parses C++, type-checks, instantiates templates, optimises, emits assembly |
| Assemble | `as` (`g++ -c`) | `.s` → `.o` | machine code + symbol table + relocations |
| Link | `ld` / `lld` / `gold` / `mold` | `.o` + libs → executable | resolves symbols, merges sections, applies relocations, adds start-up code |

```bash
g++ -E main.cpp -o main.i      # 1. preprocess only (this tiny main.cpp became 1060 lines because of <cstdio>)
```

```bash
g++ -S main.i -o main.s        # 2. compile to assembly
```

```bash
g++ -c main.s -o main.o        # 3. assemble to an object file
```

```bash
g++ main.o util.o -o app       # 4. link
```

```bash
g++ -c main.cpp                # what you normally do: stages 1-3 in one command
```

```bash
g++ -v main.cpp -o app         # print every sub-command the driver runs (cc1plus, as, collect2/ld)
```

```bash
g++ -save-temps -c main.cpp    # keep main.ii and main.s next to main.o
```

### 1.1 Translation units and why headers exist

Each TU is compiled **independently**. While compiling `main.cpp`, the compiler cannot see the code in `util.cpp`. To call `add` it only needs a **declaration** (name, parameter types, return type). It then emits a reference to an "undefined" symbol and leaves the linker to find the definition. Headers are just a way to paste the *same* declarations into every TU that needs them.

The example project used in the rest of this guide:

```cpp
// no-test (three files: util.h, util.cpp, main.cpp)
// ---- util.h ----
#pragma once
int add(int a, int b);
double add(double a, double b);
extern int g_calls;                  // declaration: "this int exists somewhere"

// ---- util.cpp ----
#include "util.h"
int g_calls = 0;                     // definition: storage lives here
static int helper(int x) { return x; }      // internal linkage: invisible to other TUs
int add(int a, int b) { ++g_calls; return helper(a) + b; }
double add(double a, double b) { ++g_calls; return a + b; }

// ---- main.cpp ----
#include <cstdio>
#include "util.h"
int main() {
    std::printf("%d %.1f calls=%d\n", add(2, 3), add(1.5, 2.0), g_calls);
}
```

Running `./app` printed `5 3.5 calls=0`, not `calls=2`. The order in which function arguments are evaluated is **unspecified**, and GCC read `g_calls` before making the two `add` calls. It's a reminder from the *Undefined Behavior* guide: don't read and modify the same variable within one argument list.

---

## 2. Object files and symbols

An object file (ELF on Linux, COFF/PE on Windows, Mach-O on macOS) contains **sections** (`.text` code, `.data` initialised globals, `.bss` zero-initialised globals, `.rodata` constants), a **symbol table**, and **relocations** ("patch this call's address once you know where `add` lives").

Here is the real `nm` output for the project above (GCC 13, x86-64):

```text
$ nm -C util.o                      $ nm util.o  (raw, mangled)
0000000000000042 T add(double, double)   0000000000000042 T _Z3adddd
0000000000000010 T add(int, int)         0000000000000010 T _Z3addii
0000000000000000 t helper(int)           0000000000000000 t _ZL6helperi
0000000000000000 B g_calls               0000000000000000 B g_calls

$ nm -C main.o
                 U add(double, double)
                 U add(int, int)
                 U g_calls
0000000000000000 T main
                 U printf
```

| Letter | Meaning |
|---|---|
| `T` / `t` | defined in `.text` (code). Upper case = global (external linkage), lower case = local (internal) |
| `D` / `d` | defined in `.data` (initialised data) |
| `B` / `b` | defined in `.bss` (zero-initialised data) |
| `R` / `r` | read-only data (`.rodata`) |
| `U` | **undefined**: this file needs it, and someone else must define it |
| `W` / `V` | weak symbol (inline functions, template instantiations); duplicates allowed |
| `u` | unique global (GNU extension used for `inline` variables / static locals in inline functions) |

Linking `main.o` alone shows exactly the `U` symbols that nobody defined:

```text
$ g++ main.o -o app
/usr/bin/ld: main.o: in function `main':
main.cpp:(.text+0xe): undefined reference to `g_calls'
main.cpp:(.text+0x2b): undefined reference to `add(double, double)'
main.cpp:(.text+0x3f): undefined reference to `add(int, int)'
collect2: error: ld returned 1 exit status
```

---

## 3. Declarations, definitions and the One Definition Rule

| Thing | Declaration (may repeat) | Definition (exactly one, unless inline-like) |
|---|---|---|
| function | `int add(int, int);` | `int add(int a, int b) { return a + b; }` |
| global variable | `extern int g;` | `int g = 0;` or `int g;` |
| class | `struct Point;` (forward declaration) | `struct Point { int x, y; };` |
| static data member | inside the class: `static int count;` | in one `.cpp`: `int Widget::count = 0;` (or `inline static int count = 0;`) |
| template | `template <class T> T twice(T);` | `template <class T> T twice(T x) { return 2 * x; }` |

**The One Definition Rule:**
1. Within one TU, nothing may be defined twice. Header guards prevent the "included twice" case.
2. In the whole program, every **non-inline** function and variable that is used must be defined **exactly once**.
3. Classes, enums, `inline` functions and variables, templates and `constexpr` functions may be defined in **several** TUs, but every definition must be **token-for-token identical** and mean the same thing. If they differ, the program is ill-formed with **no diagnostic required**: it links, and then behaves strangely.

### 3.1 "multiple definition": a definition in a header

```cpp
// no-test (config.h included by a.cpp and b.cpp)
int counter = 0;          // a DEFINITION in a header: each TU that includes it defines `counter`
```

```text
$ g++ a.cpp b.cpp -o x
/usr/bin/ld: /tmp/cc2s6erO.o:(.bss+0x0): multiple definition of `counter'; /tmp/ccd8JFPV.o:(.bss+0x0): first defined here
collect2: error: ld returned 1 exit status
```

There are four ways to fix it:

| Fix | Effect |
|---|---|
| `extern int counter;` in the header and `int counter = 0;` in **one** `.cpp` | one shared variable (the classic way) |
| `inline int counter = 0;` (C++17) | one shared variable, defined in the header |
| `constexpr int kLimit = 10;` / `const int kLimit = 10;` | constants have internal linkage at namespace scope: one private copy per TU (fine for constants) |
| `static int counter = 0;` or an anonymous namespace | a **separate** variable in each TU (rarely what you want for mutable state) |

The same rules apply to functions. A function *defined* in a header must be `inline`, a template, `constexpr`, or a member defined inside its class body (those are implicitly inline).

### 3.2 Silent ODR violations

```cpp
// no-test (two TUs, two different definitions of the same inline function)
// a.cpp
inline int bufferSize() { return 64; }
int sizeA() { return bufferSize(); }

// b.cpp
inline int bufferSize() { return 4096; }   // same name, different body: ODR violation
int sizeB() { return bufferSize(); }
```

This links without a single warning. The linker keeps **one** copy of the weak `bufferSize` symbol. With GCC 13, the real result was `sizeA()=64 sizeB()=64` at `-O0`, but `64 4096` at `-O2`, where each call is inlined from its own TU's definition. The same source behaves differently depending on the optimisation level. Real-world causes include two libraries that each bundle a different version of the same header-only dependency, or a struct whose layout depends on a macro (`#ifdef DEBUG`) compiled differently in two TUs. `-flto -Wodr` (GCC) catches mismatched **type** definitions across TUs (it stayed silent for these function bodies), and so does AddressSanitizer's `detect_odr_violation` for globals. The real defence is to keep every inline definition in exactly one header.

---

## 4. Linkage

| Linkage | Visible from | You get it with |
|---|---|---|
| **external** | every TU | non-`static` functions and globals (default), `extern` |
| **internal** | only this TU | `static` at namespace scope, anything in an **anonymous namespace**, `const`/`constexpr` namespace-scope variables (in C++, not C) |
| **none** | only its scope | local variables, function parameters |
| **module** (C++20) | only this module | non-exported names in a module unit |

Here is the real `nm -C` output for one TU with each kind of global:

```text
static int x;                    ->  b x                              (internal, .bss)
const int k = 5;                 ->  r k                              (internal, read-only)
constexpr int k2 = 6;            ->  r k2                             (internal, read-only)
inline int iv = 7;               ->  u iv                             (external, "unique": merged across TUs)
int e = 1;                       ->  D e                              (external, .data)
namespace { int anon = 2; }      ->  d (anonymous namespace)::anon    (internal, .data)
```

```cpp
#include <cassert>
#include <cstdio>

namespace {                              // preferred C++ way to hide helpers: internal linkage
int helper(int x) {
    return x * 2;
}
struct Detail {                          // types can be TU-local too (static can't do that)
    int value = 1;
};
}

static int legacyHelper(int x) {         // the C way; still common
    return x + 1;
}

inline int g_sharedCounter = 0;          // C++17: one variable across all TUs, defined in a header

int nextId() {
    static int id = 0;                   // `static` local: static storage duration, no linkage
    return ++id;                         // initialised once, thread-safe since C++11
}

struct Widget {
    static inline int instances = 0;     // static member: one per class (inline: no .cpp definition needed)
    Widget() { ++instances; }
};

int main() {
    assert(helper(2) == 4 && legacyHelper(2) == 3);
    assert(Detail{}.value == 1);
    assert(nextId() == 1 && nextId() == 2);
    Widget a;
    Widget b;
    assert(Widget::instances == 2);
    g_sharedCounter++;
    std::printf("ids=%d widgets=%d shared=%d\n", nextId(), Widget::instances, g_sharedCounter);
    return 0;
}
```

> **Interview:** "What does `static` mean?" It depends on where it appears. At **namespace scope** it gives internal linkage. On a **local variable** it gives static storage duration: the variable is initialised once and lives until the program exits. On a **class member** it means one instance shared by the class rather than one per object. And on a **member function**, it means there is no `this` pointer.

---

## 5. The preprocessor

The preprocessor is purely textual and knows nothing about C++ syntax or scopes.

```cpp
#include <cassert>
#include <cstdio>
#include <cstring>

#define STRINGIFY(x) #x                      // # turns an argument into a string literal
#define TOSTRING(x) STRINGIFY(x)             // two levels: expand x first, then stringify
#define CONCAT(a, b) a##b                    // ## pastes tokens together
#define SQUARE_BAD(x) x * x                  // missing parentheses
#define SQUARE(x) ((x) * (x))                // parenthesise every use AND the whole thing
#define LOG(fmt, ...) std::printf("[%s:%d] " fmt "\n", __FILE__, __LINE__ __VA_OPT__(,) __VA_ARGS__)
#define VERSION_MAJOR 2

int main() {
    int CONCAT(value, 1) = 10;               // declares `value1`
    assert(value1 == 10);

    assert(std::strcmp(STRINGIFY(VERSION_MAJOR), "VERSION_MAJOR") == 0);   // not expanded
    assert(std::strcmp(TOSTRING(VERSION_MAJOR), "2") == 0);                // expanded first

    assert(SQUARE_BAD(1 + 2) == 5);          // expands to 1 + 2 * 1 + 2
    assert(SQUARE(1 + 2) == 9);

    int i = 3;
    int sq = SQUARE(i);                      // fine; SQUARE(i++) would modify i twice
    assert(sq == 9);

#if VERSION_MAJOR >= 2 && defined(__cplusplus)
    LOG("built with C++ standard %ld", static_cast<long>(__cplusplus));
#endif
    LOG("no extra arguments");                // __VA_OPT__ (C++20) drops the comma
    std::printf("compiled on %s at %s\n", __DATE__, __TIME__);
    return 0;
}
```

| Directive / macro | Use |
|---|---|
| `#include <x>` / `"x"` | `<>` searches system/`-I` paths; `""` searches the current file's directory first |
| `#define`, `#undef` | object-like and function-like macros |
| `#if`, `#ifdef`, `#elif`, `#else`, `#endif`, `defined(X)` | conditional compilation (platform, features, debug) |
| `#pragma once` / include guards | include a header at most once per TU |
| `#error "msg"`, `#warning` | stop or warn at compile time |
| `__FILE__`, `__LINE__`, `__func__`, `__DATE__`, `__cplusplus` | predefined information (prefer `std::source_location` in C++20) |
| `__has_include(<x>)`, `__has_cpp_attribute(x)` | feature detection |
| `-D NAME=value` / `-U NAME` | define/undefine from the command line |

> **Tip:** In C++ prefer `constexpr` variables over object macros, `inline`/template functions over function macros, and `enum class` over `#define` lists. Macros don't respect scope, can't be debugged, and evaluate their arguments multiple times. Keep macros for include guards, conditional compilation, and things that need `__FILE__`/`#x`.

### 5.1 Header guards

```cpp
// no-test (header fragment)
#pragma once                    // supported by GCC, Clang, MSVC, IAR, Keil; simple and fast

// or the portable classic (the name must be unique across the project):
#ifndef PROJECT_UTIL_H
#define PROJECT_UTIL_H
// ... declarations ...
#endif  // PROJECT_UTIL_H
```

Without a guard, including a header twice in one TU (directly or through another header) redefines its classes, which is a compile error. Guards do **not** help across TUs. That case is the linker's "multiple definition" from §3.1.

---

## 6. Name mangling and `extern "C"`

C++ supports overloading, namespaces and templates, so a symbol name must encode more than the plain identifier. The compiler **mangles** names using the Itanium ABI on GCC/Clang and its own scheme on MSVC:

| Source | Mangled (Itanium) |
|---|---|
| `int add(int, int)` | `_Z3addii` |
| `double add(double, double)` | `_Z3adddd` |
| `static int helper(int)` | `_ZL6helperi` (L = internal linkage) |
| `std::vector<int>::push_back(const int&)` | `_ZNSt6vectorIiSaIiEE9push_backERKi` |

```bash
c++filt _ZNSt6vectorIiSaIiEE9push_backERKi     # -> std::vector<int, std::allocator<int> >::push_back(int const&)
```

```bash
nm -C app | grep add                            # -C demangles the listing
```

C has no mangling: the C function `int c_sum(int, int)` is just the symbol `c_sum`. When C++ code declares it without `extern "C"`, the compiler looks for `_Z5c_sumii`, which doesn't exist:

```text
$ gcc -c csum.c && g++ use.cpp csum.o
use.cpp:(.text+0x13): undefined reference to `c_sum(int, int)'
```

With `extern "C" int c_sum(int, int);` it links. The standard pattern for a header shared by C and C++:

```cpp
// no-test (header fragment)
#ifndef MYLIB_H
#define MYLIB_H

#ifdef __cplusplus
extern "C" {                    // C++ compilers see this; C compilers don't
#endif

int mylib_init(void);
int mylib_read(unsigned char* buf, unsigned long len);

#ifdef __cplusplus
}
#endif

#endif
```

`extern "C"` also works in the other direction, to expose C++ code to C, or to define an ISR or callback whose name must match a C symbol in a vector table. An `extern "C"` function can't be overloaded and shouldn't let exceptions escape into C code.

```cpp
#include <cassert>
#include <cstdio>
#include <cstdlib>

// A C-callable function implemented in C++ (e.g. an ISR name expected by startup code).
extern "C" int compare_ints(const void* a, const void* b) {
    int lhs = *static_cast<const int*>(a);
    int rhs = *static_cast<const int*>(b);
    return (lhs > rhs) - (lhs < rhs);
}

int main() {
    int values[] = {5, 2, 9, 1};
    std::qsort(values, 4, sizeof(int), compare_ints);   // a C library calls our function back
    assert(values[0] == 1 && values[3] == 9);
    std::printf("qsort with an extern \"C\" comparator: %d %d %d %d\n",
                values[0], values[1], values[2], values[3]);
    return 0;
}
```

---

## 7. Static and shared libraries

| | Static (`.a`, `.lib`) | Shared (`.so`, `.dll`, `.dylib`) |
|---|---|---|
| What it is | an archive of `.o` files | a linked image loaded at run time |
| When linked | at build time: needed object files are copied in | at load time by the dynamic loader (`ld-linux.so`), or with `dlopen` |
| Binary size | larger | smaller; code shared between processes |
| Updating | rebuild every program | replace the `.so` (if the ABI is unchanged) |
| Start-up | no loading cost | symbol resolution, relocations (PLT/GOT) |
| Code generation | any | needs position-independent code (`-fPIC`) |
| Embedded | the norm: there is no dynamic loader | rare |

```bash
g++ -c util.cpp && ar rcs libutil.a util.o              # static: archive the object files
```

```bash
g++ main.o -L. -lutil -o app                             # -L: where to search; -lutil: libutil.a or libutil.so
```

```bash
g++ -fPIC -shared util.cpp -o libutil.so                  # shared library
```

```bash
g++ main.cpp -L. -lutil -Wl,-rpath,'$ORIGIN' -o app       # rpath: look for .so next to the binary at run time
```

```bash
ldd app                                                    # which shared libraries will load, and from where
```

Real `ldd` output for the shared build:

```text
linux-vdso.so.1 (0x00007fa033943000)
libutil.so => /.../link1/./libutil.so (0x00007fa033931000)
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007fa033600000)
```

### 7.1 Link order matters

GNU `ld` processes its inputs **left to right**. It extracts a member from a static archive only if that member resolves a symbol that is **already** undefined at that point. A library listed *before* the objects that use it is therefore skipped:

```text
$ g++ -L. -lutil main.o -o app2
main.cpp:(.text+0xe): undefined reference to `g_calls'
...
$ g++ main.o -L. -lutil -o app2      # objects first, then libraries: works
```

Rules: put objects first, then libraries, with dependent libraries before the libraries they depend on (`-lapp_logic -lnet -lssl -lcrypto`). Circular dependencies between archives need `-Wl,--start-group ... -Wl,--end-group`, or repeating a library. `lld`, `mold` and the macOS linker don't have this order sensitivity, which is why "it builds on my Mac" happens.

### 7.2 Shared library details worth knowing

- **Symbol visibility.** By default every external symbol in a `.so` is exported. Build with `-fvisibility=hidden` and mark the public API with `__attribute__((visibility("default")))` (`__declspec(dllexport)` on Windows). The result is smaller, faster to load, and doesn't leak internal symbols.
- **soname and versioning.** Pass `-Wl,-soname,libutil.so.1`. The `libutil.so → libutil.so.1 → libutil.so.1.2.3` symlink chain lets compatible updates replace the library.
- **Run-time search order:** `DT_RPATH`/`DT_RUNPATH`, then `LD_LIBRARY_PATH`, then `/etc/ld.so.cache`, then the default paths. `LD_PRELOAD` injects a library first, which is useful for interposing `malloc` in tests.
- **`dlopen`/`dlsym`** load plugins at run time. Export plugin entry points with `extern "C"` so that `dlsym("create_plugin")` finds them unmangled.
- **ABI compatibility.** Changing a class's members, virtual functions, or inline functions in a public header breaks binaries built against the old version. That's why libraries use PImpl or C APIs at their boundaries.

---

## 8. Optimisation and code-generation flags

| Flag | Effect |
|---|---|
| `-O0` | no optimisation; fastest compile, best debugging (the default) |
| `-Og` | optimise without hurting debugging |
| `-O2` | the standard release level |
| `-O3` | adds aggressive inlining and vectorisation; can make code bigger |
| `-Os` / `-Oz` | optimise for size (common for MCUs) |
| `-g` / `-g3` | debug info (`-g3` includes macros); doesn't change the generated code |
| `-flto` | link-time optimisation: inline and dead-strip across TUs |
| `-ffunction-sections -fdata-sections` + `-Wl,--gc-sections` | put every function in its own section, and let the linker drop unused ones (embedded) |
| `-fPIC` / `-fPIE` + `-pie` | position-independent code (shared libs) / executables (ASLR) |
| `-march=native`, `-mcpu=cortex-m4 -mthumb -mfloat-abi=hard -mfpu=fpv4-sp-d16` | target instruction set |
| `-fno-exceptions -fno-rtti` | smaller embedded binaries (no unwinding tables, no `typeid`/`dynamic_cast`) |
| `-MMD -MP` | emit `.d` dependency files (header tracking for Make) |
| `-Wl,-Map=app.map` | the linker map: which symbol went where, and why it was pulled in |
| `-Wl,--print-memory-usage` | per-region usage (FLASH/RAM) for embedded builds |

Recommended warnings: `-Wall -Wextra -Wpedantic -Wshadow -Wconversion -Wsign-conversion -Wnon-virtual-dtor -Wold-style-cast -Werror` (in CI).

### 8.1 Link-time optimisation (LTO)

Normally each TU is optimised alone, so the compiler can't inline `add()` from `util.cpp` into `main.cpp`. With `-flto`, object files contain the compiler's intermediate representation (GIMPLE or LLVM IR) instead of final machine code. At link time the whole program is optimised together: cross-TU inlining, constant propagation, and removal of dead code. The costs are slower links and more memory. ThinLTO (Clang) and `-flto=auto` (GCC) parallelise the work.

---

## 9. Static initialisation and the "fiasco"

Before `main` runs, the start-up code initialises every global with static storage duration.
1. **Constant initialisation** (compile-time values, `constexpr`, `constinit`) is baked into `.data`/`.rodata`, so it costs nothing at run time.
2. **Zero initialisation** puts objects in `.bss`, which start-up code zeroes.
3. **Dynamic initialisation** runs constructors and non-constant initialisers. Within one TU they run in definition order. **Across TUs the order is unspecified.**

The **static initialisation order fiasco**: a global in `a.cpp` whose constructor uses a global from `b.cpp` that hasn't been constructed yet.

```cpp
// no-test (two TUs)
// logger.cpp
Logger g_logger("app.log");

// config.cpp
Config g_config(g_logger);        // may run BEFORE g_logger is constructed: uses a dead object
```

Fixes:
- **Construct on first use** (a function-local static, thread-safe since C++11): `Logger& logger() { static Logger l("app.log"); return l; }`.
- `constinit` / `constexpr` globals, which need no dynamic initialisation.
- No globals with non-trivial constructors; pass dependencies explicitly.

```cpp
#include <cassert>
#include <cstdio>
#include <string>
#include <vector>

class Registry {
public:
    void add(std::string name) { names_.push_back(std::move(name)); }
    std::size_t size() const { return names_.size(); }
private:
    std::vector<std::string> names_;
};

// Construct on first use: whichever TU's global initialiser calls this first, it's ready.
Registry& registry() {
    static Registry instance;           // initialised exactly once, on the first call
    return instance;
}

// Self-registration pattern (plugins, test frameworks): globals in other TUs call registry().
struct AutoRegister {
    explicit AutoRegister(const char* name) { registry().add(name); }
};
static AutoRegister g_regA("sensor-driver");
static AutoRegister g_regB("uart-driver");

constinit int g_bootFlags = 0x3;        // constant initialisation: no ordering problem at all

int main() {
    assert(registry().size() == 2);
    assert(g_bootFlags == 3);
    std::printf("registered %zu drivers before main()\n", registry().size());
    return 0;
}
```

---

## 10. Embedded images: linker scripts and start-up code

On a microcontroller there is no operating system loader. The **linker script** (`.ld`) places each section at a physical address:

```text
MEMORY {
  FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 512K
  RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
}

SECTIONS {
  .isr_vector : { KEEP(*(.isr_vector)) } > FLASH          /* vector table at the reset address */
  .text   : { *(.text*) *(.rodata*) } > FLASH
  .init_array : { __init_array_start = .; KEEP(*(.init_array*)) __init_array_end = .; } > FLASH
  _sidata = LOADADDR(.data);
  .data   : { _sdata = .; *(.data*) _edata = .; } > RAM AT > FLASH   /* runs from RAM, stored in FLASH */
  .bss    : { _sbss = .; *(.bss*) *(COMMON) _ebss = .; } > RAM
  ._stack : { . = ALIGN(8); . = . + 0x1000; _estack = .; } > RAM
}
```

The reset handler, usually in `startup_*.s` or a C file, does what an OS loader would:

```c
// no-test (bare-metal reset handler sketch)
extern unsigned _sidata, _sdata, _edata, _sbss, _ebss;
extern void (*__init_array_start[])(void), (*__init_array_end[])(void);
int main(void);

void Reset_Handler(void) {
    // 1. copy initialised data from flash to RAM
    for (unsigned *src = &_sidata, *dst = &_sdata; dst < &_edata;) { *dst++ = *src++; }
    // 2. zero .bss
    for (unsigned *dst = &_sbss; dst < &_ebss;) { *dst++ = 0; }
    // 3. (FPU enable, clock setup: SystemInit())
    // 4. run C++ global constructors
    for (void (**f)(void) = __init_array_start; f < __init_array_end; ++f) { (*f)(); }
    // 5. call main (should never return on bare metal)
    main();
    for (;;) {}
}
```

```bash
arm-none-eabi-size app.elf                # text = code+rodata (flash), data (flash+RAM), bss (RAM)
```

```bash
arm-none-eabi-objcopy -O binary app.elf app.bin    # raw image for the flasher
```

```bash
arm-none-eabi-nm --size-sort -C app.elf | tail     # the biggest symbols: where did my flash go?
```

`size` output for the small host program above:

```text
   text	   data	    bss	    dec	    hex	filename
   1724	    600	      8	   2332	    91c	app
```

**Flash** usage is `text + data` (the initial values of `.data` are stored in flash). **RAM** usage is `data + bss`, plus the stack and heap.

---

## 11. Inspecting binaries: the toolbox

| Tool | Use |
|---|---|
| `nm -C` | list symbols (defined/undefined, linkage) |
| `c++filt` | demangle names |
| `objdump -d -C` / `-h` | disassemble / section headers |
| `readelf -S`, `-s`, `-d` | ELF sections, symbol table, dynamic section (NEEDED, RPATH) |
| `ldd` | shared-library dependencies (don't run it on untrusted binaries: it can execute them) |
| `size` | text/data/bss totals |
| `strings` | printable strings in a binary |
| `addr2line -e app 0x401136` | turn a crash address into file:line |
| `g++ -S -O2 -fverbose-asm` / Compiler Explorer (godbolt.org) | see the generated assembly |
| `-Wl,--trace-symbol=add` | ask the linker who defines and who references a symbol |
| `-H` | print the include tree (find expensive or duplicate headers) |

---

## 12. Interview checklist

- [ ] Name the four stages, what each produces, and the flags that stop after each one (`-E`, `-S`, `-c`).
- [ ] Translation units; why headers contain declarations.
- [ ] Declaration vs definition; the three parts of the ODR; why ODR violations can be silent.
- [ ] Fix "multiple definition" four ways; explain `inline` as the ODR exemption.
- [ ] Linkage kinds; `static` in its four contexts; anonymous namespaces.
- [ ] Read `nm` output (T/t/U/B/D/W); demangle; `extern "C"` both ways.
- [ ] Static vs shared libraries; `-L`/`-l`/rpath; link order with GNU ld; visibility.
- [ ] LTO; `-ffunction-sections` + `--gc-sections`; `-Os`.
- [ ] Static initialisation order fiasco and construct-on-first-use.
- [ ] Embedded: linker script memory regions, `.data` load vs run address, reset-handler steps.

---

## Practice

1. Classify each error as preprocessor, compiler or linker, and give the likely fix: (a) `fatal error: util.h: No such file or directory` (b) `error: 'add' was not declared in this scope` (c) `undefined reference to 'add(int, int)'` (d) `multiple definition of 'kTable'` (e) `undefined reference to 'vtable for Shape'`.
2. A header has `int g_count = 0;` and `void log(const char* s) { puts(s); }`. Two `.cpp` files include it. What breaks, and how do you fix both lines?
3. You link a C library from C++ and get `undefined reference to 'sensor_init()'`, yet `nm libsensor.a` shows `T sensor_init`. What's going on?
4. Why does `g++ -lm main.o` sometimes fail with `undefined reference to 'sqrt'` while `g++ main.o -lm` works?
5. Write a small program showing that a function-local static is initialised only once, and on first use rather than at program start.

:::details Show solution
1. (a) **Preprocessor**: the include path is missing. Add `-I path/to/include` or fix the path. (b) **Compiler**: there is no declaration in this TU. Include the header or declare the function. (c) **Linker**: it is declared but not defined, or the object/library isn't linked, or the signature differs (`add(long, long)` defined vs `add(int, int)` declared), or it's a C function without `extern "C"`. (d) **Linker**: a non-inline definition sits in a header. Make it `inline`/`constexpr`, or use `extern` + one definition. (e) **Linker**: the class's **key function** (its first non-inline, non-pure virtual function) is declared but never defined, so the vtable was never emitted. Define every declared virtual function, including the destructor.
2. Both are definitions with external linkage, so each TU defines them: **multiple definition** for `g_count` and `log`. Fixes: `inline int g_count = 0;` (or `extern int g_count;` in the header and `int g_count = 0;` in one `.cpp`), and `inline void log(const char* s) { puts(s); }` (or move the body into a `.cpp`).
3. The C++ declaration isn't wrapped in `extern "C"`, so C++ looks for the mangled `_Z11sensor_initv` while the library defines the plain `sensor_init`. Wrap the declarations in the `#ifdef __cplusplus extern "C" { ... }` pattern. (`nm -C` on your object file shows `U sensor_init()` with parentheses: the giveaway that it's a C++ symbol.)
4. GNU `ld` scans left to right. When it reaches `-lm`, nothing has asked for `sqrt` yet, so no member of the archive is extracted, and `main.o`'s reference later remains unresolved. Libraries must come after the objects that use them. (With glibc, `libm` is often a shared library or built into libc, which is why it "sometimes" works.)
5.
```cpp
#include <cassert>
#include <cstdio>

int g_constructions = 0;

struct Expensive {
    Expensive() {
        ++g_constructions;
        std::printf("Expensive constructed\n");
    }
    int value = 42;
};

Expensive& instance() {
    static Expensive e;                   // constructed on the first call only
    return e;
}

int main() {
    assert(g_constructions == 0);         // not constructed at program start
    assert(instance().value == 42);
    assert(instance().value == 42);
    assert(g_constructions == 1);         // and only once
    return 0;
}
```
:::

---

## Interview Q&A

- **What does the preprocessor do?** Textual: includes, macro expansion, conditional compilation. No knowledge of C++ syntax.
- **Linker error vs compiler error?** Compiler: syntax/type errors within a TU. Linker: unresolved or duplicate symbols across TUs.
- **Why does `static` mean different things?** At namespace scope: internal linkage. In a function: static storage duration. In a class: shared by all instances.
- **What does `inline` mean today?** Primarily "may be defined in multiple TUs" (ODR exemption), not "please inline".
- **What is LTO?** Link-time optimisation: the compiler keeps IR in object files so the linker can optimise across TUs.
- **What is a translation unit?** A source file after preprocessing — the `.cpp` plus all the headers it includes — which the compiler processes independently into one object file.
- **What is the One Definition Rule?** Each non-inline function/variable must be defined exactly once in the program; classes, templates and inline entities may be defined in several TUs only if all definitions are identical — violations may go undiagnosed.
- **What is name mangling and why does C++ need it?** Encoding a function's namespace, class and parameter types into its symbol name so overloads and namespaced names get unique symbols; `extern "C"` turns it off for C interoperability.
- **Why does library order matter on the GNU linker?** It resolves symbols left to right and only pulls archive members that satisfy currently-undefined symbols, so a library must appear after the objects that use it.
- **What causes `undefined reference to vtable for X`?** A virtual function (usually the first non-inline one — the key function, often the destructor) was declared but never defined, so no TU emitted the vtable.
- **What's the static initialisation order fiasco?** Globals in different TUs are dynamically initialised in an unspecified order, so one global's constructor may use another that isn't constructed yet; fix with function-local statics or `constinit`.
- **What do `.text`, `.data` and `.bss` hold?** Code (and often read-only data), initialised globals (stored in flash and copied to RAM on embedded), and zero-initialised globals (just zeroed at start-up, taking no space in the image).
- **Static or shared library for an embedded target?** Static — there's no dynamic loader, and static linking with `--gc-sections` keeps only what's used.

---

## External resources

- **John R. Levine — *Linkers and Loaders*** (the classic book on how linking works).
- **Ian Lance Taylor — "Linkers" blog series** (20 parts, by the author of the gold linker).
- **cppreference — Translation phases, Definitions and ODR, Storage class specifiers (linkage), Preprocessor.**
- **Ulrich Drepper — "How To Write Shared Libraries"** (visibility, PIC, relocations).
- **GNU ld manual — Linker Scripts** and your MCU vendor's example `.ld` and startup files.
- **Compiler Explorer (godbolt.org)** for seeing exactly what the compiler emits.
