# System Design Case Studies

Five classic designs, each structured the way you should present them. Practise each out loud in 35–40 minutes.

## 1. URL Shortener (TinyURL / bit.ly)

**Requirements**
- Functional: create a short URL for a long URL; redirect short → long; optional custom alias and expiry; click analytics.
- Non-functional: very read-heavy (100:1), low-latency redirects (<50 ms), highly available, short codes not guessable in sequence.

**Estimates:** 100 M new URLs/month ≈ 40 writes/s; 4 K reads/s (peaks ×3). 5 years × 1.2 B × 500 B ≈ 3 TB.

**API**
```text
POST /api/v1/urls   { "long_url": "...", "alias"?: "...", "ttl_days"?: 30 }  -> { "code": "aZ3kP9q" }
GET  /{code}        -> 301/302 redirect (302 if you want every click to hit you for analytics)
```

**Code generation**
- 7 chars of base62 → 62⁷ ≈ 3.5 trillion codes.
- Option A: hash (MD5/SHA) of the URL, take 43 bits → collisions must be checked.
- Option B (preferred): a unique 64-bit ID (from a **ticket server / ID ranges per app server**, or Snowflake) → base62-encode. No collisions; shuffle bits or use a Feistel permutation so codes aren't sequential.

**Data model:** `urls(code PK, long_url, user_id, created_at, expires_at)` in a key-value store (DynamoDB/Cassandra) — single-key lookups, easy to shard by `code`.

**Architecture**
```text
client → CDN/edge → LB → stateless API servers → Redis cache (hot codes) → KV store
                                         └→ Kafka (click events) → analytics pipeline → OLAP DB
```

**Deep dives:** cache hit ratio (top 20% of URLs → 80% of traffic); 301 vs 302; abuse prevention (rate limiting, malware URL scanning); expired-link cleanup (lazy on read + background sweeper).

## 2. Chat System (WhatsApp / Slack)

**Requirements:** 1:1 and group messages, online presence, delivery/read receipts, message history, push notifications for offline users. 500 M DAU, low latency (<200 ms), messages must not be lost, ordered per conversation.

**Key decisions**
- **Transport:** persistent **WebSocket** connections to a fleet of *chat gateway* servers (each holds ~100 K–1 M connections). A **session service** (Redis) maps `user_id → gateway_id`.
- **Message flow:** sender → gateway → chat service: assigns a per-conversation **sequence number**, persists, then routes to the recipient's gateway (via pub/sub, e.g. Kafka/Redis) → recipient. If offline → push notification service (APNs/FCM) + stored for later sync.
- **Storage:** messages in a wide-column store (Cassandra/ScyllaDB) partitioned by `conversation_id`, clustered by `seq` → efficient "latest N messages" queries.
- **Ordering & delivery:** at-least-once with client-side dedupe by `(conversation_id, client_msg_id)`; ack chain gives "sent ✓ / delivered ✓✓ / read".
- **Groups:** fan-out on write for small groups; for huge channels, fan-out on read.
- **Presence:** heartbeats every ~30 s; mark offline after missed heartbeats; publish presence only to interested friends to avoid storms.
- **End-to-end encryption:** Signal protocol — servers store ciphertext only.

## 3. News Feed (Twitter/X, Instagram)

**Requirements:** post content; follow users; home timeline of recent posts from followees, ranked; 300 M DAU; feed load < 200 ms.

**Fan-out strategies**

| | Fan-out on write (push) | Fan-out on read (pull) |
|---|---|---|
| How | on post, insert post ID into each follower's precomputed timeline (Redis list) | on read, gather recent posts of each followee and merge |
| Read latency | very fast | slower |
| Write cost | huge for celebrities (100 M followers) | cheap |

**Hybrid (what real systems do):** push for normal users; for celebrities, pull their posts at read time and merge into the precomputed timeline. The k-way merge is the same algorithm as *Problems → Heap → Design Twitter*.

**Components:** post service (+ object storage + CDN for media), social graph service, fan-out workers consuming a post-created Kafka topic, timeline cache, ranking service (ML model scoring candidates), notification service.

## 4. Distributed Key-Value Store (Dynamo-style)

**Requirements:** `put(k, v)`, `get(k)`; horizontally scalable; highly available; tunable consistency; survives node failures.

**Design**
- **Partitioning:** consistent hashing with virtual nodes.
- **Replication:** each key stored on N successive nodes (e.g. N=3) on the ring, across availability zones.
- **Quorums:** write succeeds after W acks, read queries R replicas; W + R > N ⇒ reads overlap the latest write (e.g. N=3, W=2, R=2).
- **Conflict resolution:** vector clocks or last-write-wins (with hybrid logical clocks); read repair; anti-entropy with **Merkle trees** to sync replicas cheaply.
- **Failure handling:** gossip-based membership & failure detection; **hinted handoff** when a replica is temporarily down; sloppy quorums.
- **Storage engine per node:** LSM tree — memtable + write-ahead log → SSTables, compaction, Bloom filters per SSTable for fast negative lookups.

**Trade-off narrative:** this is an AP system in CAP terms (available under partition, eventually consistent), with tunable R/W pushing towards consistency when needed.

## 5. IoT Telemetry Pipeline (embedded-friendly)

**Requirements:** 1 M devices (sensors, vehicles) send telemetry every 10 s; operators view live dashboards and historical trends; send commands/config to devices; firmware OTA updates; devices on flaky cellular links.

**Estimates:** 100 K messages/s, ~200 B each → 20 MB/s ingest, ~1.7 TB/day raw.

**Device side**
- **MQTT** over TLS (lightweight, persistent sessions, QoS 0/1/2), or CoAP/UDP for very constrained devices.
- Compact payloads: CBOR/protobuf, delta encoding, batching.
- **Store-and-forward** ring buffer in flash for offline periods; timestamps from RTC/GPS; sequence numbers for dedupe.
- Device identity: per-device X.509 certificates in a secure element; mutual TLS.

**Cloud side**
```text
devices ─MQTT─► broker cluster (EMQX/AWS IoT Core) ─► Kafka (partition by device_id)
                                                   ├─► stream processing (Flink): alerts, aggregates
                                                   ├─► time-series DB (TimescaleDB/InfluxDB/ClickHouse) → dashboards
                                                   └─► object storage (Parquet) → batch analytics/ML
device registry / shadow (desired vs reported state) ◄─► command & config service
OTA service: signed firmware in object storage + CDN, staged rollout
```

**Deep dives**
- **Device shadow / digital twin:** keep last reported and desired state so commands work even when devices are offline.
- **OTA safety:** A/B partitions, signature verification in the bootloader, staged rollouts (1% → 10% → 100%) with automatic halt on crash-rate increase, rollback.
- **Back-pressure:** brokers and Kafka absorb bursts (e.g. all devices reconnecting after an outage — add randomised reconnect jitter on devices!).
- **Downsampling & retention:** raw for 7 days, 1-min aggregates for a year.

## How to practise

1. Pick a case, set a 40-minute timer, talk out loud.
2. Draw the diagram (paper or excalidraw).
3. Compare with these notes; note what you missed.
4. Re-do it a week later with a twist (10× scale, multi-region, strict consistency).
