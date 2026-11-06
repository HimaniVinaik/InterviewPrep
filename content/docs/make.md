# Make & Makefiles

> **Key idea:** `make` is a **dependency-graph executor**. A Makefile lists *rules*: "to build this **target** from these **prerequisites**, run this **recipe**". Make walks the graph and rebuilds a target only if it is missing or **older than any of its prerequisites** (by file modification time). Everything else is convenience: variables, pattern rules, functions and automatic header dependencies. Make is still everywhere: the Linux kernel, vendor MCU SDKs, open-source C libraries, and CMake's "Unix Makefiles" generator. Knowing it well means you can read any build, fix "why didn't this rebuild?", and write a small, correct, parallel-safe Makefile from memory.

**What you'll be able to do after this guide**
- Write rules and predict exactly what rebuilds after any edit.
- Use the variable flavours (`=`, `:=`, `?=`, `+=`), override precedence, target-specific variables and automatic variables.
- Use pattern rules, the built-in implicit rules and their conventional variables (`CC`, `CXX`, `CPPFLAGS`, `CXXFLAGS`, `LDFLAGS`, `LDLIBS`).
- Generate header dependencies automatically with `-MMD -MP`, and explain what each flag does.
- Use functions: `wildcard`, `patsubst`, `filter`, `foreach`, `call`, `eval`, `shell`.
- Write a complete out-of-source Makefile with subdirectories, a static library, tests and debug/release modes.
- Run builds in parallel safely, avoid recursive-make pitfalls, and debug Makefiles.
- Cross-compile firmware for a Cortex-M target with Make.

> **Note:** Recipe lines in Makefiles must start with a **TAB character**. The examples on this page use real tabs, so you can copy them. Every Makefile here was run with GNU Make 4.3, and the outputs shown are real.

---

## 1. Rules: target, prerequisites, recipe

```make
target: prerequisites
	recipe line 1
	recipe line 2
```

A minimal project with three rules:

```make
app: main.o util.o
	g++ main.o util.o -o app

main.o: main.cpp util.h
	g++ -c main.cpp -o main.o

util.o: util.cpp util.h
	g++ -c util.cpp -o util.o
```

Running `make` builds the **first** target in the file, the *default goal* (conventionally `all`). Make works backwards from it. Here is the real transcript after a series of edits:

```text
$ make                          # first build: everything
g++ -c main.cpp -o main.o
g++ -c util.cpp -o util.o
g++ main.o util.o -o app

$ make                          # nothing changed
make: 'app' is up to date.

$ touch main.cpp && make        # only main.o is out of date, then app
g++ -c main.cpp -o main.o
g++ main.o util.o -o app

$ touch util.h && make          # both objects depend on util.h
g++ -c main.cpp -o main.o
g++ -c util.cpp -o util.o
g++ main.o util.o -o app
```

How make decides, for each target, depth-first:
1. Bring every prerequisite up to date first (recursively).
2. If the target file doesn't exist, **or** any prerequisite is newer than it, run the recipe.
3. Otherwise do nothing.

> **Pitfall:** `Makefile:2: *** missing separator.  Stop.` almost always means a recipe line is indented with **spaces** instead of a tab. Configure your editor to keep literal tabs in Makefiles. GNU Make 3.82+ also lets you choose another prefix with `.RECIPEPREFIX = >`.

### 1.1 Each recipe line runs in its own shell

```make
wrong:
	cd build
	ls                      # runs in the ORIGINAL directory: the `cd` happened in another shell

right:
	cd build && ls          # one line = one shell
	@echo "done"            # @ = don't echo the command; - prefix = ignore its errors
```

Use `&&` or `\` line continuations, or `.ONESHELL:` to run a whole recipe in one shell. Shell variables need `$$` (`$$i`), because a single `$` is a Make variable.

---

## 2. Variables

```make
CXX      := g++
CXXFLAGS := -std=c++20 -Wall -Wextra -O2
LDLIBS   := -lpthread

SRCS := main.cpp util.cpp
OBJS := $(SRCS:.cpp=.o)          # substitution reference: main.o util.o

app: $(OBJS)
	$(CXX) $(LDFLAGS) $^ $(LDLIBS) -o $@
```

| Assignment | Name | Meaning |
|---|---|---|
| `X = v` | recursive | stored unexpanded; expanded **every time** `X` is used (late binding) |
| `X := v` (`::=` in POSIX) | simple | expanded **once, now** (like a normal programming variable) — prefer this |
| `X ?= v` | conditional | set only if `X` isn't already set (by the environment or the command line) |
| `X += v` | append | keeps `X`'s flavour |
| `X != cmd` | shell | the output of a shell command (same as `X := $(shell cmd)`) |

The difference between `=` and `:=` is real:

```make
A = $(B)
B = later
C := $(D)
D = later
all:
	@echo "A=[$(A)] C=[$(C)]"
```

```text
$ make
A=[later] C=[]
```

`A` was expanded when it was used, after `B` was defined. `C` was expanded at its definition, when `D` was still empty. Recursive variables can't refer to themselves (`X = $(X) more` is an error), and they re-run `$(shell ...)` every time they're used, which is a common cause of slow Makefiles.

### 2.1 Where values come from (precedence)

From highest to lowest:
1. `override` directives in the Makefile.
2. The **command line**: `make CXXFLAGS="-O0 -g"` beats any assignment in the file.
3. Assignments in the Makefile.
4. The **environment** (`export CXX=clang++`). With `make -e`, the environment beats the Makefile.
5. Make's built-in defaults (`CXX = g++`, `CC = cc`, `RM = rm -f`, `AR = ar`).

This is why `CXX ?= g++` rarely does anything: `CXX` always has a built-in default. Use `CXX := g++` if you want to force it, or leave it alone and let users pass `make CXX=clang++`.

### 2.2 Target-specific variables

```make
debug: CXXFLAGS += -O0 -g -fsanitize=address
debug: app                 # building app *through* debug uses the extra flags
```

The values apply while that target and its prerequisites are being built. One catch: if `app` is already up to date, `make debug` prints "Nothing to be done". Changing flags doesn't change any timestamps (see §8).

---

## 3. Automatic variables

Automatic variables are set by Make for each rule, inside the recipe:

| Variable | Meaning | In `build/obj/net/ping.o: src/net/ping.cpp include/net.h` |
|---|---|---|
| `$@` | the target | `build/obj/net/ping.o` |
| `$<` | the **first** prerequisite | `src/net/ping.cpp` |
| `$^` | all prerequisites, deduplicated | `src/net/ping.cpp include/net.h` |
| `$+` | all prerequisites, with duplicates (link order for libraries) | |
| `$?` | prerequisites newer than the target | |
| `$*` | the stem matched by `%` | `net/ping` |
| `$(@D)` / `$(@F)` | directory / file part of `$@` | `build/obj/net` / `ping.o` |
| `$\|` | order-only prerequisites | |

---

## 4. Pattern rules, implicit rules and static pattern rules

```make
%.o: %.cpp
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -c $< -o $@
```

`%` matches any non-empty stem. This one rule compiles any `.cpp` into the `.o` with the same stem.

Make also has **built-in implicit rules**. With no rule at all for `server.o`, Make finds `server.cpp` and runs `$(CXX) $(CXXFLAGS) $(CPPFLAGS) $(TARGET_ARCH) -c -o server.o server.cpp`. That is why these variable names are conventional:

| Variable | Used for |
|---|---|
| `CC`, `CXX` | C / C++ compiler |
| `CPPFLAGS` | **pre**processor flags: `-I`, `-D`, `-MMD` (shared by C and C++) |
| `CFLAGS`, `CXXFLAGS` | compiler flags: `-O2`, `-Wall`, `-std=` |
| `LDFLAGS` | linker flags placed **before** the objects: `-L`, `-Wl,...`, `-fsanitize` |
| `LDLIBS` | libraries placed **after** the objects: `-lm -lpthread` (link order!) |
| `AR`, `ARFLAGS`, `RM` | archiver and its flags, `rm -f` |

`make -p -f /dev/null` prints the whole built-in database. Large projects often disable it with `MAKEFLAGS += -rR` (no built-in rules or variables), for speed and predictability.

**Static pattern rules** restrict a pattern to an explicit list of targets:

```make
OBJS := build/main.o build/util.o
$(OBJS): build/%.o: src/%.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@
```

**`vpath`** tells Make where to search for prerequisites, for example `vpath %.c src drivers`. It's handy when sources are spread across directories but objects all go into one.

---

## 5. Phony targets, order-only prerequisites and special targets

```make
.PHONY: all clean run test

all: app

clean:
	$(RM) -r build app

run: app
	./app
```

`.PHONY` marks targets that aren't files. Without it, if someone creates a file called `clean`, then `make clean` says "'clean' is up to date" and does nothing. Phony targets also skip the implicit-rule search, which makes them faster.

**Order-only prerequisites**, written after a `|`, must *exist* before the target is built, but their timestamps don't cause rebuilds. A build directory is the textbook case: a directory's timestamp changes every time a file is added to it, so a normal prerequisite would rebuild everything.

```make
build/%.o: src/%.cpp | build
	$(CXX) $(CXXFLAGS) -c $< -o $@

build:
	mkdir -p $@
```

| Special target | Effect |
|---|---|
| `.PHONY:` | not a file; always considered out of date |
| `.DELETE_ON_ERROR:` | delete a target whose recipe failed (no half-written `.o` that looks up to date) — **always add this** |
| `.DEFAULT_GOAL := all` | choose the default goal explicitly |
| `.SECONDARY:` / `.PRECIOUS:` | keep intermediate files |
| `.NOTPARALLEL:` | disable `-j` for this Makefile |
| `.ONESHELL:` | run each recipe in a single shell |
| `.SUFFIXES:` (empty) | clear the old suffix rules |

---

## 6. Automatic header dependencies

If `main.cpp` includes `util.h` and you forget to list it, editing the header won't rebuild `main.o`. You get a stale binary, or bizarre ODR crashes when a struct's layout changed. Listing headers by hand doesn't scale. Let the compiler write the dependencies:

```make
CPPFLAGS += -MMD -MP            # while compiling foo.o, also write foo.d
-include $(OBJS:.o=.d)          # include all .d files; '-' = ignore ones that don't exist yet
```

This is the real `build/obj/net/ping.d` produced by the full Makefile in §8:

```text
build/obj/net/ping.o: src/net/ping.cpp include/net.h include/util.h
include/net.h:
include/util.h:
```

| Flag | Meaning |
|---|---|
| `-MD` / `-MMD` | write a `.d` file as a side effect of compiling (`-MMD` skips system headers) |
| `-MP` | add an empty rule for each header (the last two lines). If you **delete** a header, Make doesn't fail with "No rule to make target 'include/net.h'" |
| `-MF file` | choose the `.d` file name |
| `-MT target` | choose the target name written in the rule |

On the very first build no `.d` files exist. That's fine: every object must be built anyway. After that, the `.d` files are refreshed on every compile.

---

## 7. Functions

```make
SRCS    := $(wildcard src/*.cpp)                  # glob (non-recursive)
ALLSRCS := $(shell find src -name '*.cpp')        # recursive, via the shell
OBJS    := $(patsubst src/%.cpp,build/%.o,$(SRCS))
OBJS2   := $(SRCS:src/%.cpp=build/%.o)            # same thing, shorter
NAMES   := $(notdir $(SRCS))                      # strip directories
BASES   := $(basename $(NAMES))                   # strip extensions
TESTS   := $(filter test_%,$(BASES))              # keep matching words
PROD    := $(filter-out test_%,$(BASES))          # drop matching words
SORTED  := $(sort $(SRCS))                        # sort AND deduplicate
COUNT   := $(words $(SRCS))
FIRST   := $(firstword $(SRCS))
DIRS    := $(sort $(dir $(OBJS)))                 # unique directories
INCS    := $(addprefix -I,include third_party/include)
$(info Building $(COUNT) files)                   # print while parsing
$(warning Deprecated option used)                 # print with file:line
# $(error Missing toolchain)                      # abort with a message
```

**`call`, `foreach` and `eval`** generate rules programmatically, for example one link rule per program:

```make
PROGRAMS := server client
server_LIBS := -lpthread
client_LIBS :=

# A user-defined function: $(1) is the program name.
define PROGRAM_template
$(1): $(1).o
	$$(CXX) $$^ $$($(1)_LIBS) -o $$@
endef

.PHONY: all
all: $(PROGRAMS)
$(foreach prog,$(PROGRAMS),$(eval $(call PROGRAM_template,$(prog))))

greet = Hello, $(1)! You are $(2).
$(info $(call greet,make,ready))
SRCS := $(wildcard *.cpp)
$(info $(words $(SRCS)) sources: $(sort $(SRCS)); bases: $(basename $(SRCS)); upper: $(shell echo hi | tr a-z A-Z))
```

```text
$ make
Hello, make! You are ready.
2 sources: client.cpp server.cpp; bases: client server; upper: HI
g++    -c -o server.o server.cpp          <- built-in implicit rule
g++ server.o -lpthread -o server          <- generated by eval
g++    -c -o client.o client.cpp
g++ client.o  -o client
```

Inside the template, `$$` survives the first expansion done by `call`, so `$$@` becomes `$@` when `eval` parses the generated rule. `$(1)` is substituted immediately.

**Conditionals** are evaluated while the Makefile is parsed:

```make
ifeq ($(DEBUG),1)
  CXXFLAGS += -O0 -g
else ifeq ($(PROFILE),1)
  CXXFLAGS += -O2 -pg
else
  CXXFLAGS += -O2 -DNDEBUG
endif

ifdef VERBOSE
  Q :=
else
  Q := @                          # prefix commands with $(Q) to hide them unless VERBOSE=1
endif

UNAME := $(shell uname -s)
ifeq ($(UNAME),Darwin)
  LDLIBS += -framework CoreFoundation
endif
```

---

## 8. A complete, reusable Makefile

The Makefile below has: sources in nested directories, a mirrored object tree, automatic dependencies, a static library of everything except `main`, unit tests linked against that library, and debug/release modes. The project layout:

```text
project/
├── Makefile
├── include/   util.h  net.h
├── src/       main.cpp  util.cpp  net/ping.cpp
└── tests/     test_util.cpp
```

```make
# ---- Configuration (override on the command line: make CXX=clang++ DEBUG=1) ----
TARGET    := app
BUILD_DIR := build
SRC_DIR   := src
INC_DIR   := include
TEST_DIR  := tests

CXX       ?= g++
CPPFLAGS  := -I$(INC_DIR) -MMD -MP
CXXFLAGS  := -std=c++20 -Wall -Wextra -Wpedantic
LDFLAGS   :=
LDLIBS    :=

ifeq ($(DEBUG),1)
  CXXFLAGS += -O0 -g -fsanitize=address,undefined
  LDFLAGS  += -fsanitize=address,undefined
else
  CXXFLAGS += -O2 -DNDEBUG
endif

# ---- Files (recursive source discovery, mirrored object tree) ----
SRCS      := $(shell find $(SRC_DIR) -name '*.cpp')
OBJS      := $(SRCS:$(SRC_DIR)/%.cpp=$(BUILD_DIR)/obj/%.o)
LIB_OBJS  := $(filter-out $(BUILD_DIR)/obj/main.o,$(OBJS))
TEST_SRCS := $(wildcard $(TEST_DIR)/*.cpp)
TEST_BINS := $(TEST_SRCS:$(TEST_DIR)/%.cpp=$(BUILD_DIR)/tests/%)
DEPS      := $(OBJS:.o=.d) $(TEST_BINS:=.d)

# ---- Rules ----
.PHONY: all clean run test
.DELETE_ON_ERROR:

all: $(BUILD_DIR)/$(TARGET)

$(BUILD_DIR)/$(TARGET): $(OBJS)
	$(CXX) $(LDFLAGS) $^ $(LDLIBS) -o $@

$(BUILD_DIR)/libcore.a: $(LIB_OBJS)
	$(AR) rcs $@ $^

$(BUILD_DIR)/obj/%.o: $(SRC_DIR)/%.cpp
	@mkdir -p $(@D)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -c $< -o $@

$(BUILD_DIR)/tests/%: $(TEST_DIR)/%.cpp $(BUILD_DIR)/libcore.a
	@mkdir -p $(@D)
	$(CXX) $(CPPFLAGS) -std=c++20 -Wall -g $< $(BUILD_DIR)/libcore.a -o $@

run: all
	./$(BUILD_DIR)/$(TARGET)

test: $(TEST_BINS)
	@for t in $^; do echo "running $$t"; ./$$t || exit 1; done
	@echo "all tests passed"

clean:
	$(RM) -r $(BUILD_DIR)

-include $(DEPS)
```

A real session with it:

```text
$ make -j4
g++ -Iinclude -MMD -MP -std=c++20 -Wall -Wextra -Wpedantic -O2 -DNDEBUG -c src/net/ping.cpp -o build/obj/net/ping.o
g++ -Iinclude -MMD -MP -std=c++20 -Wall -Wextra -Wpedantic -O2 -DNDEBUG -c src/util.cpp -o build/obj/util.o
g++ -Iinclude -MMD -MP -std=c++20 -Wall -Wextra -Wpedantic -O2 -DNDEBUG -c src/main.cpp -o build/obj/main.o
g++  build/obj/net/ping.o build/obj/util.o build/obj/main.o  -o build/app

$ make run
./build/app
add=5 ping=42

$ make test
ar rcs build/libcore.a build/obj/net/ping.o build/obj/util.o
g++ -Iinclude -MMD -MP -std=c++20 -Wall -g tests/test_util.cpp build/libcore.a -o build/tests/test_util
running build/tests/test_util
all tests passed

$ touch include/net.h && make          # the .d files know who includes net.h
g++ ... -c src/net/ping.cpp -o build/obj/net/ping.o
g++ ... -c src/main.cpp -o build/obj/main.o
g++  build/obj/net/ping.o build/obj/util.o build/obj/main.o  -o build/app
```

Design notes:
- `@mkdir -p $(@D)` inside the compile rule creates nested object directories on demand. That is simpler than order-only directory targets when the tree is deep.
- `$(TEST_BINS:=.d)` picks up the dependency files that `-MMD` writes next to each test binary.
- `$(LDFLAGS)` goes before the objects and `$(LDLIBS)` after them, because GNU ld resolves symbols left to right.
- `.DELETE_ON_ERROR` stops a failed compile from leaving a broken `.o` that looks up to date.
- **Changing `DEBUG` doesn't rebuild the objects** (no timestamps changed). Run `make clean` first, use separate build directories per configuration (`BUILD_DIR := build/$(if $(DEBUG),debug,release)`), or use the flags-stamp trick in Practice 4.

---

## 9. Libraries and multiple binaries

```make
LIB     := build/libmath.a
LIBOBJS := build/vec.o build/mat.o

$(LIB): $(LIBOBJS)
	$(AR) rcs $@ $^                         # r = insert/replace, c = create, s = write index

build/solver: build/solver.o $(LIB)
	$(CXX) $(LDFLAGS) $< -Lbuild -lmath $(LDLIBS) -o $@   # the library comes after the object

SHARED := build/libmath.so
$(SHARED): CXXFLAGS += -fPIC
$(SHARED): $(LIBOBJS)
	$(CXX) -shared $^ -o $@
```

Listing `$(LIB)` as a prerequisite of the binary means editing a library source relinks every program that uses it.

---

## 10. Parallel builds

`make -j8`, or `make -j$(nproc)`, runs independent recipes at the same time. That is only safe if the dependency graph is **complete**. A missing edge becomes a race:

```make
# BUG: app links generated.o, but nothing says generated.cpp must exist before it is compiled.
app: main.o generated.o
	$(CXX) $^ -o $@
generated.cpp: schema.json
	python3 gen.py $< > $@
# With -j, main.o, generated.o and generated.cpp may all start at once.
# Fix: make sure every generated file is a prerequisite of whatever consumes it.
```

- Use `--output-sync=target` (`-Otarget`) to keep each target's output together instead of interleaved.
- `.NOTPARALLEL:` is a last resort for legacy Makefiles.
- Set `MAKEFLAGS += -j$(shell nproc)` in the Makefile only if you're sure the graph is correct.
- A recipe that writes **two** outputs (a generated `.c` and `.h`) needs a *grouped target* (GNU Make 4.3+: `parser.c parser.h &: parser.y`). Otherwise Make may run the recipe twice in parallel.

---

## 11. Recursive vs non-recursive Make

Large projects often have one Makefile per directory and a top level that runs `$(MAKE) -C subdir`:

```make
SUBDIRS := drivers app
.PHONY: all $(SUBDIRS)
all: $(SUBDIRS)
$(SUBDIRS):
	$(MAKE) -C $@                     # always $(MAKE), never plain `make`: it passes -j and flags down
app: drivers                          # declare ordering between sub-builds
```

The classic paper *Recursive Make Considered Harmful* (Peter Miller, 1998) explains the downside. Each sub-make sees only part of the dependency graph, so cross-directory dependencies are missed (stale builds) or forced with coarse ordering (slow builds). The alternative is a **non-recursive** build: one Make process that `include`s a `module.mk` fragment from each directory, so the full graph is visible. The Linux kernel's Kbuild is a hybrid.

---

## 12. Embedded cross-compilation example

```make
PREFIX  := arm-none-eabi-
CC      := $(PREFIX)gcc
OBJCOPY := $(PREFIX)objcopy
SIZE    := $(PREFIX)size

MCU      := -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard
CPPFLAGS := -Iinc -Idrivers/CMSIS/Include -DSTM32F407xx -MMD -MP
CFLAGS   := $(MCU) -std=c11 -Os -g -Wall -Wextra -ffunction-sections -fdata-sections
LDFLAGS  := $(MCU) -T stm32f407.ld -Wl,--gc-sections -Wl,-Map=build/fw.map \
            --specs=nano.specs --specs=nosys.specs -Wl,--print-memory-usage

SRCS := $(wildcard src/*.c) startup_stm32f407.s
OBJS := $(addprefix build/,$(notdir $(addsuffix .o,$(basename $(SRCS)))))
vpath %.c src
vpath %.s .

.PHONY: all flash clean
.DELETE_ON_ERROR:

all: build/fw.bin

build/fw.bin: build/fw.elf
	$(OBJCOPY) -O binary $< $@
	$(SIZE) $<

build/fw.elf: $(OBJS) stm32f407.ld
	$(CC) $(LDFLAGS) $(OBJS) -o $@

build/%.o: %.c | build
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

build/%.o: %.s | build
	$(CC) $(MCU) -c $< -o $@

build:
	mkdir -p $@

flash: build/fw.bin
	st-flash write $< 0x08000000

clean:
	$(RM) -r build

-include $(OBJS:.o=.d)
```

Points interviewers look for:
- The linker script is a prerequisite of the `.elf`, so editing memory regions relinks.
- `-ffunction-sections -fdata-sections` combined with `-Wl,--gc-sections` drops unused code.
- `-Os` optimises for flash size.
- `--specs=nano.specs` selects newlib-nano, a smaller C library.
- `-Map` writes a linker map for size analysis.
- `objcopy` turns the ELF into a raw image, and `size` reports flash and RAM usage.

---

## 13. Debugging Makefiles

| Command | Shows |
|---|---|
| `make -n` | dry run: the commands that *would* run |
| `make --trace` | each target that's rebuilt **and why** (which prerequisite is newer) |
| `make -d` / `--debug=b` | the full decision log (very verbose) / basic decisions only |
| `make -p` | the whole database: variables, rules, implicit rules |
| `make -B` | unconditionally rebuild everything |
| `make print-VAR` with `print-%: ; @echo $*=$($*)` | the value of any variable |
| `$(info ...)`, `$(warning ...)` | print while parsing |
| `make V=1` / `VERBOSE=1` | a project convention to show the commands it hides with `@` |

```make
print-%:
	@echo '$*=$($*)'
```

```text
$ make print-OBJS
OBJS=build/obj/net/ping.o build/obj/util.o build/obj/main.o
```

---

## 14. Make vs CMake vs Ninja

| Tool | What it is | When |
|---|---|---|
| **Make** | executes a dependency graph you write by hand | small or embedded projects, vendor SDKs, glue tasks |
| **CMake** | a *generator*: writes Makefiles, Ninja files or IDE projects from a cross-platform description | most C++ projects; libraries others consume; Windows + Linux + macOS |
| **Ninja** | a minimal, very fast graph executor, meant to be generated (by CMake, Meson, GN) | the backend for large builds |
| **Bazel/Buck** | hermetic, cached, distributed builds | monorepos |

You'll often use Make as a thin wrapper around CMake (`make build` → `cmake --build build`). Make is also a handy task runner for `lint`, `format` and `flash` targets.

---

## 15. Interview checklist

- [ ] Rule anatomy; tabs; the default goal; the timestamp rule; predict what rebuilds.
- [ ] Each recipe line runs in its own shell; `$$`; `@` and `-` prefixes.
- [ ] `=` vs `:=` vs `?=` vs `+=`, with an example; command-line override precedence.
- [ ] Automatic variables `$@ $< $^ $* $(@D)`.
- [ ] Pattern rules; built-in implicit rules; `CPPFLAGS`/`CXXFLAGS`/`LDFLAGS`/`LDLIBS` and their positions.
- [ ] `.PHONY`, order-only prerequisites, `.DELETE_ON_ERROR`.
- [ ] `-MMD -MP` + `-include`: what each flag does and why `-MP` exists.
- [ ] `wildcard`, `patsubst`, `filter`, `foreach`/`call`/`eval`, `shell`; conditionals.
- [ ] Out-of-source builds with mirrored directories; flags changes don't trigger rebuilds.
- [ ] `-j` needs a complete graph; grouped targets; `$(MAKE) -C`; recursive make's downsides.
- [ ] A cross-compile Makefile: `PREFIX`, `objcopy`, `size`, `--gc-sections`, the map file.

---

## Practice

1. With the three-rule Makefile from §1, which commands run after `touch util.cpp`? After `rm main.o`? After `touch app`?
2. A colleague's Makefile has `SRCS = $(shell find . -name '*.cpp')` and the build has become slow to *start*. Why, and what's the one-character fix?
3. Write a rule that compiles `src/*.c` into `build/*.o` without rebuilding everything whenever a new file is added to `build/`.
4. Make the objects rebuild automatically when `CXXFLAGS` changes (e.g. `make CXXFLAGS=-O0` after a `-O2` build).
5. Why does `make clean` print `make: 'clean' is up to date.` in a repository that contains a directory named `clean/`? Fix it.

:::details Show solution
1. `touch util.cpp` runs `g++ -c util.cpp -o util.o` then `g++ main.o util.o -o app`. `rm main.o` rebuilds `main.o`, then relinks `app`, because the new `main.o` is newer than `app`. `touch app` runs **nothing**: the target is newer than all its prerequisites.
2. `=` makes `SRCS` a *recursive* variable, so `$(shell find ...)` runs again **every time `SRCS` is expanded**. If it's used in several other variables and rules, `find` runs many times. Use `:=` so it runs once: `SRCS := $(shell find . -name '*.cpp')`.
3. Use an order-only prerequisite for the directory:
```make
SRCS := $(wildcard src/*.c)
OBJS := $(SRCS:src/%.c=build/%.o)

build/%.o: src/%.c | build
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

build:
	mkdir -p $@
```
4. Keep a "stamp" file whose *content* is the flags, and rewrite it only when they change. Every object depends on it. This was tested: `make` built with `-O2`, a second `make` did nothing, and `make CXXFLAGS=-O0` rebuilt.
```make
CXXFLAGS ?= -O2
build/flags.stamp: FORCE
	@mkdir -p $(@D)
	@echo '$(CXXFLAGS)' | cmp -s - $@ || echo '$(CXXFLAGS)' > $@
build/server.o: server.cpp build/flags.stamp
	$(CXX) $(CXXFLAGS) -c $< -o $@
.PHONY: FORCE
```
   The stamp's recipe always runs (it depends on the phony `FORCE`), but it only *modifies* the file when the flags differ. If the flags are unchanged, the timestamp stays the same and nothing rebuilds. CMake and Ninja do this automatically, because they track the command line of every output.
5. Make treats `clean` as a file target. The directory `clean/` exists and has no prerequisites, so it's "up to date". Declare it phony with `.PHONY: clean`.
:::

---

## Interview Q&A

- **How does make decide what to rebuild?** Compares modification times of a target and its prerequisites, recursively.
- **`=` vs `:=`?** Recursive (lazy) vs simple (immediate) expansion.
- **What's `.PHONY` for?** Targets that aren't files, so they always run.
- **How do you handle header dependencies?** `-MMD -MP` + `-include *.d`.
- **Why `make -j`?** Parallel builds — requires correct dependencies, or you get races.
- **Make vs CMake?** Make executes a dependency graph; CMake *generates* build files (Makefiles/Ninja/VS) from a higher-level, cross-platform description.
- **What do `$@`, `$<` and `$^` mean?** The target, the first prerequisite, and all prerequisites (deduplicated).
- **Why must recipe lines start with a tab?** It's how make distinguishes recipe lines from rule and variable lines; spaces give "missing separator".
- **Why doesn't `cd dir` on one recipe line affect the next line?** Each recipe line runs in a separate shell; join commands with `&&` or use `.ONESHELL`.
- **What's an order-only prerequisite?** A prerequisite after `|` that must exist before the target is built but whose timestamp doesn't trigger rebuilds — typically an output directory.
- **What does `-MP` add to the dependency file?** An empty phony rule for every header, so deleting or renaming a header doesn't break the build with "No rule to make target".
- **Why use `$(MAKE)` instead of `make` in recipes?** It invokes the same make binary and passes down the jobserver (`-j`), flags and command-line variables to the sub-make.
- **What's the difference between `LDFLAGS` and `LDLIBS`?** `LDFLAGS` holds linker options placed before the objects (`-L`, `-Wl,...`); `LDLIBS` holds libraries placed after them (`-lm`), because GNU ld resolves left to right.
- **Why is recursive make considered harmful?** Each sub-make sees only part of the dependency graph, so cross-directory dependencies are missed or over-serialised — leading to stale or slow builds.

---

## External resources

- **GNU Make Manual** (gnu.org/software/make/manual): especially "How make Reads a Makefile", "Automatic Variables", "Functions".
- **Peter Miller — "Recursive Make Considered Harmful"** (1998).
- **Paul D. Smith — "Advanced Auto-Dependency Generation"** (make.mad-scientist.net) — the `-MMD -MP` technique explained by Make's maintainer.
- **John Graham-Cumming — *The GNU Make Book*** (No Starch Press).
- **The Linux kernel's Kbuild documentation** (Documentation/kbuild) for a large real-world Make system.
