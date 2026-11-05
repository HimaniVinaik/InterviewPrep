# Number Theory for Coders

Number theory shows up in hashing, cryptography, checksums, random number generators, and in "LeetCode math" problems that ask for answers modulo 10⁹+7.

## 1. Divisibility & GCD

**Euclid's algorithm:** gcd(a, b) = gcd(b, a mod b), gcd(a, 0) = a. O(log min(a, b)).

```cpp
long long gcd(long long a, long long b) { while (b) { a %= b; std::swap(a, b); } return a; }
long long lcm(long long a, long long b) { return a / gcd(a, b) * b; }   // divide first: avoids overflow
// C++17: std::gcd, std::lcm in <numeric>
```

**Extended Euclid:** finds x, y with ax + by = gcd(a, b) (Bézout's identity) — used for modular inverses.

```cpp
long long ext_gcd(long long a, long long b, long long& x, long long& y) {
    if (b == 0) { x = 1; y = 0; return a; }
    long long x1, y1;
    long long g = ext_gcd(b, a % b, x1, y1);
    x = y1;
    y = x1 - (a / b) * y1;
    return g;
}
```

Uses: reducing fractions, aspect ratios, gear ratios, timer prescaler/period selection, rotating an array by k (gcd(n, k) cycles).

## 2. Modular arithmetic

a ≡ b (mod m) means m divides a − b.

- (a + b) mod m = ((a mod m) + (b mod m)) mod m
- (a · b) mod m = ((a mod m) · (b mod m)) mod m
- Subtraction: (a − b) mod m = ((a − b) mod m + m) mod m  ← keep it non-negative
- **Division is not distributive** — multiply by the modular inverse instead.

> **Warning:** In C/C++, `%` with a negative left operand gives a negative result: `-7 % 3 == -1`. Normalise with `((a % m) + m) % m`.

```cpp
constexpr long long MOD = 1'000'000'007;   // prime, fits int; products fit in 64-bit
long long mulmod(long long a, long long b) { return a % MOD * (b % MOD) % MOD; }
// For 64-bit moduli use unsigned __int128 to avoid overflow in a*b
```

## 3. Fast (modular) exponentiation

```cpp
long long power(long long base, long long exp, long long mod) {
    long long result = 1;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) result = result * base % mod;
        base = base * base % mod;
        exp >>= 1;
    }
    return result;
}
```

O(log exp) multiplications. Same square-and-multiply idea powers RSA, Diffie–Hellman and matrix exponentiation (Fibonacci in O(log n)).

## 4. Modular inverse

a⁻¹ mod m exists iff gcd(a, m) = 1.

- **Fermat's little theorem** (m prime): a^(m−1) ≡ 1, so a⁻¹ ≡ a^(m−2) mod m → `power(a, MOD - 2, MOD)`.
- General m: extended Euclid.

```cpp
// nCk mod p with precomputed factorials
std::vector<long long> fact(N + 1), inv_fact(N + 1);
fact[0] = 1;
for (int i = 1; i <= N; ++i) fact[i] = fact[i - 1] * i % MOD;
inv_fact[N] = power(fact[N], MOD - 2, MOD);
for (int i = N; i > 0; --i) inv_fact[i - 1] = inv_fact[i] * i % MOD;
auto nCk = [&](int n, int k) { return k < 0 || k > n ? 0 : fact[n] * inv_fact[k] % MOD * inv_fact[n - k] % MOD; };
```

## 5. Primes

```cpp
bool is_prime(long long n) {                       // O(√n)
    if (n < 2) return false;
    if (n % 2 == 0) return n == 2;
    for (long long d = 3; d * d <= n; d += 2) if (n % d == 0) return false;
    return true;
}

std::vector<bool> sieve(int n) {                    // Sieve of Eratosthenes: O(n log log n)
    std::vector<bool> p(n + 1, true);
    p[0] = p[1] = false;
    for (int i = 2; 1LL * i * i <= n; ++i)
        if (p[i]) for (int j = i * i; j <= n; j += i) p[j] = false;
    return p;
}
```

- Fundamental theorem of arithmetic: unique prime factorisation.
- Number of primes ≤ n ≈ n / ln n.
- Factorise by trial division up to √n; for big numbers Pollard's rho; primality via Miller–Rabin (deterministic bases exist for 64-bit).

## 6. Number bases & digits

```cpp
std::string to_base(unsigned long long n, int b) {
    const char* digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (n == 0) return "0";
    std::string s;
    while (n) { s += digits[n % b]; n /= b; }
    return {s.rbegin(), s.rend()};
}
int digit_sum(int n) { int s = 0; for (n = std::abs(n); n; n /= 10) s += n % 10; return s; }
int num_digits(unsigned n) { return n ? int(std::log10(n)) + 1 : 1; }   // or loop; beware float edge cases
```

**Divisibility rules** (by digits): 3 and 9 → digit sum; 11 → alternating sum. A number mod 9 equals its digit sum mod 9 (casting out nines).

## 7. Overflow awareness

| Type | Range |
|---|---|
| `int32_t` | ±2.1 × 10⁹ |
| `uint32_t` | 0 … 4.29 × 10⁹ |
| `int64_t` | ±9.2 × 10¹⁸ |
| `uint64_t` | 0 … 1.8 × 10¹⁹ |

- `int` × `int` overflows before being assigned to `long long`: write `1LL * a * b`.
- Average without overflow: `lo + (hi - lo) / 2` or `std::midpoint`.
- Check before multiplying: `if (a > INT_MAX / b) overflow;` or `__builtin_mul_overflow(a, b, &r)`.

## 8. Hashing & checksums (number theory in practice)

- **Polynomial rolling hash** (Rabin–Karp): h = Σ sᵢ · pⁱ mod M. Rolling update in O(1) for substring search.
- Multiplicative hashing: `(x * 0x9E3779B97F4A7C15ull) >> (64 - bits)` (Fibonacci hashing).
- **Linear congruential generator:** xₙ₊₁ = (a·xₙ + c) mod m — fast, weak randomness.
- **CRC** is polynomial division over GF(2) — see *Math for Embedded Systems*.
- **Luhn checksum** (credit cards), ISBN check digits — mod 10/11 arithmetic.

## Practice

1. gcd(1071, 462)? → 21.
2. 3²⁰⁰ mod 13? By Fermat 3¹² ≡ 1, 200 = 16·12 + 8 → 3⁸ = 6561 ≡ **9** (mod 13).
3. Inverse of 3 mod 11? 3·4 = 12 ≡ 1 → **4**.
4. Why is 10⁹+7 popular? It's prime (inverses exist) and (10⁹+7)² < 2⁶³ (products fit in `long long`).
