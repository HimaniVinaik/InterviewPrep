# Level 16 · Reinforcement Learning

> **Key idea:** in supervised learning someone gives you the right answer for every example. In **reinforcement learning (RL)** nobody does: an **agent** acts in an **environment**, occasionally receives a **reward**, and must figure out which actions lead to high reward *in the long run*. RL is how AlphaGo learned Go, how robots learn to walk, and (as RLHF) how chat models are tuned to be helpful.

**Goals of this level**
- Understand the RL vocabulary: states, actions, rewards, policies, returns, discounting, value functions.
- Solve a known environment exactly with **value iteration** (the Bellman equation).
- Learn by trial and error with **Q-learning** — in Python and C++.
- Train a neural **policy gradient** agent (REINFORCE) on a CartPole you simulate yourself, and understand **DQN**, **actor-critic/PPO** and **RLHF**.

## 1. The RL loop

```text
        ┌──────────── action aₜ ────────────┐
        │                                   ▼
     AGENT                             ENVIRONMENT
   (policy π)                               │
        ▲                                   │
        └──── new state sₜ₊₁, reward rₜ₊₁ ───┘
```

| Term | Meaning | Example (a robot vacuum) |
|---|---|---|
| State s | What the agent observes | its position and the dirt map |
| Action a | What it can do | move N/S/E/W, suck |
| Reward r | A number after each step | +1 per dirt cleaned, −10 for hitting a wall |
| Policy π(a \| s) | The agent's behaviour: which action in which state | "if dirt here, suck" |
| Return G | Total future reward: rₜ₊₁ + γrₜ₊₂ + γ²rₜ₊₃ + … | |
| Discount γ (0–1) | How much the future matters | γ = 0.99: patient; γ = 0.5: short-sighted |

The goal: find the policy that maximises the **expected return**.

**Why it's hard:** rewards are delayed (which of the last 50 moves deserves credit for winning?), and the agent must **explore** (try new things) while also **exploiting** what it already knows.

## 2. Value functions and the Bellman equation

- **V(s)** — the value of a state: expected return starting from s if you follow the policy.
- **Q(s, a)** — the value of taking action a in state s, then following the policy.

The **Bellman optimality equation** says the value of a state is the best immediate reward plus the discounted value of where you land:

```text
V*(s) = max_a  Σ_s' P(s' | s, a) · [ r(s, a, s') + γ · V*(s') ]
Q*(s, a) = Σ_s' P(s' | s, a) · [ r + γ · max_a' Q*(s', a') ]
```

Once you know Q*, the best policy is simply "pick the action with the highest Q".

## 3. Value iteration on a grid world

A 4×4 grid. Start top-left, goal bottom-right (+1). Two "holes" (−1). Each step costs −0.04 (so shorter paths are better). Moves succeed 80% of the time; 20% the agent slips sideways.

When the environment's rules are known, we can apply the Bellman equation repeatedly until the values stop changing:

```python
import numpy as np

ROWS, COLS = 4, 4
GOAL, HOLES = (3, 3), {(1, 1), (2, 3)}
ACTIONS = {0: (-1, 0), 1: (1, 0), 2: (0, -1), 3: (0, 1)}       # up, down, left, right
ARROWS = "^v<>"
STEP_COST, GAMMA = -0.04, 0.95

def is_terminal(s):
    return s == GOAL or s in HOLES

def move(s, a):
    r, c = s[0] + ACTIONS[a][0], s[1] + ACTIONS[a][1]
    if 0 <= r < ROWS and 0 <= c < COLS:
        return (r, c)
    return s                                                    # bumping into a wall: stay

def transitions(s, a):
    """List of (probability, next_state, reward). 80% intended move, 10% each sideways slip."""
    sideways = [2, 3] if a in (0, 1) else [0, 1]
    out = []
    for prob, act in [(0.8, a), (0.1, sideways[0]), (0.1, sideways[1])]:
        s2 = move(s, act)
        reward = 1.0 if s2 == GOAL else (-1.0 if s2 in HOLES else STEP_COST)
        out.append((prob, s2, reward))
    return out

states = [(r, c) for r in range(ROWS) for c in range(COLS)]
V = {s: 0.0 for s in states}
for sweep in range(200):
    delta = 0.0
    for s in states:
        if is_terminal(s):
            continue
        best = max(sum(p * (rew + GAMMA * V[s2]) for p, s2, rew in transitions(s, a)) for a in ACTIONS)
        delta = max(delta, abs(best - V[s]))
        V[s] = best                                             # Bellman update
    if delta < 1e-8:
        break
print(f"converged after {sweep + 1} sweeps")

policy = {}
for s in states:
    if not is_terminal(s):
        policy[s] = max(ACTIONS, key=lambda a: sum(p * (rew + GAMMA * V[s2]) for p, s2, rew in transitions(s, a)))

for r in range(ROWS):
    line = ""
    for c in range(COLS):
        s = (r, c)
        line += " G " if s == GOAL else (" H " if s in HOLES else f" {ARROWS[policy[s]]} ")
    print(line, "   ", " ".join(f"{V[(r, c)]:5.2f}" for c in range(COLS)))
assert V[(0, 0)] > 0
```

The arrows steer around the holes — and notice where they choose a slightly longer path to avoid slipping into a hole. That's the policy **planning** under uncertainty.

## 4. Q-learning: learning without knowing the rules

Usually the agent **doesn't know** P(s' | s, a). It can only try things. **Q-learning** updates its estimate after every single step using the reward it actually received:

```text
target   = r + γ · max_a' Q(s', a')          (0 instead of the max if s' is terminal)
Q(s, a) ← Q(s, a) + α · (target − Q(s, a))   (α = learning rate)
```

This is "temporal-difference" learning: nudge the old estimate towards a slightly better one that uses one real reward. To keep exploring, act **ε-greedily**: with probability ε pick a random action, otherwise the best known one.

```python
import numpy as np

ROWS, COLS = 4, 4
GOAL, HOLES = (3, 3), {(1, 1), (2, 3)}
ACTIONS = [(-1, 0), (1, 0), (0, -1), (0, 1)]
rng = np.random.default_rng(0)

def step(s, a):
    """The environment. The agent does NOT see this code — it only sees what it returns."""
    if rng.random() < 0.2:                                   # 20%: slip sideways
        a = rng.choice([2, 3]) if a in (0, 1) else rng.choice([0, 1])
    r, c = s[0] + ACTIONS[a][0], s[1] + ACTIONS[a][1]
    s2 = (r, c) if 0 <= r < ROWS and 0 <= c < COLS else s
    if s2 == GOAL:
        return s2, 1.0, True
    if s2 in HOLES:
        return s2, -1.0, True
    return s2, -0.04, False

Q = np.zeros((ROWS, COLS, 4))
alpha, gamma = 0.1, 0.95
for episode in range(20000):
    eps = max(0.05, 1.0 - episode / 10000)                   # explore a lot early, less later
    s, done = (0, 0), False
    while not done:
        if rng.random() < eps:
            a = int(rng.integers(4))                         # explore
        else:
            a = int(np.argmax(Q[s]))                         # exploit
        s2, r, done = step(s, a)
        target = r if done else r + gamma * np.max(Q[s2])
        Q[s][a] += alpha * (target - Q[s][a])                # temporal-difference update
        s = s2

# Evaluate the greedy policy
wins = 0
for _ in range(2000):
    s, done, steps = (0, 0), False, 0
    while not done and steps < 100:
        s, r, done = step(s, int(np.argmax(Q[s])))
        steps += 1
    wins += r == 1.0
print(f"success rate of the learned policy: {wins / 2000:.2f}")
print("learned policy:")
for r in range(ROWS):
    print(" ".join("G" if (r, c) == GOAL else "H" if (r, c) in HOLES else "^v<>"[int(np.argmax(Q[r, c]))]
                   for c in range(COLS)))
assert wins / 2000 > 0.8
```

Q-learning finds (approximately) the same policy as value iteration — without ever seeing the transition probabilities.

## 5. Q-learning in C++

```cpp
#include <algorithm>
#include <array>
#include <cassert>
#include <cstdio>
#include <random>

constexpr int ROWS = 4;
constexpr int COLS = 4;
constexpr int DR[4] = {-1, 1, 0, 0};    // up, down, left, right
constexpr int DC[4] = {0, 0, -1, 1};

struct StepResult {
    int r;
    int c;
    double reward;
    bool done;
};

bool isHole(int r, int c) {
    return (r == 1 && c == 1) || (r == 2 && c == 3);
}

StepResult envStep(int r, int c, int a, std::mt19937& rng) {
    std::uniform_real_distribution<double> u(0.0, 1.0);
    if (u(rng) < 0.2) {                                 // slip sideways
        bool vertical = (a == 0 || a == 1);
        a = vertical ? (u(rng) < 0.5 ? 2 : 3) : (u(rng) < 0.5 ? 0 : 1);
    }
    int nr = r + DR[a];
    int nc = c + DC[a];
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
        nr = r;                                          // wall: stay put
        nc = c;
    }
    if (nr == 3 && nc == 3) {
        return {nr, nc, 1.0, true};
    }
    if (isHole(nr, nc)) {
        return {nr, nc, -1.0, true};
    }
    return {nr, nc, -0.04, false};
}

int main() {
    std::mt19937 rng(0);
    std::uniform_real_distribution<double> u(0.0, 1.0);
    std::uniform_int_distribution<int> randomAction(0, 3);
    std::array<std::array<std::array<double, 4>, COLS>, ROWS> Q{};   // all zeros
    const double alpha = 0.1;
    const double gamma = 0.95;

    auto greedy = [&](int r, int c) {
        return int(std::max_element(Q[r][c].begin(), Q[r][c].end()) - Q[r][c].begin());
    };

    for (int episode = 0; episode < 20000; episode++) {
        double eps = std::max(0.05, 1.0 - episode / 10000.0);
        int r = 0;
        int c = 0;
        bool done = false;
        while (!done) {
            int a = (u(rng) < eps) ? randomAction(rng) : greedy(r, c);
            StepResult s = envStep(r, c, a, rng);
            double best = *std::max_element(Q[s.r][s.c].begin(), Q[s.r][s.c].end());
            double target = s.done ? s.reward : s.reward + gamma * best;
            Q[r][c][a] += alpha * (target - Q[r][c][a]);      // TD update
            r = s.r;
            c = s.c;
            done = s.done;
        }
    }

    int wins = 0;
    for (int k = 0; k < 2000; k++) {
        int r = 0;
        int c = 0;
        StepResult s{0, 0, 0.0, false};
        for (int t = 0; t < 100 && !s.done; t++) {
            s = envStep(r, c, greedy(r, c), rng);
            r = s.r;
            c = s.c;
        }
        if (s.reward == 1.0) {
            wins++;
        }
    }
    std::printf("success rate: %.2f\n", wins / 2000.0);
    assert(wins / 2000.0 > 0.8);
    return 0;
}
```

## 6. Policy gradients: learning a policy network directly

Tables don't scale to continuous or huge state spaces (a robot's joint angles, a game screen). Instead, use a **neural network policy** πθ(a | s) and adjust θ to make good actions more likely.

The **REINFORCE** rule (the policy-gradient theorem):

```text
∇θ J = E[ Σₜ ∇θ log πθ(aₜ | sₜ) · Gₜ ]
```

**In words:** after an episode, for each action you took, push up its log-probability in proportion to the return that followed it. Good outcomes → do that more; bad outcomes → do it less. Subtracting a **baseline** (e.g. the average return) from Gₜ reduces the variance without changing the expected gradient.

It's like supervised learning where the "label" is the action you happened to take, weighted by how well things went.

### A CartPole you simulate yourself

Balance a pole on a moving cart by pushing left or right. We write the physics ourselves (the classic Barto, Sutton & Anderson 1983 equations), so there's no library magic.

```python
import math
import numpy as np
import torch
import torch.nn as nn

class CartPole:
    """Classic cart-pole physics. Reward +1 per step the pole stays up; max 500 steps."""
    def __init__(self, seed=0):
        self.rng = np.random.default_rng(seed)

    def reset(self):
        self.s = self.rng.uniform(-0.05, 0.05, 4)          # x, x_dot, theta, theta_dot
        self.t = 0
        return self.s.copy()

    def step(self, action):
        x, x_dot, th, th_dot = self.s
        force = 10.0 if action == 1 else -10.0
        g, m_cart, m_pole, length, dt = 9.8, 1.0, 0.1, 0.5, 0.02
        total = m_cart + m_pole
        temp = (force + m_pole * length * th_dot ** 2 * math.sin(th)) / total
        th_acc = (g * math.sin(th) - math.cos(th) * temp) / (
            length * (4.0 / 3.0 - m_pole * math.cos(th) ** 2 / total))
        x_acc = temp - m_pole * length * th_acc * math.cos(th) / total
        x, x_dot = x + dt * x_dot, x_dot + dt * x_acc       # Euler integration
        th, th_dot = th + dt * th_dot, th_dot + dt * th_acc
        self.s = np.array([x, x_dot, th, th_dot])
        self.t += 1
        fell = abs(x) > 2.4 or abs(th) > 12 * math.pi / 180
        return self.s.copy(), 1.0, fell or self.t >= 500

torch.manual_seed(0)
env = CartPole(seed=0)
policy = nn.Sequential(nn.Linear(4, 64), nn.Tanh(), nn.Linear(64, 2))       # outputs action logits
opt = torch.optim.Adam(policy.parameters(), lr=1e-2)
gamma = 0.99
recent = []

best_avg = 0.0
for episode in range(1000):
    s, done = env.reset(), False
    log_probs, rewards = [], []
    while not done:
        logits = policy(torch.tensor(s, dtype=torch.float32))
        dist = torch.distributions.Categorical(logits=logits)
        a = dist.sample()                                    # stochastic policy = built-in exploration
        log_probs.append(dist.log_prob(a))
        s, r, done = env.step(a.item())
        rewards.append(r)
    # Discounted returns G_t, computed backwards
    G, returns = 0.0, []
    for r in reversed(rewards):
        G = r + gamma * G
        returns.insert(0, G)
    returns = torch.tensor(returns)
    returns = (returns - returns.mean()) / (returns.std() + 1e-8)   # baseline + scaling
    loss = -(torch.stack(log_probs) * returns).sum()                 # REINFORCE
    opt.zero_grad()
    loss.backward()
    opt.step()
    recent.append(len(rewards))
    if episode % 100 == 99:
        avg = np.mean(recent[-100:])
        best_avg = max(best_avg, avg)
        print(f"episode {episode + 1}: average steps balanced (last 100) = {avg:.0f}")

print(f"best 100-episode average: {best_avg:.0f} steps (a random policy manages ~20)")
assert best_avg > 300
```

A random policy keeps the pole up for only ~20 steps. From nothing but "+1 per step", the agent learns to balance for hundreds of steps (the 100-episode average climbs past 450 here).

**Notice the curve is bumpy** — e.g. 314 → 213 → 166 → … → 469 → 338. That's normal for plain REINFORCE: its gradient estimates are very noisy (one episode's luck changes the update a lot), and a single bad update can undo progress. Remedies are exactly the methods in section 8: a learned **critic** baseline (actor-critic, exercise 4), smaller or decaying learning rates, and **PPO**'s rule of not changing the policy too much per update.

## 7. Deep Q-Networks (DQN)

DQN (DeepMind, 2015) learned to play dozens of Atari games from pixels. It is Q-learning with a neural network Q_θ(s, a), plus two stabilising tricks:

- **Experience replay:** store transitions (s, a, r, s', done) in a buffer and train on random mini-batches — breaks the correlation between consecutive steps.
- **Target network:** compute targets with a slowly updated copy of the network, so the target doesn't move every step.

```python
import random
from collections import deque
import numpy as np
import torch
import torch.nn as nn

# The 4x4 slippery grid world from section 4, with one-hot states, solved by DQN.
ROWS, COLS, GOAL, HOLES = 4, 4, (3, 3), {(1, 1), (2, 3)}
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
rng = random.Random(0)

def env_step(s, a):
    if rng.random() < 0.2:
        a = rng.choice([2, 3]) if a in (0, 1) else rng.choice([0, 1])
    r, c = s[0] + MOVES[a][0], s[1] + MOVES[a][1]
    s2 = (r, c) if 0 <= r < ROWS and 0 <= c < COLS else s
    if s2 == GOAL:
        return s2, 1.0, True
    if s2 in HOLES:
        return s2, -1.0, True
    return s2, -0.04, False

def one_hot(s):
    v = torch.zeros(ROWS * COLS)
    v[s[0] * COLS + s[1]] = 1.0
    return v

torch.manual_seed(0)
qnet = nn.Sequential(nn.Linear(16, 64), nn.ReLU(), nn.Linear(64, 4))
target_net = nn.Sequential(nn.Linear(16, 64), nn.ReLU(), nn.Linear(64, 4))
target_net.load_state_dict(qnet.state_dict())
opt = torch.optim.Adam(qnet.parameters(), lr=1e-3)
buffer = deque(maxlen=10000)                                  # experience replay
gamma, steps = 0.95, 0

for episode in range(1500):
    eps = max(0.05, 1 - episode / 800)
    s, done, t = (0, 0), False, 0
    while not done and t < 100:
        if rng.random() < eps:
            a = rng.randrange(4)
        else:
            with torch.no_grad():
                a = int(qnet(one_hot(s)).argmax())
        s2, r, done = env_step(s, a)
        buffer.append((one_hot(s), a, r, one_hot(s2), float(done)))
        s, t, steps = s2, t + 1, steps + 1
        if len(buffer) >= 500:
            batch = rng.sample(buffer, 64)
            S = torch.stack([b[0] for b in batch])
            A = torch.tensor([b[1] for b in batch])
            R = torch.tensor([b[2] for b in batch])
            S2 = torch.stack([b[3] for b in batch])
            D = torch.tensor([b[4] for b in batch])
            with torch.no_grad():
                target = R + gamma * (1 - D) * target_net(S2).max(dim=1).values   # Bellman target
            q = qnet(S).gather(1, A[:, None]).squeeze(1)                           # Q(s, a) taken
            loss = nn.functional.smooth_l1_loss(q, target)
            opt.zero_grad()
            loss.backward()
            opt.step()
        if steps % 200 == 0:
            target_net.load_state_dict(qnet.state_dict())    # refresh the target network

wins = 0
for _ in range(1000):
    s, done, t = (0, 0), False, 0
    while not done and t < 100:
        with torch.no_grad():
            s, r, done = env_step(s, int(qnet(one_hot(s)).argmax()))
        t += 1
    wins += r == 1.0
print(f"DQN greedy success rate: {wins / 1000:.2f}")
assert wins / 1000 > 0.7
```

## 8. The modern RL landscape

| Method | Idea | Used for |
|---|---|---|
| **Actor-critic (A2C/A3C)** | A policy (actor) + a value network (critic) that provides a learned baseline | Lower-variance policy gradients |
| **PPO** | Policy gradient with a "don't change the policy too much per update" clip | Robotics, games — and **RLHF for LLMs** |
| **SAC / TD3** | Off-policy actor-critic for continuous actions | Robot control |
| **AlphaZero / MuZero** | Tree search guided by policy and value networks, self-play | Go, chess, shogi, Atari |
| **Model-based RL (Dreamer)** | Learn a model of the world and plan/imagine inside it | Sample-efficient control |
| **RLHF** | Train a reward model from human preferences, then optimise the LLM against it with PPO | ChatGPT-style assistants |
| **DPO** | Skip the explicit RL loop: optimise directly on preference pairs | Simpler alignment fine-tuning |

## Checkpoint

- [ ] I can define state, action, reward, policy, return and discount, and explain exploration vs exploitation.
- [ ] I can write the Bellman optimality equation and implement value iteration.
- [ ] I implemented tabular Q-learning in Python and C++.
- [ ] I trained a REINFORCE agent and can explain why a baseline helps.
- [ ] I can explain experience replay and target networks in DQN, and how RLHF uses RL.

## Exercises

1. In value iteration, set the step cost to −0.5. How does the policy change near the holes? Then +0.1 (a reward for living!) — what does the agent do now?
2. Replace ε-greedy in Q-learning with a constant ε = 0.3 and with ε = 0.01. Compare learning speed and final success rate.
3. Implement **SARSA** (target uses the action actually taken next, not the max). On the slippery grid, is SARSA's policy more or less cautious around holes than Q-learning's? Why?
4. Add a learned **value baseline** (a second network predicting V(s)) to the CartPole REINFORCE agent → this is an actor-critic. Does it learn faster?
5. Make the DQN use **Double DQN** targets: choose the best action with `qnet` but evaluate it with `target_net`.

:::details Show solution
1. With −0.5 per step, living is so costly that the agent takes the shortest path even next to holes — sometimes it even prefers jumping into a hole over a long detour. With +0.1 per step, the agent avoids **both** the goal and the holes forever: staying alive collects more reward than finishing. Reward design matters enormously ("reward hacking").
2. ε = 0.3 keeps exploring forever, so its behaviour (and measured success while training) stays noisy, but its Q-values are well estimated; ε = 0.01 may get stuck with a poor early policy because it rarely tries alternatives. Decaying ε gets the best of both.
3. Replace `target = r + gamma * max Q[s2]` with `target = r + gamma * Q[s2][a2]` where a2 is chosen ε-greedily and then actually executed. SARSA is **more cautious**: it learns the value of the policy it actually follows (including random exploratory steps), so it stays further from the holes; Q-learning learns the value of the optimal greedy policy and walks closer to the edge.
4. Train `value_net(s)` with MSE towards the observed returns, and use `G_t − V(s_t)` (detached) as the weight on the log-probabilities. Usually the agent reaches long balancing times in fewer episodes and more smoothly.
5. `a_star = qnet(S2).argmax(1); target = R + gamma * (1 - D) * target_net(S2).gather(1, a_star[:, None]).squeeze(1)`. It reduces the over-estimation bias of taking a max over noisy estimates.
:::

## External resources

- **Sutton & Barto — *Reinforcement Learning: An Introduction*** (2nd edition, free at incompleteideas.net/book). *The* textbook; chapters 3–6 and 13 cover this level.
- **David Silver's RL course** (UCL/DeepMind, YouTube) — the classic lecture series.
- **OpenAI Spinning Up** (spinningup.openai.com): clear explanations and implementations of VPG, PPO, SAC, DDPG.
- **Gymnasium** (gymnasium.farama.org): the standard environments (CartPole, MuJoCo, Atari) once you've written your own.
- **Papers:** Mnih et al. 2015 (DQN, *Nature*), Schulman et al. 2017 (PPO), Silver et al. 2017 (AlphaZero), Ouyang et al. 2022 (InstructGPT / RLHF), Rafailov et al. 2023 (DPO).
- **Hugging Face Deep RL Course** (huggingface.co/learn/deep-rl-course): free, hands-on.
