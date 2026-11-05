# System Design Fundamentals

**High-level design (HLD)** interviews ask you to design a large distributed system — a URL shortener, chat app, news feed — in ~45 minutes. You're judged on structured thinking, trade-offs, and depth where it matters, not on a "correct" answer.

## 1. The interview framework

| Phase | Time | Output |
|---|---|---|
| Requirements | 5–8 min | functional (features) + non-functional (scale, latency, availability, consistency) |
| Estimates | 3–5 min | QPS, storage, bandwidth — back-of-envelope |
| API design | 3–5 min | key endpoints / RPCs |
| Data model | 5 min | entities, schema, SQL vs NoSQL choice |
| High-level diagram | 10 min | clients → LB → services → caches/DBs/queues |
| Deep dives | 10–15 min | the 1–2 hardest parts (scaling hot spots, consistency, failure) |
| Wrap-up | 2–3 min | bottlenecks, monitoring, future work |

## 2. Back-of-the-envelope numbers

| Quantity | Value |
|---|---|
| Seconds per day | ~86,400 ≈ 10⁵ |
| 1 M requests/day | ≈ 12 QPS |
| 100 M requests/day | ≈ 1,200 QPS (peak ×2–3) |
| L1 cache reference | ~1 ns |
| Main memory reference | ~100 ns |
| SSD random read | ~100 µs |
| Round trip within a datacenter | ~0.5 ms |
| Disk seek (HDD) | ~10 ms |
| Round trip across continents | ~150 ms |
| Read 1 MB sequentially from memory | ~250 µs |
| Read 1 MB from SSD | ~1 ms |

Powers of two: 2¹⁰ ≈ 1 thousand (KB), 2²⁰ ≈ 1 million (MB), 2³⁰ ≈ 1 billion (GB), 2⁴⁰ ≈ 1 trillion (TB).

**Example:** 500 M daily active users × 2 posts/day × 1 KB = 1 TB/day of new posts → ~365 TB/year → sharding is mandatory.

## 3. Scaling

- **Vertical scaling (scale up):** bigger machine. Simple, finite, single point of failure.
- **Horizontal scaling (scale out):** more machines. Requires **stateless** services (session state in a shared store or tokens) so any instance can serve any request.

## 4. Load balancing

- **L4** (TCP/UDP) vs **L7** (HTTP-aware: route by path/header, TLS termination).
- Algorithms: round robin, least connections, weighted, consistent hashing (sticky by key).
- Health checks remove dead instances. LBs themselves are made redundant (active/passive, DNS, anycast).

## 5. Caching

| Where | Example |
|---|---|
| Client / browser | HTTP cache headers |
| CDN | static assets, video segments, near users |
| Application cache | Redis / Memcached in front of the DB |
| Database | buffer pool, query cache |

Strategies:
- **Cache-aside (lazy loading):** app reads cache → on miss, reads DB and populates cache. Most common.
- **Write-through:** write cache and DB together (consistent, slower writes).
- **Write-back / write-behind:** write cache, flush to DB asynchronously (fast, risk of loss).
- **Eviction:** LRU, LFU, TTL.

Problems to mention: **stale data / invalidation** ("one of the two hard things"), **thundering herd** on a hot key's expiry (fix: request coalescing, jittered TTLs, early refresh), **cache penetration** for non-existent keys (cache negative results, Bloom filter).

## 6. Databases

| | Relational (PostgreSQL, MySQL) | NoSQL |
|---|---|---|
| Model | tables, joins, schemas | key-value (Redis, DynamoDB), document (MongoDB), wide-column (Cassandra), graph (Neo4j) |
| Transactions | ACID | often per-key/partition; tunable consistency |
| Scaling | vertical + read replicas; sharding is manual | built for horizontal partitioning |
| Use when | relations, complex queries, strong consistency (payments, inventory) | massive scale, simple access patterns, flexible schema |

**ACID:** Atomicity, Consistency, Isolation, Durability.
**Indexes:** B-trees speed reads (O(log n)) at the cost of slower writes and storage. LSM-trees (Cassandra, RocksDB) optimise write throughput.

### Replication

- **Leader–follower:** writes to the leader, reads from replicas. Replication lag → read-your-own-writes issues.
- **Multi-leader / leaderless** (Dynamo-style quorums: W + R > N for strong reads).

### Sharding (partitioning)

- **By range** (dates, alphabet): efficient range scans, risk of hot spots.
- **By hash** of the key: even distribution, range queries become scatter-gather.
- **Consistent hashing:** keys and nodes on a ring; adding/removing a node moves only ~1/N of keys. Virtual nodes smooth the distribution.

```text
          node A
        /        \
   key k1         node B      key goes to the first node clockwise
        \        /
          node C
```

Re-sharding, cross-shard joins/transactions and hot keys (celebrity users) are the classic follow-ups.

## 7. CAP & consistency

**CAP theorem:** in the presence of a network **P**artition, a distributed system must choose between **C**onsistency (every read sees the latest write) and **A**vailability (every request gets a response). **PACELC** adds: *Else* (no partition), trade **L**atency vs **C**onsistency.

| Consistency model | Meaning |
|---|---|
| Strong / linearizable | behaves like a single copy |
| Sequential | all see the same order |
| Causal | causally related ops seen in order |
| Read-your-writes | you see your own updates |
| Eventual | replicas converge if writes stop |

Consensus algorithms (**Raft**, Paxos) provide strongly consistent replicated logs — used by etcd, ZooKeeper, CockroachDB, Spanner.

## 8. Asynchronous processing — queues & streams

- **Message queues** (RabbitMQ, SQS): decouple producers from consumers, absorb bursts, retry failed work.
- **Log-based streams** (Kafka, Pulsar): durable, ordered per partition, replayable; consumer groups scale reads.
- Delivery semantics: at-most-once, **at-least-once** (most common → make consumers **idempotent**), exactly-once (expensive; usually "effectively once" via idempotency keys + dedupe).
- Patterns: fan-out, work queues, event sourcing, CQRS, outbox pattern.

## 9. Communication

| Style | Use |
|---|---|
| REST/HTTP+JSON | public APIs, simplicity |
| gRPC (HTTP/2 + protobuf) | service-to-service, low latency, streaming |
| WebSockets / SSE | server push: chat, live dashboards |
| Long polling | fallback push |
| MQTT | IoT devices: lightweight pub/sub over TCP, QoS levels |

## 10. Reliability & operations

- **Redundancy** at every layer; no single points of failure.
- **Timeouts, retries with exponential backoff + jitter, circuit breakers, bulkheads.**
- **Rate limiting** at the edge (token bucket, see LLD examples).
- **Idempotency keys** for safe retries of writes (payments!).
- **Observability:** metrics (RED/USE), structured logs, distributed tracing; SLIs/SLOs/error budgets.
- **Deployment:** blue/green, canary, feature flags; backward-compatible schema migrations.
- **Disaster recovery:** backups, multi-region, RPO/RTO targets.

## 11. Other building blocks

- **Object storage** (S3) for blobs: images, videos, firmware images.
- **Search** (Elasticsearch/OpenSearch): inverted indexes.
- **Bloom filters:** "definitely not present / maybe present" with tiny memory.
- **Unique IDs:** UUIDv4/v7, Snowflake (timestamp + machine id + sequence) for sortable 64-bit IDs.
- **Geospatial:** geohash, quadtrees, S2 cells.
- **Leader election / distributed locks:** ZooKeeper/etcd leases (beware: Redis locks need fencing tokens).

## 12. What great answers do

- Quantify: "~1.2 K QPS writes, 100 K QPS reads — read-heavy, so cache aggressively."
- State trade-offs explicitly: "I'm choosing eventual consistency for likes because a stale count is acceptable, but strong consistency for balances."
- Go deep on one hard part instead of shallow on everything.
- Mention failure modes and how the system degrades gracefully.
