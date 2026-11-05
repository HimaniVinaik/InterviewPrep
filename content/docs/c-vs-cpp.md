# C vs C++ Differences

C++ is *mostly* a superset of C, but not entirely. These differences come up when you switch between the two — and as trick questions.

## 1. Code that's valid C but not valid C++ (or behaves differently)

```c
int *p = malloc(10 * sizeof(int));   /* C: OK (void* converts implicitly). C++: error — needs a cast */

int new = 5, class = 3;              /* C: fine. C++: keywords */

char c = sizeof('a');                /* C: sizeof(int) (4) — char literals are int. C++: 1 */

void f();                            /* C (pre-C23): unspecified parameters! C++: no parameters */
void g(void);                        /* both: no parameters */

const int n = 10;
int arr[n];                          /* C: VLA (or error at file scope). C++: OK, n is a constant expression */

struct S { int x; };
S s;                                 /* C: error — must write `struct S s;` (or typedef). C++: OK */

int x = 1;  int x;                   /* C: tentative definitions allowed at file scope. C++: redefinition */

char name[3] = "abc";                /* C: OK (no room for '\0'). C++: error */

enum Color { RED }; enum Color c = 5;   /* C: OK. C++: error without a cast */

/* C99 designated initialisers in any order */
struct P { int x, y; } p = { .y = 2, .x = 1 };  /* C: OK. C++20: must be in declaration order */
```

| Feature | C | C++ |
|---|---|---|
| `const` globals linkage | external | internal (unless `extern`) |
| `const int` as array size / case label | not a constant expression (until C23 `constexpr`) | constant expression |
| `inline` semantics | C99 "inline definition" rules differ | ODR-based |
| Type punning through unions | allowed | UB (use `memcpy`/`bit_cast`) |
| VLAs | C99 (optional in C11+) | not standard (compiler extension) |
| `restrict` | yes | no (extension `__restrict`) |
| `_Generic`, `_Static_assert` | C11 | templates, `static_assert` |
| `bool` | `_Bool`/`<stdbool.h>` (keyword in C23) | built-in |
| `NULL` | `((void*)0)` typically | `0` or `nullptr`; use `nullptr` |
| String literal type | `char[N]` (writing is UB) | `const char[N]` |
| Empty struct | not allowed (GNU extension) | `sizeof` = 1 |
| Character literal `'a'` | `int` | `char` |
| Implicit `int` | removed in C99 | never |
| Function overloading | no (`_Generic` emulation) | yes |
| Default arguments, references, namespaces, classes, templates, exceptions, RAII | no | yes |

## 2. Linking C and C++

```cpp
// C header usable from C++
#ifdef __cplusplus
extern "C" {
#endif
void hal_init(void);
#ifdef __cplusplus
}
#endif
```

- C++ mangles names; `extern "C"` turns that off for those declarations.
- You can't overload `extern "C"` functions.
- Exceptions must not propagate through C frames.
- Pass only C-compatible types (PODs, pointers) across the boundary.

## 3. Memory management

| C | C++ |
|---|---|
| `malloc`/`calloc`/`realloc`/`free` — raw bytes, no constructors | `new`/`delete` call constructors/destructors |
| returns `NULL` on failure | throws `std::bad_alloc` (or `new (std::nothrow)` returns `nullptr`) |
| manual cleanup on every path (`goto cleanup;` idiom) | RAII: destructors clean up automatically |

```c
/* The C "goto cleanup" idiom */
int load(const char *path) {
    int rc = -1;
    FILE *f = fopen(path, "rb");
    if (!f) goto out;
    char *buf = malloc(4096);
    if (!buf) goto close_file;
    /* ... */
    rc = 0;
    free(buf);
close_file:
    fclose(f);
out:
    return rc;
}
```

## 4. Should you use C++ on a microcontroller?

Yes — with discipline. Zero-cost features are a big win: classes, namespaces, references, `constexpr`, templates, `enum class`, `std::array`, `std::span`, RAII lock guards, lambdas.

Commonly disabled/avoided: exceptions (`-fno-exceptions`), RTTI (`-fno-rtti`), dynamic allocation after init, iostreams (huge code size), `std::function` (may allocate). Use the ETL or fixed-capacity containers instead of `std::vector`.

## Interview Q&A

- **Is C a subset of C++?** No — there are valid C programs that aren't valid C++ (implicit `void*` conversion, keyword identifiers) and constructs that mean different things (`sizeof('a')`).
- **Why can't you call a C++ function from C directly?** Name mangling and possibly calling conventions/exceptions — export it with `extern "C"`.
- **What's the C equivalent of a C++ class?** A struct plus functions taking a pointer to it (`uart_write(uart_t *self, ...)`), with function-pointer tables for polymorphism (a manual vtable).
