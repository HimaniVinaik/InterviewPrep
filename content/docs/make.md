# Make & Makefiles

`make` rebuilds files based on **dependencies** and **timestamps**: if a target is older than any of its prerequisites, run its recipe. It's still everywhere in embedded and Linux projects (kernel, vendor SDKs), and CMake can generate Makefiles for you.

## 1. Rule anatomy

```make
target: prerequisites
	recipe            # MUST start with a TAB character, not spaces
```

```make
app: main.o util.o
	g++ main.o util.o -o app

main.o: main.cpp util.h
	g++ -c main.cpp -o main.o

util.o: util.cpp util.h
	g++ -c util.cpp -o util.o
```

Run `make` (builds the **first** target, by convention `all`) or `make util.o`. Edit `util.h` → both objects and `app` rebuild; edit `main.cpp` → only `main.o` and `app`.

> **Gotcha:** "Makefile:3: *** missing separator. Stop." almost always means a recipe line is indented with spaces instead of a tab.

## 2. Variables

```make
CXX      := g++
CXXFLAGS := -std=c++20 -Wall -Wextra -O2
LDLIBS   := -lpthread

SRC  := main.cpp util.cpp
OBJ  := $(SRC:.cpp=.o)           # substitution reference: main.o util.o

app: $(OBJ)
	$(CXX) $(LDFLAGS) $^ $(LDLIBS) -o $@
```

| Assignment | Meaning |
|---|---|
| `=` | recursive: expanded every time it's used (late binding) |
| `:=` | simple: expanded once, now (prefer this) |
| `?=` | set only if not already set (env/command line can override) |
| `+=` | append |

Override from the command line: `make CXXFLAGS="-O0 -g"`.

## 3. Automatic variables

| Var | Meaning |
|---|---|
| `$@` | the target |
| `$<` | the first prerequisite |
| `$^` | all prerequisites (deduplicated) |
| `$?` | prerequisites newer than the target |
| `$*` | the stem matched by `%` |
| `$(@D)` | directory part of the target |

## 4. Pattern rules

```make
%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@
```

One rule compiles any `.cpp` into its `.o`. Make also has built-in implicit rules (`make -p` prints them) — that's why `CXXFLAGS`/`LDLIBS` are conventional names.

## 5. Phony targets

```make
.PHONY: all clean run test

all: app

clean:
	rm -rf build app

run: app
	./app
```

`.PHONY` tells make these aren't files — otherwise a file named `clean` would make `make clean` do nothing ("up to date").

## 6. Automatic header dependencies

Listing headers by hand is error-prone. Let the compiler generate them:

```make
CXXFLAGS += -MMD -MP           # write main.d next to main.o, listing included headers
-include $(OBJ:.o=.d)          # include them if present (leading '-' ignores missing files)
```

## 7. A complete, reusable Makefile

```make
# ---- Config ---------------------------------------------------------------
TARGET   := app
BUILD    := build
SRC_DIR  := src
INC_DIR  := include

CXX      ?= g++
CXXFLAGS := -std=c++20 -Wall -Wextra -Wpedantic -I$(INC_DIR) -MMD -MP
LDFLAGS  :=
LDLIBS   :=

ifeq ($(DEBUG),1)
  CXXFLAGS += -O0 -g -fsanitize=address,undefined
  LDFLAGS  += -fsanitize=address,undefined
else
  CXXFLAGS += -O2 -DNDEBUG
endif

# ---- Files ----------------------------------------------------------------
SRCS := $(wildcard $(SRC_DIR)/*.cpp)
OBJS := $(patsubst $(SRC_DIR)/%.cpp,$(BUILD)/%.o,$(SRCS))
DEPS := $(OBJS:.o=.d)

# ---- Rules ----------------------------------------------------------------
.PHONY: all clean run

all: $(BUILD)/$(TARGET)

$(BUILD)/$(TARGET): $(OBJS)
	$(CXX) $(LDFLAGS) $^ $(LDLIBS) -o $@

$(BUILD)/%.o: $(SRC_DIR)/%.cpp | $(BUILD)     # '|' = order-only prerequisite
	$(CXX) $(CXXFLAGS) -c $< -o $@

$(BUILD):
	mkdir -p $@

run: all
	./$(BUILD)/$(TARGET)

clean:
	rm -rf $(BUILD)

-include $(DEPS)
```

Usage: `make -j$(nproc)`, `make DEBUG=1`, `make run`, `make clean`.

**Order-only prerequisites** (`| $(BUILD)`) ensure the directory exists without causing rebuilds whenever the directory's timestamp changes.

## 8. Functions

```make
SRCS   := $(wildcard src/*.c)
OBJS   := $(patsubst src/%.c,build/%.o,$(SRCS))
NAMES  := $(notdir $(SRCS))            # strip directories
BASES  := $(basename $(NAMES))         # strip extensions
UPPER  := $(shell echo hi | tr a-z A-Z)
FILTER := $(filter %.c,$(FILES))
$(info Building $(words $(SRCS)) files)   # print during parsing
$(error Missing toolchain)                 # abort
```

## 9. Embedded cross-compilation example

```make
PREFIX  := arm-none-eabi-
CC      := $(PREFIX)gcc
OBJCOPY := $(PREFIX)objcopy
SIZE    := $(PREFIX)size

MCU     := -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard
CFLAGS  := $(MCU) -std=c11 -Os -g -Wall -ffunction-sections -fdata-sections -Iinc -MMD -MP
LDFLAGS := $(MCU) -T stm32f4.ld -Wl,--gc-sections -Wl,-Map=build/fw.map --specs=nano.specs

SRCS := $(wildcard src/*.c) startup_stm32f4.s
OBJS := $(addprefix build/,$(notdir $(addsuffix .o,$(basename $(SRCS)))))
vpath %.c src
vpath %.s .

build/fw.bin: build/fw.elf
	$(OBJCOPY) -O binary $< $@
	$(SIZE) $<

build/fw.elf: $(OBJS)
	$(CC) $(LDFLAGS) $^ -o $@

build/%.o: %.c | build
	$(CC) $(CFLAGS) -c $< -o $@
build/%.o: %.s | build
	$(CC) $(MCU) -c $< -o $@
build:
	mkdir -p $@

.PHONY: flash
flash: build/fw.bin
	st-flash write $< 0x08000000

-include $(OBJS:.o=.d)
```

## 10. Debugging Makefiles

```bash
make -n          # dry run: print commands without running
make -d          # verbose debug of decisions
make -p          # print database (variables + implicit rules)
make --trace     # show why each target is rebuilt
make V=1         # many projects use this to un-silence commands
```

Prefix a recipe line with `@` to not echo it, `-` to ignore its errors.

## Interview Q&A

- **How does make decide what to rebuild?** Compares modification times of a target and its prerequisites, recursively.
- **`=` vs `:=`?** Recursive (lazy) vs simple (immediate) expansion.
- **What's `.PHONY` for?** Targets that aren't files, so they always run.
- **How do you handle header dependencies?** `-MMD -MP` + `-include *.d`.
- **Why `make -j`?** Parallel builds — requires correct dependencies, or you get races.
- **Make vs CMake?** Make executes a dependency graph; CMake *generates* build files (Makefiles/Ninja/VS) from a higher-level, cross-platform description.
