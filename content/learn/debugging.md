# Debugging Techniques

Debugging is a skill interviewers probe directly ("Tell me about a hard bug you fixed", "This code crashes — find out why") and the skill you'll use most on the job.

## 1. The scientific method for bugs

1. **Reproduce** reliably — the most important step. Minimise the input/steps.
2. **Observe** — collect evidence: logs, core dumps, traces, scope captures.
3. **Hypothesise** — what could cause exactly this behaviour?
4. **Test** the hypothesis with an experiment that could prove it wrong.
5. **Fix** the root cause, not the symptom.
6. **Verify** and add a **regression test**.
7. **Reflect:** why wasn't this caught earlier? Add an assertion, warning, or test.

Narrowing techniques: binary search through code (comment out halves), data (halve the input), and history (`git bisect`).

## 2. GDB essentials

```bash
g++ -g -O0 main.cpp -o app      # debug info, no optimisation (or -Og)
gdb ./app
```

| Command | Action |
|---|---|
| `run args` / `r` | start |
| `break file.cpp:42` / `b func` | breakpoint |
| `break foo if x > 10` | conditional breakpoint |
| `watch var` | stop when `var` changes (hardware watchpoint) |
| `next` / `n`, `step` / `s`, `finish`, `continue` / `c` | step over / into / out / resume |
| `bt` / `bt full` | backtrace (with locals) |
| `frame 2`, `up`, `down` | move between stack frames |
| `print expr` / `p *ptr@10` | print; `@` prints an array of 10 |
| `display var` | print every stop |
| `info locals` / `info args` / `info threads` | inspect |
| `thread apply all bt` | all threads' stacks (deadlocks!) |
| `x/16xb addr` | examine memory: 16 bytes in hex |
| `set var x = 5` | modify state |
| `tbreak`, `until`, `advance` | temporary breakpoints / run to line |
| `catch throw` | stop when an exception is thrown |

**TUI mode:** `gdb -tui` or `layout src`. **Reverse debugging:** `record` then `reverse-next`, or use `rr` (record & replay) for non-deterministic bugs.

### Core dumps

```bash
ulimit -c unlimited                # allow core files
./app                              # crashes -> core file
gdb ./app core                     # post-mortem: bt shows where it died
coredumpctl gdb                    # on systemd systems
```

## 3. Sanitizers — run your tests under them

```bash
g++ -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer main.cpp && ./a.out
g++ -g -O1 -fsanitize=thread main.cpp && ./a.out          # data races (not combinable with ASan)
clang++ -g -O1 -fsanitize=memory main.cpp && ./a.out      # uninitialised reads (clang only)
```

| Sanitizer | Finds | Overhead |
|---|---|---|
| ASan | heap/stack/global overflow, use-after-free, double free, leaks | ~2× |
| UBSan | signed overflow, bad shifts, null, misalignment, invalid enum/bool | small |
| TSan | data races, lock-order inversions | 5–15× |
| MSan | reads of uninitialised memory | ~3× |

Example ASan report: `heap-use-after-free READ of size 4 at 0x602000000010 ... freed by thread T0 here: #0 operator delete ... previously allocated by ...` — it tells you all three stack traces.

## 4. Valgrind

```bash
valgrind --leak-check=full --track-origins=yes ./app
valgrind --tool=callgrind ./app && kcachegrind callgrind.out.*   # profiling
valgrind --tool=massif ./app                                     # heap usage over time
```

Slower than ASan (~20–50×) but needs no recompilation.

## 5. Logging & printf debugging

Still extremely effective when done well:
- Log levels; timestamps; thread IDs; file:line (`std::source_location`).
- Log **state transitions** and **inputs at boundaries**, not everything.
- Beware: printing changes timing (Heisenbugs) and `printf` in an ISR can break real-time behaviour — log into a RAM ring buffer and dump later.
- Flush (`std::endl`/`fflush`) before a crash or you lose the last lines; `stderr` is unbuffered.

## 6. Static analysis & warnings

```bash
g++ -Wall -Wextra -Wpedantic -Wshadow -Wconversion -Wsign-conversion -Wnull-dereference -Wold-style-cast
clang-tidy src/*.cpp -- -std=c++20            # bugprone-*, modernize-*, cppcoreguidelines-*
cppcheck --enable=all src/
scan-build make                               # clang static analyzer
```

Treat warnings as errors in CI (`-Werror`). Most UB is caught by compiler warnings + sanitizers.

## 7. Debugging specific bug classes

| Symptom | Likely cause | Tool |
|---|---|---|
| Crash at random places | heap corruption, use-after-free | ASan, Valgrind |
| Works in debug, fails in release | UB, uninitialised vars, races | UBSan, MSan, TSan, `-Og` |
| Hangs | deadlock, infinite loop | `thread apply all bt`, `perf top` |
| Intermittent wrong results | data race, timing | TSan, `rr` |
| Slow | algorithmic, cache, allocation | `perf`, callgrind, flame graphs |
| Memory grows over time | leak, unbounded cache | LeakSanitizer, massif, heaptrack |
| Wrong output only with optimisation | strict aliasing, signed overflow | `-fno-strict-aliasing` test, UBSan |

## 8. Performance debugging

```bash
perf stat ./app                    # counters: cycles, cache misses, branch misses
perf record -g ./app && perf report
perf record -g ./app && perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg
```

Measure before optimising; benchmark with Google Benchmark; look at the generated assembly (Compiler Explorer, `-S`).

## 9. Embedded debugging

| Tool | Use |
|---|---|
| **JTAG / SWD debugger** (ST-Link, J-Link) + GDB/OpenOCD | breakpoints, stepping, memory/register view on target |
| **SWO / ITM / RTT** (Segger) | high-speed printf without stopping the CPU |
| **Logic analyser** (Saleae) | decode SPI/I2C/UART/CAN timing |
| **Oscilloscope** | analog signals, timing, ringing, power rails |
| **GPIO toggling** | measure ISR latency/duration on a scope — zero-overhead tracing |
| **Trace** (ETM, Tracealyzer, SystemView) | RTOS task scheduling timeline |
| **Fault handlers** | decode HardFault: stacked PC/LR, CFSR/HFSR/MMFAR/BFAR registers |

```c
/* Cortex-M HardFault handler that captures the faulting PC */
void HardFault_Handler(void) {
    __asm volatile(
        "tst lr, #4      \n"
        "ite eq          \n"
        "mrseq r0, msp   \n"
        "mrsne r0, psp   \n"
        "b hardfault_c   \n");
}
void hardfault_c(uint32_t *frame) {
    volatile uint32_t pc = frame[6], lr = frame[5];   /* stacked PC and LR */
    volatile uint32_t cfsr = SCB->CFSR;               /* why: precise bus error, undefined instr, ... */
    (void)pc; (void)lr; (void)cfsr;
    __BKPT(0);                                        /* or save to retained RAM and reset */
}
```

Common embedded bug sources: stack overflow (paint the stack with 0xDEADBEEF and check the watermark), missing `volatile`, race with an ISR, wrong clock configuration, unaligned access, DMA + cache coherency, watchdog resets, brown-outs, floating inputs without pull-ups, wrong interrupt priority.

## 10. `git bisect` — find the commit that broke it

```bash
git bisect start
git bisect bad                 # current commit is broken
git bisect good v1.4.0         # this release worked
# git checks out a midpoint; build & test, then:
git bisect good   # or: git bisect bad
git bisect run ./test.sh       # fully automatic if you have a script returning 0/1
git bisect reset
```

## Interview answer template: "Tell me about a hard bug"

**Situation** (system, symptom, impact) → **Investigation** (how you reproduced, tools, hypotheses ruled out) → **Root cause** (precise, technical) → **Fix** → **Prevention** (test, assertion, process change). Pick a bug with a satisfying root cause: a race, memory corruption, a timing issue, a compiler optimisation exposing UB.
