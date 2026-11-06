/* Content manifest. Each article lives at content/<section>/<id>.md
 * Each problem pattern lives at content/problems/<id>.md
 * `focus: true` marks the topics flagged as current weak areas (shown on the home page).
 */
window.MANIFEST = {
  patterns: {
    // Roadmap levels, top to bottom (like a skill tree). Learn earlier levels first.
    levels: [
      ['arrays-hashing'],
      ['two-pointers', 'stack'],
      ['binary-search', 'sliding-window', 'linked-list'],
      ['trees'],
      ['tries', 'heap', 'backtracking'],
      ['graphs', 'intervals', 'greedy', 'dp-1d'],
      ['advanced-graphs', 'dp-2d', 'bit-manipulation', 'math-geometry'],
      ['c-embedded'],
    ],
    // Standalone paths shown separately from the tree
    extra: ['classics'],
    meta: {
      'arrays-hashing': { title: 'Arrays & Hashing', blurb: 'Hash maps/sets, counting, prefix products — the foundation of everything else.' },
      'two-pointers': { title: 'Two Pointers', blurb: 'Converging or same-direction pointers over sorted / symmetric data.' },
      'stack': { title: 'Stack', blurb: 'LIFO matching, monotonic stacks, expression evaluation.' },
      'binary-search': { title: 'Binary Search', blurb: 'Search sorted spaces — including searching on the answer.' },
      'sliding-window': { title: 'Sliding Window', blurb: 'Grow/shrink a window to maintain an invariant over a subarray.' },
      'linked-list': { title: 'Linked List', blurb: 'Pointer manipulation, fast/slow pointers, dummy heads.' },
      'trees': { title: 'Trees', blurb: 'DFS/BFS recursion on binary trees and BSTs.' },
      'tries': { title: 'Tries', blurb: 'Prefix trees for word/prefix queries.' },
      'heap': { title: 'Heap / Priority Queue', blurb: 'Top-K, streaming medians, scheduling.' },
      'backtracking': { title: 'Backtracking', blurb: 'Choose → explore → un-choose over a decision tree.' },
      'graphs': { title: 'Graphs', blurb: 'Grid/graph BFS & DFS, topological sort, union-find.' },
      'intervals': { title: 'Intervals', blurb: 'Sort by start/end, merge, sweep line.' },
      'greedy': { title: 'Greedy', blurb: 'Locally optimal choices with a proof of correctness.' },
      'dp-1d': { title: '1-D Dynamic Programming', blurb: 'State over a single index; recurrence + memo/tabulation.' },
      'advanced-graphs': { title: 'Advanced Graphs', blurb: 'Dijkstra, MST (Prim/Kruskal), Bellman-Ford, Euler paths.' },
      'dp-2d': { title: '2-D Dynamic Programming', blurb: 'Grids, two strings, knapsack, interval DP.' },
      'bit-manipulation': { title: 'Bit Manipulation', blurb: 'XOR tricks, masks, counting bits — embedded favourite.' },
      'math-geometry': { title: 'Math & Geometry', blurb: 'Matrix traversal, fast power, digit manipulation.' },
      'classics': { title: 'Classics', blurb: 'The timeless warm-ups: FizzBuzz, Two Sum, palindromes, Fibonacci, Roman numerals, primes and friends — each with several solutions.' },
      'c-embedded': { title: 'C & Embedded Classics', blurb: 'memcpy/memmove, atoi, ring buffers, bit macros, endianness — asked in C/firmware loops.' },
    },
  },

  sections: {
    courses: {
      title: 'Courses',
      blurb: 'Structured, hands-on courses. AI & Machine Learning: from zero to building and training your own neural networks and CNNs — math made simple, every algorithm coded from scratch in Python (NumPy) and C++, then PyTorch. Each level has goals, theory, commented code, exercises with solutions, and external resources.',
      groups: [
        { name: 'AI Course · Part I — Start here & the math you need', items: [
          { id: 'ai-00-start', title: 'Level 0 · Course Map & Setup', desc: 'What AI/ML/DL are, how this course maps to an MS in AI, and setting up Python, NumPy and a C++ toolchain.', focus: true },
          { id: 'ai-01-linear-algebra', title: 'Level 1 · Vectors & Matrices (made simple)', desc: 'Vectors, dot products, matrix multiplication and shapes — the language of every neural network. NumPy + C++.' },
          { id: 'ai-02-calculus', title: 'Level 2 · Derivatives, Gradients & the Chain Rule', desc: 'Slopes, partial derivatives, gradients, the chain rule and numerical gradient checking.' },
          { id: 'ai-03-probability', title: 'Level 3 · Probability & Statistics for ML', desc: 'Distributions, mean/variance, Bayes, likelihood, and where cross-entropy comes from.' },
        ] },
        { name: 'AI Course · Part II — Classical Machine Learning', items: [
          { id: 'ai-04-linear-regression', title: 'Level 4 · Linear Regression & Gradient Descent', desc: 'Your first learning algorithm, from scratch in Python and C++: loss, gradients, learning rate, feature scaling.', focus: true },
          { id: 'ai-05-logistic-regression', title: 'Level 5 · Logistic Regression & Classification', desc: 'Sigmoid, cross-entropy, decision boundaries, softmax, and how to measure a classifier.' },
          { id: 'ai-06-ml-practice', title: 'Level 6 · Generalisation & Classic Algorithms', desc: 'Overfitting, train/val/test, regularisation, cross-validation, k-NN, decision trees, k-means, PCA.' },
        ] },
        { name: 'AI Course · Part III — Neural Networks from Scratch', items: [
          { id: 'ai-07-neural-networks', title: 'Level 7 · Neurons, Layers & the Forward Pass', desc: 'Perceptrons, activations, multi-layer networks, and why XOR needs a hidden layer.', focus: true },
          { id: 'ai-08-backprop', title: 'Level 8 · Backpropagation, by Hand and in Code', desc: 'Derive backprop step by step, then train an MLP on handwritten digits in NumPy and in plain C++.', focus: true },
          { id: 'ai-09-autograd', title: 'Level 9 · Build Your Own Autograd Engine', desc: 'Computational graphs and automatic differentiation — a tiny PyTorch-like engine in Python and C++.' },
          { id: 'ai-10-training', title: 'Level 10 · Training Deep Networks Well', desc: 'Initialisation, SGD/momentum/Adam, batch norm, dropout, learning-rate schedules, debugging training.' },
        ] },
        { name: 'AI Course · Part IV — Deep Learning', items: [
          { id: 'ai-11-cnn', title: 'Level 11 · Convolutional Neural Networks (CNNs)', desc: 'Convolution and pooling from scratch (NumPy + C++), then a CNN that reads digits.', focus: true },
          { id: 'ai-12-pytorch', title: 'Level 12 · PyTorch in Practice (+ LibTorch C++)', desc: 'Tensors, autograd, nn.Module, DataLoader, GPU, saving models, and running them from C++.' },
          { id: 'ai-13-sequence-models', title: 'Level 13 · Embeddings, RNNs & LSTMs', desc: 'Text as numbers, recurrent networks, vanishing gradients, LSTM/GRU, a character-level model.' },
          { id: 'ai-14-transformers', title: 'Level 14 · Attention & Transformers', desc: 'Self-attention from scratch, the transformer block, and a tiny GPT you train yourself.' },
        ] },
        { name: 'AI Course · Part V — Advanced Topics & Systems', items: [
          { id: 'ai-15-generative', title: 'Level 15 · Generative Models', desc: 'Autoencoders, VAEs, GANs and diffusion — how models learn to create.' },
          { id: 'ai-16-reinforcement-learning', title: 'Level 16 · Reinforcement Learning', desc: 'MDPs, Q-learning, policy gradients and DQN, with a from-scratch grid world.' },
          { id: 'ai-17-ml-systems', title: 'Level 17 · ML Systems: Speed, Deployment & Edge AI', desc: 'Profiling, quantisation, ONNX, TensorRT, CUDA kernels for ML, TinyML on microcontrollers.' },
          { id: 'ai-18-capstone', title: 'Level 18 · Capstones, Papers & the MS Roadmap', desc: 'Capstone projects, how to read papers, the full master’s-level curriculum map and resource list.' },
        ] },
      ],
    },
    docs: {
      title: 'C / C++ Docs',
      blurb: 'In-depth tutorials on the C and C++ topics interviewers actually probe. Modern C++20 (with C++23 notes) throughout.',
      groups: [
        { name: 'Memory & Ownership', items: [
          { id: 'raw-pointers', title: 'Raw Pointers Mastery', desc: 'Pointer arithmetic, const-correctness, arrays & decay, function pointers, pitfalls.', focus: true },
          { id: 'smart-pointers', title: 'Smart Pointers', desc: 'unique_ptr, shared_ptr, weak_ptr, deleters, control blocks, ownership rules.', focus: true },
          { id: 'raii-memory', title: 'RAII & the Memory Model', desc: 'Stack vs heap, new/delete, object lifetime, alignment, memory layout.' },
          { id: 'move-semantics', title: 'References & Move Semantics', desc: 'Value categories, std::move, perfect forwarding, Rule of 0/3/5.' },
        ] },
        { name: 'Language Core', items: [
          { id: 'oop-classes', title: 'Classes & OOP in C++', desc: 'Constructors, special members, inheritance, virtual dispatch, vtables, slicing.', focus: true },
          { id: 'lambdas', title: 'Lambdas & Functional C++', desc: 'Captures, mutable, generic & template lambdas, std::function, closures under the hood.', focus: true },
          { id: 'templates-concepts', title: 'Templates & Concepts', desc: 'Function/class templates, specialization, variadics, fold expressions, C++20 concepts.' },
          { id: 'const-constexpr', title: 'const, constexpr, consteval', desc: 'Const-correctness and compile-time programming.' },
          { id: 'casts-types', title: 'Casts & the Type System', desc: 'static/dynamic/reinterpret/const_cast, RTTI, type punning, std::bit_cast.' },
          { id: 'exceptions-errors', title: 'Error Handling', desc: 'Exceptions, noexcept, exception safety guarantees, std::expected, error codes.' },
          { id: 'undefined-behavior', title: 'Undefined Behavior', desc: 'The UB catalogue every C/C++ interviewer loves, and how to catch it.' },
        ] },
        { name: 'Modern C++', items: [
          { id: 'modern-cpp', title: 'Modern C++ (11 → 23) Feature Map', desc: 'What each standard added, with C++20 deep dive: concepts, ranges, coroutines, modules, <=>.', focus: true },
          { id: 'stl-containers', title: 'STL Containers', desc: 'Complexities, iterator invalidation, and choosing the right container.' },
          { id: 'stl-algorithms-ranges', title: 'Algorithms & Ranges', desc: 'The <algorithm> toolbox and C++20 std::ranges / views.' },
          { id: 'concurrency', title: 'Concurrency', desc: 'Threads, jthread, mutexes, condition variables, atomics, memory ordering.' },
        ] },
        { name: 'Build & Toolchain', items: [
          { id: 'compilation-linking', title: 'Compilation & Linking', desc: 'Preprocessor → compiler → assembler → linker, ODR, static vs shared libs.' },
          { id: 'make', title: 'Make & Makefiles', desc: 'Rules, variables, automatic variables, pattern rules, dependency generation.', focus: true },
          { id: 'cmake', title: 'Modern CMake', desc: 'Target-based CMake, visibility, FetchContent, presets, testing, cross-compiling.', focus: true },
        ] },
        { name: 'C Language', items: [
          { id: 'c-essentials', title: 'C Essentials for Interviews', desc: 'Storage classes, static, volatile, structs/unions/bitfields, strings, malloc, C11/C23.' },
          { id: 'c-vs-cpp', title: 'C vs C++ Differences', desc: 'The subtle differences that trip people up when switching between them.' },
        ] },
        { name: 'Rapid Fire', items: [
          { id: 'cpp-interview-qa', title: 'C/C++ Interview Q&A', desc: '60+ short questions with crisp answers. Great for the night before.' },
        ] },
      ],
    },

    design: {
      title: 'Design',
      blurb: 'Software design patterns in C++, object-oriented / low-level design, and high-level system design.',
      groups: [
        { name: 'Principles', items: [
          { id: 'solid', title: 'SOLID & Design Principles', desc: 'SOLID, DRY, KISS, YAGNI, composition over inheritance, Law of Demeter.' },
        ] },
        { name: 'Design Patterns (C++)', items: [
          { id: 'patterns-creational', title: 'Creational Patterns', desc: 'Singleton, Factory Method, Abstract Factory, Builder, Prototype.', focus: true },
          { id: 'patterns-structural', title: 'Structural Patterns', desc: 'Adapter, Decorator, Facade, Proxy, Composite, Bridge, PImpl.', focus: true },
          { id: 'patterns-behavioral', title: 'Behavioral Patterns', desc: 'Strategy, Observer, Command, State, Template Method, Visitor, CRTP.', focus: true },
        ] },
        { name: 'Low-Level Design', items: [
          { id: 'lld-approach', title: 'How to Ace an LLD Interview', desc: 'A repeatable framework: requirements → entities → interfaces → code.' },
          { id: 'lld-examples', title: 'LLD Worked Examples', desc: 'LRU cache, parking lot, elevator, rate limiter, logger, thread pool.' },
        ] },
        { name: 'High-Level Design', items: [
          { id: 'hld-fundamentals', title: 'System Design Fundamentals', desc: 'Scaling, load balancers, caching, databases, sharding, CAP, queues.' },
          { id: 'hld-case-studies', title: 'System Design Case Studies', desc: 'URL shortener, chat, news feed, distributed KV store, telemetry pipeline.' },
        ] },
        { name: 'Embedded Design', items: [
          { id: 'embedded-design', title: 'Embedded Software Architecture', desc: 'Layering/HAL, state machines, ISR design, RTOS tasks, bootloaders & OTA.' },
        ] },
      ],
    },

    math: {
      title: 'Math',
      blurb: 'The math that shows up in software & embedded interviews — and the math every programmer should be fluent in.',
      groups: [
        { name: 'Core', items: [
          { id: 'complexity', title: 'Big-O & Complexity Analysis', desc: 'Asymptotics, amortized analysis, the Master Theorem, recursion trees.' },
          { id: 'discrete-math', title: 'Discrete Math & Combinatorics', desc: 'Logic, sets, counting, permutations/combinations, pigeonhole, induction.' },
          { id: 'probability', title: 'Probability & Statistics', desc: 'Expectation, distributions, Bayes, classic puzzles, reservoir sampling.' },
          { id: 'number-theory', title: 'Number Theory for Coders', desc: 'GCD, modular arithmetic, fast exponentiation, primes & sieve, overflow.' },
        ] },
        { name: 'Machine-Level', items: [
          { id: 'number-representation', title: 'Binary, Two\'s Complement & Floats', desc: 'Bases, signed integers, IEEE-754, endianness, precision traps.' },
          { id: 'embedded-math', title: 'Math for Embedded Systems', desc: 'Fixed-point/Q-format, filters, PID, ADC scaling, CRC, interpolation.' },
        ] },
        { name: 'Graphics, Robotics & ML', items: [
          { id: 'linear-algebra', title: 'Linear Algebra', desc: 'Vectors, matrices, transforms, dot/cross products — graphics & ML foundations.' },
          { id: 'geometry', title: 'Computational Geometry', desc: 'Orientation tests, segment intersection, polygon area, distances.' },
          { id: 'calculus-ml', title: 'Calculus for ML', desc: 'Derivatives, partials, chain rule, gradients & gradient descent.' },
        ] },
      ],
    },

    learn: {
      title: 'Learn',
      blurb: 'Broader programming skills: algorithms, data structures, debugging, coding standards, embedded, OS, CUDA, AI and Python.',
      groups: [
        { name: 'Interview Skills', items: [
          { id: 'problem-solving', title: 'Problem-Solving Framework', desc: 'How to approach any coding question and recognise the pattern.' },
          { id: 'data-structures', title: 'Data Structures Deep Dive', desc: 'Arrays → heaps → tries → union-find, with C++ implementations.' },
          { id: 'algorithms', title: 'Essential Algorithms', desc: 'Sorting, searching, graph algorithms, DP methodology, with templates.' },
        ] },
        { name: 'Engineering Craft', items: [
          { id: 'debugging', title: 'Debugging Techniques', desc: 'GDB, sanitizers, Valgrind, core dumps, git bisect, embedded debugging.' },
          { id: 'cpp-standards', title: 'Modern C++ Coding Standards', desc: 'C++ Core Guidelines distilled, C++20 idioms, clang-tidy, warnings.' },
          { id: 'c-standards', title: 'C Coding Standards (MISRA / CERT)', desc: 'Safe C for production and safety-critical firmware.' },
          { id: 'testing', title: 'Testing C/C++ Code', desc: 'GoogleTest, mocking, TDD, testing embedded code off-target.' },
        ] },
        { name: 'Systems', items: [
          { id: 'embedded-fundamentals', title: 'Embedded Programming Fundamentals', desc: 'MCUs, registers, volatile, interrupts, timers, DMA, UART/SPI/I2C/CAN, RTOS.', focus: true },
          { id: 'embedded-qa', title: 'Embedded Interview Q&A', desc: 'Rapid-fire firmware questions with answers.', focus: true },
          { id: 'os-concepts', title: 'Operating Systems Concepts', desc: 'Processes, threads, virtual memory, scheduling, sync, IPC.' },
          { id: 'computer-architecture', title: 'Computer Architecture for Programmers', desc: 'Caches, pipelines, branch prediction, false sharing, SIMD.' },
        ] },
        { name: 'New Frontiers', items: [
          { id: 'python', title: 'Python for C++ Developers', desc: 'Pythonic idioms, data model, typing, and interview-ready Python.' },
          { id: 'cuda', title: 'CUDA Programming', desc: 'GPU architecture, kernels, memory hierarchy, coalescing, reductions, tiled matmul.' },
          { id: 'ai-ml', title: 'AI & Machine Learning Fundamentals', desc: 'ML basics, neural nets, backprop, transformers & LLMs, PyTorch.' },
        ] },
      ],
    },
  },
};
