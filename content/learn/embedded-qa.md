# Embedded Interview Q&A

Rapid-fire firmware questions with concise answers. Read the question, answer out loud, then check.

## C & memory

**1. What does `volatile` do? When do you need it?** Forces every access to happen as written (no caching/elimination). Needed for MMIO registers, variables shared with ISRs, and memory written by DMA. It does not provide atomicity or inter-core ordering.

**2. Can a variable be `const volatile`?** Yes — e.g. a read-only status register: the program must not write it, but hardware can change it.

**3. What does `static` mean inside a function? At file scope?** Persistent storage duration (keeps its value, lives in .data/.bss); internal linkage (not visible outside the translation unit).

**4. Where do these live: global initialised var, global zero var, local var, `const` table, string literal, `malloc` memory?** .data (RAM, copied from flash), .bss (RAM, zeroed), stack, .rodata (flash), .rodata (flash), heap (RAM).

**5. Why avoid dynamic allocation in firmware?** Fragmentation, non-deterministic timing, failure handling, limited RAM. Allocate statically or from fixed-size pools.

**6. How do you set, clear, toggle and test bit 3 of `reg`?** `reg |= 1u<<3; reg &= ~(1u<<3); reg ^= 1u<<3; (reg >> 3) & 1u`.

**7. Write a macro for the number of elements in an array.** `#define ARRAY_SIZE(a) (sizeof(a)/sizeof((a)[0]))` — only works on true arrays, not pointers.

**8. What's the difference between `#define` and `typedef`?** Text substitution vs a true type alias (`typedef char* pstr; pstr a, b;` makes two pointers; `#define pstr char*` makes one).

**9. What's structure padding? How do you reduce it?** Alignment-driven gaps between members; order members largest-to-smallest, or `__attribute__((packed))` (risks unaligned-access faults and slower code).

**10. What is endianness? How do you detect it?** Byte order of multi-byte values. Store `uint32_t x = 1` and inspect the first byte via `memcpy`/`unsigned char*`.

**11. What happens on unaligned access on Cortex-M?** M3/M4/M7 support unaligned LDR/STR for normal memory (slower; can be configured to fault); M0/M0+ fault (HardFault). LDM/STM and LDRD always require alignment.

**12. What is a dangling pointer / memory leak / buffer overflow in an embedded context?** Same as elsewhere — but consequences include silent corruption of adjacent globals or the stack and no OS to catch it.

## Interrupts & concurrency

**13. What should and shouldn't an ISR do?** Do: acknowledge the source, move data to a buffer, set a flag/give a semaphore. Don't: block, allocate, `printf`, long loops, floating point (unless the FPU context is saved and you accept the cost).

**14. What is interrupt latency, and what affects it?** Time from the event to the first ISR instruction. Affected by core hardware (~12 cycles on Cortex-M), higher-priority ISRs running, critical sections (disabled interrupts), flash wait states, and bus contention.

**15. How do you share a multi-byte variable between an ISR and main?** `volatile` plus atomic access: disable interrupts around the read/write, or use C11 atomics, or a double-read consistency check for counters.

**16. What is a race condition? Give an embedded example.** `counter++` in main and in an ISR: main loads, ISR increments, main stores — an increment is lost.

**17. What is reentrancy? Is `strtok` reentrant?** A reentrant function can be safely interrupted and called again before the first call completes — no static/global state, no non-reentrant calls. `strtok` is not (hidden static pointer); use `strtok_r`.

**18. What's the difference between a mutex and a binary semaphore?** Mutex: ownership (only the owner releases), priority inheritance, for mutual exclusion. Binary semaphore: no owner, can be given from an ISR, for signalling.

**19. What is priority inversion? How is it solved?** A high-priority task waits on a mutex held by a low-priority task, which is preempted by a medium-priority task → the high task is blocked indefinitely. Fix: priority inheritance or priority ceiling protocol.

**20. What is a deadlock? How do you prevent it in an RTOS?** Circular wait on resources. Consistent lock order, timeouts on takes, avoid holding multiple locks, use message passing.

**21. What is a watchdog? How should it be kicked?** A timer that resets the MCU if not refreshed. Kick from a supervisor that confirms all tasks are alive — not from a timer ISR (which keeps running when tasks hang).

**22. Nested interrupts — how do they work on Cortex-M?** A higher-priority (lower number) interrupt preempts a running lower-priority ISR. Same/lower priority waits (tail-chained after).

## Peripherals & protocols

**23. Compare UART, SPI, I2C.** UART: async, 2 wires, point-to-point. SPI: sync, 4+ wires, fast, full duplex, chip-selects. I2C: sync, 2 wires, addresses, multi-device, slower, half duplex, needs pull-ups. (Table in *Embedded Fundamentals*.)

**24. Why does I2C need pull-up resistors?** Lines are open-drain: devices only pull low; resistors pull high. Value trades rise time (bus capacitance) against power.

**25. What are SPI CPOL and CPHA?** Clock idle polarity and which edge samples data — four modes that must match the slave device.

**26. How does CAN arbitration work?** Nodes transmit IDs bit by bit; dominant (0) overrides recessive (1); a node seeing a dominant bit when it sent recessive stops. The lowest ID wins without corrupting the frame.

**27. How do you calculate UART baud error?** Actual baud = f_clk / divisor (rounded); error = |actual − target| / target; keep < ~2% (combined between both ends ≲ 4–5%).

**28. What is DMA and when would you use it?** Hardware that moves data between memory and peripherals without the CPU. High-throughput or continuous transfers: ADC sampling, audio, SPI displays, UART logging.

**29. What is debouncing?** Filtering the mechanical bounce of switches (~1–20 ms) via RC filtering or software sampling (state stable for N samples).

**30. Explain PWM.** A periodic square wave whose duty cycle (on-time fraction) sets average power/voltage — motor speed, LED brightness, servo position.

**31. What is an ADC's resolution vs accuracy?** Resolution = number of steps (bits); accuracy = closeness to the true value (offset/gain/linearity/noise errors).

**32. What is Nyquist? What's aliasing?** Sample faster than 2× the highest signal frequency; otherwise higher frequencies masquerade as lower ones. Use an anti-alias low-pass filter before the ADC.

## Architecture & system

**33. What happens between power-on and `main()`?** Reset vector fetch (SP, PC) → Reset_Handler → clock setup → copy .data, zero .bss → C++ constructors → `main()`.

**34. What is the vector table?** An array of addresses (initial SP + exception/interrupt handlers) at the start of flash (relocatable via VTOR).

**35. What is a HardFault and how do you debug it?** An escalated fault (bad memory access, invalid instruction, divide by zero if enabled, stack overflow). Inspect the stacked PC/LR and CFSR/HFSR/MMFAR/BFAR in the fault handler; find the PC in the map/disassembly.

**36. What is the difference between MPU and MMU?** MPU: region-based protection (permissions, no translation) — Cortex-M. MMU: virtual-to-physical translation + protection with page tables — Cortex-A / Linux.

**37. Big-endian or little-endian: Cortex-M?** Little-endian by default (big-endian configurable on some).

**38. What is a bootloader? How do you make OTA updates safe?** Code that runs first and loads/updates the application. Safe OTA: dual (A/B) banks, signature verification, version anti-rollback, trial boot with automatic rollback, power-fail-safe state flags.

**39. How do you store configuration persistently?** Internal flash pages/EEPROM emulation or external EEPROM/flash, with CRC, versioning, two copies (A/B) and wear levelling.

**40. Why might code work in debug but fail in release?** Missing `volatile`, UB exposed by optimisation, timing changes (races), uninitialised variables, stack usage differences.

**41. How do you measure execution time on an MCU?** Toggle a GPIO and use a scope/logic analyser; the DWT cycle counter (`DWT->CYCCNT`); a hardware timer; RTOS trace tools.

**42. What is the difference between hard and soft real-time?** Hard: a missed deadline is a system failure. Soft: missed deadlines degrade quality.

**43. Super loop vs RTOS — when would you choose each?** Super loop for simple, single-purpose, very constrained devices; RTOS for multiple independent timing requirements, complex comms stacks, and when blocking APIs simplify code.

**44. How do you estimate battery life?** I_avg = Σ(Iᵢ·tᵢ)/T over a duty cycle; life ≈ capacity / I_avg, derated for temperature, self-discharge and end voltage.

**45. What does a linker script do?** Defines memory regions and places sections (vector table, .text, .data load/run addresses, .bss, stack/heap) into them; exports symbols used by startup code.

## Coding questions frequently asked in embedded loops

- Implement `memcpy`/`memmove`, `strcpy`, `atoi`, `itoa`.
- Reverse bits / count set bits / check power of two / swap endianness.
- Implement a ring buffer (thread/ISR-safe).
- Implement a fixed-block memory pool.
- Debounce a button; implement a state machine (traffic light, vending machine).
- Parse a UART protocol frame with a state machine (sync byte, length, payload, CRC).
- Implement a moving average / low-pass filter in fixed point.
- Implement a software timer list (sorted linked list of expirations).

All of the first group are in *Problems → C & Embedded Classics*.
