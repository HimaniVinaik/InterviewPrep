# Operating Systems Concepts

OS fundamentals come up in systems, embedded Linux, backend and infrastructure interviews. Know the concepts and how they show up in real code.

## 1. Processes vs threads

| | Process | Thread |
|---|---|---|
| Address space | own (isolated) | shared with other threads of the process |
| Creation cost | high (`fork`: page tables, copy-on-write) | lower |
| Communication | IPC (pipes, sockets, shared memory) | shared memory directly (needs synchronisation) |
| Crash impact | isolated | takes down the whole process |
| Context switch | more expensive (address-space switch, TLB flush unless PCID/ASID) | cheaper |

A process contains: code, data, heap, one stack **per thread**, file descriptors, credentials, signal handlers.

```c
pid_t pid = fork();                 /* duplicate the process (copy-on-write) */
if (pid == 0) {                     /* child */
    execlp("ls", "ls", "-l", NULL); /* replace the program image */
    _exit(127);
}
int status; waitpid(pid, &status, 0);   /* parent reaps the child (else: zombie) */
```

**Zombie:** exited child not yet reaped by its parent. **Orphan:** parent died; adopted by init/systemd.

## 2. Process states & scheduling

```text
 new → ready ⇄ running → terminated
          ↑        ↓
          └─ blocked (waiting for I/O, lock, sleep)
```

| Scheduler | Idea | Notes |
|---|---|---|
| FCFS | first come, first served | convoy effect |
| SJF / SRTF | shortest job first | optimal average wait; needs prediction |
| Round robin | time slices | fair, responsive |
| Priority | highest priority first | starvation → aging |
| Multilevel feedback queue | adaptive priorities | classic Unix |
| CFS / EEVDF (Linux) | fair share by virtual runtime (red-black tree / eligible deadlines) | default Linux scheduler |
| Real-time: `SCHED_FIFO`/`SCHED_RR`, EDF | strict priorities / earliest deadline | RTOS-like behaviour on Linux |

**Context switch:** save registers/PC/SP of the current thread, pick the next, restore its state; for processes also switch page tables.

## 3. Memory management

### Virtual memory

Each process sees a private virtual address space. The **MMU** translates virtual → physical via **page tables** (typically 4 KB pages, multi-level tables; 2 MB/1 GB huge pages). The **TLB** caches recent translations.

Benefits: isolation, each process can use the same addresses, overcommit/lazy allocation, memory-mapped files, shared libraries mapped once, copy-on-write `fork`.

**Page fault:** access to a page not currently mapped. *Minor* (page in memory, just map it), *major* (load from disk/swap), or *invalid* (segfault — SIGSEGV).

**Page replacement:** LRU approximations (clock algorithm). **Thrashing:** working set exceeds RAM → constant swapping.

### Process address space (Linux, x86-64)

```text
 0x7fff...  stack (grows down), env, args
            memory-mapped region: shared libs, mmap(), thread stacks
            heap (brk/sbrk grows up; malloc uses brk for small, mmap for large)
            .bss / .data
 0x0040...  .text / .rodata
```

### Allocators

`malloc` implementations (glibc ptmalloc, jemalloc, tcmalloc, mimalloc) use size-class bins, per-thread caches and arenas to reduce contention and fragmentation. **Internal fragmentation:** wasted space inside allocated blocks; **external:** free memory split into unusable pieces.

## 4. Synchronisation

- **Critical section** problem: mutual exclusion, progress, bounded waiting.
- Primitives: mutex, spinlock, semaphore, condition variable, read-write lock, barrier, futex (Linux's fast userspace mutex foundation).
- Classic problems: producer–consumer (bounded buffer), readers–writers, dining philosophers (deadlock), sleeping barber.
- **Deadlock conditions (Coffman):** mutual exclusion, hold and wait, no preemption, circular wait. Strategies: prevention (break a condition, e.g. lock ordering), avoidance (Banker's algorithm), detection & recovery, ignore (ostrich).

See *Docs → Concurrency* for C++ code.

## 5. Inter-process communication (IPC)

| Mechanism | Notes |
|---|---|
| Pipes / FIFOs | byte streams between related / unrelated processes |
| Unix domain sockets | bidirectional, can pass file descriptors |
| TCP/UDP sockets | across machines |
| Shared memory (`shm_open` + `mmap`) | fastest; needs synchronisation |
| Message queues (POSIX/System V) | discrete messages |
| Signals | asynchronous notifications (SIGINT, SIGTERM, SIGCHLD); handlers must be async-signal-safe |
| Memory-mapped files | share data via the page cache |
| D-Bus, gRPC | higher-level RPC |

## 6. System calls & kernel/user mode

User code runs in unprivileged mode; system calls (`read`, `write`, `open`, `mmap`, `fork`, `ioctl`) trap into the kernel (via `syscall` instruction). Syscalls are expensive relative to function calls (~100 ns–1 µs) → buffering (stdio), batching (`writev`, io_uring).

```bash
strace -f ./app          # trace syscalls
ltrace ./app             # trace library calls
```

## 7. File systems & I/O

- **Inode:** file metadata + block pointers; directories map names → inodes; hard links share an inode; symlinks are files containing a path.
- **File descriptor:** per-process integer handle to an open file description (offset, flags).
- **Page cache:** the kernel caches file data in RAM; `fsync` forces it to stable storage (durability!).
- **Journaling** (ext4, NTFS) / **copy-on-write** (btrfs, ZFS) for crash consistency.
- Embedded: flash-aware file systems (LittleFS, UBIFS, JFFS2) handle wear levelling and power loss.

### I/O models

| Model | Example |
|---|---|
| Blocking | `read()` waits |
| Non-blocking | `O_NONBLOCK`, returns `EAGAIN` |
| I/O multiplexing | `select`, `poll`, **`epoll`** (Linux), `kqueue` (BSD) — one thread, many sockets |
| Signal-driven / async | POSIX AIO, **io_uring** (submission/completion rings, minimal syscalls) |

`epoll` + non-blocking sockets is the core of nginx, Redis, Node.js, and Asio-based C++ servers.

## 8. Boot process (Linux)

Firmware (BIOS/UEFI, or ROM bootloader on SoCs) → bootloader (GRUB / U-Boot) → kernel (decompress, init hardware, mount rootfs) → init (`systemd`) → services → login. Embedded Linux uses **device trees** to describe hardware to the kernel.

## 9. Kernel concepts for embedded Linux

- **Device drivers:** character devices (`/dev/ttyS0`), block devices, network interfaces; kernel modules (`insmod`, `modprobe`).
- User-space access: `/dev`, `/sys` (sysfs), `ioctl`, `mmap` of device memory, UIO/VFIO, `libgpiod` for GPIO.
- **Interrupt handling:** top half (hard IRQ, minimal) + bottom half (softirq, tasklet, workqueue, threaded IRQ).
- **Real-time Linux:** PREEMPT_RT patches (merged into mainline in 6.12) make most of the kernel preemptible for bounded latency.

## 10. Virtualisation & containers

- **VMs:** hypervisor (KVM, Xen, Hyper-V) virtualises hardware; each VM runs its own kernel.
- **Containers:** share the host kernel; isolation via **namespaces** (pid, net, mount, user…) and resource limits via **cgroups**. Docker/Podman images are layered file systems.

## Interview Q&A

- **What happens when you type `ls` in a shell?** Shell parses input, `fork`s, child `execve`s `/bin/ls` (path lookup), the kernel loads the ELF (dynamic loader maps libc), `ls` makes `getdents`/`stat`/`write` syscalls, exits; the shell `wait`s and prints the next prompt.
- **What is a segfault?** An access to an invalid/unmapped address or with wrong permissions → page fault the kernel can't resolve → SIGSEGV.
- **What is thrashing?** The system spends most of its time paging because the working set exceeds physical memory.
- **Why are threads cheaper than processes?** Shared address space: no page-table switch or TLB flush, cheaper creation.
- **What is copy-on-write?** Pages are shared read-only after `fork`; a write triggers a fault and the kernel copies just that page.
- **Mutex vs spinlock in the kernel?** Spinlocks busy-wait (for short sections, can't sleep, usable in interrupt context); mutexes sleep (longer sections, process context only).
