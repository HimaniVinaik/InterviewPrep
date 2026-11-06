# How to Ace an LLD Interview

**Low-level design (LLD)**, also called object-oriented design or machine coding, asks you to design classes, interfaces and interactions for a bounded problem — "Design a parking lot", "Design an elevator controller", "Design a logger" — and often write compilable code in 45–60 minutes.

## The framework (memorise this)

| Step | Time | What you do |
|---|---|---|
| 1. Clarify requirements | 5 min | functional requirements, scope, constraints, what's out of scope |
| 2. Identify entities | 5 min | nouns → classes, verbs → methods |
| 3. Define relationships | 5 min | has-a / is-a / uses, multiplicities |
| 4. Design interfaces | 10 min | public APIs, abstractions for things that vary |
| 5. Choose patterns | (ongoing) | Strategy, State, Observer, Factory where they *earn their keep* |
| 6. Write code | 15–20 min | core classes first, then the main flow |
| 7. Walk through & extend | 5 min | trace a use case, discuss concurrency, testing, extensions |

## Step 1 — Clarify requirements

Ask, don't assume. For a **parking lot**:
- How many floors/levels? Vehicle types (motorbike, car, truck)? Spot sizes?
- Payment: hourly? Different rates? Pay at exit?
- Entry/exit gates: how many? Concurrent?
- Display of free spots? Reservations?
- Is persistence in scope? (usually no — in-memory)

Write the agreed list down. It becomes your acceptance criteria.

## Step 2 — Entities

Underline nouns: *parking lot, level, spot, vehicle, ticket, gate, payment, rate*. Not every noun becomes a class — attributes (colour, plate number) stay fields.

## Step 3 — Relationships

```text
ParkingLot 1──* Level 1──* Spot
Spot 0..1──1 Vehicle (when occupied)
Ticket ──> Vehicle, Spot, entryTime
Gate ──uses──> ParkingLot, PricingStrategy
Vehicle <|── Car, Bike, Truck   (or an enum + size)
```

Prefer **composition**. Use inheritance only where behaviour genuinely differs polymorphically.

## Step 4 — Interfaces for what varies

Ask: *what is likely to change?* That's where an interface (or a `std::function`/concept) belongs:
- Pricing rules → `IPricingStrategy`.
- Spot allocation policy (nearest, by level) → `ISpotAllocator`.
- Payment providers → `IPaymentGateway`.

Things that won't change can be concrete classes.

## Step 5 — Patterns that frequently fit

| Problem smell | Pattern |
|---|---|
| Behaviour depends on a mode (elevator moving/idle/doors open; vending machine) | **State** |
| Interchangeable algorithms (pricing, scheduling, eviction) | **Strategy** |
| Notify displays/subscribers on change | **Observer** |
| Creating objects by type string/config | **Factory** |
| Undo, request queues | **Command** |
| Single shared resource manager | Singleton → but prefer one instance + DI |
| Configurable complex objects | **Builder** |

## Step 6 — Code quality signals interviewers look for

- **Clear names**, small classes with one responsibility.
- **Encapsulation:** private data, invariants maintained by methods.
- **Ownership is explicit:** `std::unique_ptr` for owned polymorphic objects, references for non-owning, `std::optional` for "may not exist".
- **Error handling:** what happens when the lot is full? Return `std::optional<Ticket>` or `std::expected`.
- **Enums over magic values:** `enum class SpotSize { Small, Medium, Large };`
- **Const-correctness.**
- **Thread safety** where concurrency is in scope (multiple gates!): a mutex around allocation, or per-level locks.
- **Testability:** dependencies injected, time injected via a clock interface.

```cpp
struct IClock { virtual ~IClock() = default; virtual std::chrono::system_clock::time_point now() const = 0; };
// Production uses system_clock; tests use a FakeClock you can advance.
```

## Step 7 — Walkthrough & extensions

Trace one flow out loud: *"A car arrives at gate 1 → `Gate::enter(car)` → `lot.allocate(car.size())` → returns spot 2-17 → ticket issued with entry time…"* Then discuss:
- How would you add EV charging spots? (new `SpotFeature` flag / subclass; allocator filters.)
- How would you persist state? (repository interface.)
- How would you scale to 100 lots? (that's HLD — a service per lot, central DB.)
- Concurrency: two gates allocating the last spot simultaneously → lock or atomic CAS on spot state.

## UML cheat-sheet for the whiteboard

```text
 ┌──────────────┐        Association:    A ─────> B
 │  ClassName   │        Composition:    A ◆────── B   (A owns B, B dies with A)
 ├──────────────┤        Aggregation:    A ◇────── B   (A has B, B can outlive A)
 │ - field: T   │        Inheritance:    B ──────▷ A
 ├──────────────┤        Implements:     B - - - -▷ IA
 │ + method()   │        Dependency:     A - - - -> B   (uses temporarily)
 └──────────────┘        Multiplicity:   1, 0..1, *, 1..*
```

## Common LLD questions (practice list)

1. Parking lot ★
2. LRU / LFU cache ★
3. Elevator system ★
4. Rate limiter (token bucket) ★
5. Logger with levels and sinks ★
6. Thread pool / task scheduler ★
7. Vending machine (State pattern)
8. Library management system
9. Snake & ladder / Tic-tac-toe / Chess
10. Splitwise (expense sharing)
11. Pub/sub message broker (in-process)
12. File system (Composite)
13. Traffic light controller / washing machine FSM (embedded favourites)
14. Memory allocator / object pool (embedded favourite)
15. Event scheduler / timer wheel

★ = worked out in *LLD Worked Examples*.

## Mistakes to avoid

- Jumping into code before agreeing on requirements.
- God classes (`ParkingLotManager` doing everything).
- Inheritance for code reuse ("Truck extends Car").
- Patterns for their own sake — justify each one.
- Ignoring failure paths (lot full, invalid ticket, payment declined).
- Silence. Narrate your trade-offs continuously.

## Interview Q&A

- **What are the steps of a good low-level design interview?** Clarify requirements, identify entities, define relationships, design interfaces for what varies, choose patterns where they earn their keep, write core code, then walk through a use case and discuss extensions.
- **How do you decide where to put an interface?** Ask what is likely to change (pricing rules, allocation policies, storage, transports) and put an abstraction there; keep stable parts concrete.
- **How do you make an LLD testable?** Inject dependencies (including a clock), avoid global singletons, keep classes small with single responsibilities, and return explicit results (optional/expected) for failure paths.
- **Composition vs aggregation in UML?** Composition (filled diamond) means the whole owns the part and it dies with it; aggregation (hollow diamond) means a has-a relationship where the part can outlive the whole.
