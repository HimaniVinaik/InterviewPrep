# Compilation & Linking

Understanding what happens between `main.cpp` and `a.out` makes you better at reading build errors, using Make/CMake, and answering "what is a linker error?" questions.

## 1. The four stages

```text
 main.cpp ──preprocess──► main.i ──compile──► main.s ──assemble──► main.o ─┐
 util.cpp ──────────────────────────────────────────────────────► util.o ─┼─link──► app
                                                         libm.a / libc.so ─┘
```

```bash
g++ -E main.cpp -o main.i      # 1. preprocess: #include, #define, #if expanded
g++ -S main.i   -o main.s      # 2. compile to assembly
g++ -c main.s   -o main.o      # 3. assemble to an object file (machine code + symbol table)
g++ main.o util.o -o app       # 4. link: resolve symbols, lay out sections
g++ -c main.cpp                # usually you do 1-3 in one step
```

### Translation units

Each `.cpp` plus everything it `#include`s is one **translation unit (TU)**, compiled independently. The compiler never sees other TUs — that's why you need **declarations** in headers and why linking exists.

## 2. Declarations vs definitions & the ODR

```cpp
// util.h — declarations
int add(int a, int b);         // function declaration
extern int g_counter;          // variable declaration (no storage)
struct Point { int x, y; };    // class definition (allowed in many TUs if identical)

// util.cpp — definitions
int add(int a, int b) { return a + b; }
int g_counter = 0;             // the one definition
```

**One Definition Rule:** every non-inline function/variable used must be defined **exactly once** in the whole program; classes, inline functions, and templates may be defined in multiple TUs if the definitions are identical.

| Error | Cause |
|---|---|
| `undefined reference to 'add(int, int)'` | declared but never defined / object or library not linked / C vs C++ name mismatch |
| `multiple definition of 'g_counter'` | defined in a header included by several `.cpp`s |

Fixes for header definitions: `inline` functions/variables (C++17), `constexpr` (implicitly inline for functions), `static`/anonymous namespace for internal linkage.

## 3. Linkage

| Linkage | Visible | How |
|---|---|---|
| external | across TUs | default for non-static functions and globals |
| internal | only this TU | `static` at namespace scope, anonymous `namespace {}` , `const`/`constexpr` globals (C++) |
| none | only its scope | locals |

```cpp
namespace {                     // preferred C++ way to hide helpers
    int helper() { return 1; }
}
static int legacy_helper();     // C way
```

## 4. Header guards

```cpp
#pragma once                    // widely supported, simple
// or the portable classic:
#ifndef UTIL_H
#define UTIL_H
// ...
#endif
```

Without them, including a header twice in one TU redefines its classes → compile error.

## 5. Name mangling & `extern "C"`

C++ encodes parameter types into symbol names to support overloading: `add(int,int)` → `_Z3addii`. C doesn't. To call C from C++ (or expose C++ to C):

```cpp
// mylib.h — usable from both C and C++
#ifdef __cplusplus
extern "C" {
#endif
int mylib_init(void);
#ifdef __cplusplus
}
#endif
```

```bash
nm -C app | grep add           # list symbols (-C demangles)
c++filt _Z3addii               # demangle manually -> add(int, int)
```

## 6. Static vs shared libraries

| | Static (`.a`, `.lib`) | Shared (`.so`, `.dll`, `.dylib`) |
|---|---|---|
| Linked | at build time, copied into the binary | at load/run time |
| Binary size | larger | smaller |
| Updates | rebuild required | replace the library |
| Startup | no loading cost | dynamic loader resolves symbols |
| Embedded | the norm (no dynamic loader) | rare |

```bash
# Static
g++ -c util.cpp && ar rcs libutil.a util.o
g++ main.cpp -L. -lutil -o app

# Shared
g++ -fPIC -shared util.cpp -o libutil.so
g++ main.cpp -L. -lutil -Wl,-rpath,'$ORIGIN' -o app
ldd app                         # which shared libs will be loaded
```

> **Gotcha:** With GNU ld, **library order matters**: a library must come *after* the objects that use it (`g++ main.o -lutil`, not `g++ -lutil main.o`).

## 7. Useful compiler flags

```bash
-std=c++20                     # language standard
-O0 / -O2 / -O3 / -Os / -Og    # optimisation (Os: size — common for MCUs; Og: debuggable)
-g                             # debug info
-Wall -Wextra -Wpedantic -Werror -Wshadow -Wconversion
-I include/  -D DEBUG=1        # include path / define macro
-fsanitize=address,undefined   # runtime checkers
-flto                          # link-time optimisation: inline across TUs
-ffunction-sections -fdata-sections -Wl,--gc-sections   # drop unused code (embedded)
-MMD -MP                       # emit .d dependency files (for Make)
-march=native / -mcpu=cortex-m4 -mthumb -mfloat-abi=hard -mfpu=fpv4-sp-d16
```

## 8. Linker scripts & embedded images

On microcontrollers the linker script (`.ld`) maps sections to memory:

```text
MEMORY {
  FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 512K
  RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
}
SECTIONS {
  .isr_vector : { KEEP(*(.isr_vector)) } > FLASH
  .text       : { *(.text*) *(.rodata*) } > FLASH
  .data       : { _sdata = .; *(.data*) _edata = .; } > RAM AT > FLASH   /* load in flash, run in RAM */
  .bss        : { _sbss = .; *(.bss*) *(COMMON) _ebss = .; } > RAM
}
```

The startup code copies `.data` from flash to RAM, zeroes `.bss`, sets up the stack, (in C++) runs static constructors, then calls `main`. Inspect with `arm-none-eabi-size app.elf` and `objdump -h`.

## 9. Inspecting binaries

```bash
objdump -d app | less          # disassemble
readelf -S app                 # section headers
size app                       # text/data/bss sizes
strings app                    # printable strings
g++ -S -O2 -fverbose-asm f.cpp # see what the compiler generated (or use godbolt.org)
```

## Interview Q&A

- **What does the preprocessor do?** Textual: includes, macro expansion, conditional compilation. No knowledge of C++ syntax.
- **Linker error vs compiler error?** Compiler: syntax/type errors within a TU. Linker: unresolved or duplicate symbols across TUs.
- **Why does `static` mean different things?** At namespace scope: internal linkage. In a function: static storage duration. In a class: shared by all instances.
- **What does `inline` mean today?** Primarily "may be defined in multiple TUs" (ODR exemption), not "please inline".
- **What is LTO?** Link-time optimisation: the compiler keeps IR in object files so the linker can optimise across TUs.
