# ADR 0001: Knowledge graph storage and enrichment

- **Status:** Proposed
- **Date:** 2026-11-13
- **Issue:** #15 (open questions 1–4; see [Enrichment](#enrichment-done-by-api-clients-not-the-app))
- **Visual versions:** [animated walkthrough](https://eklavyamirani.github.io/bookmarks-manager/adr/0001-story.html) · [review page](https://eklavyamirani.github.io/bookmarks-manager/adr/0001-review.html) (GitHub Pages; each PR touching `docs/` also gets a preview link)

## Context

#15 turns `saved_links` into a personal knowledge graph and leaves two decisions to an ADR: the storage engine, and how enrichment runs. The constraints that matter come from the issue:

- Scale: hundreds to low thousands of bookmarks; target 10k (NFR-4).
- Interactive graph queries (related, backlinks, queue) under 300 ms at 10k (NFR-4).
- Saving is fast; enrichment is async with visible status (NFR-2).
- Docker Compose on amd64 + arm64 (NFR-3).
- REST is the source of truth; MCP is a thin adapter (FR-F7).
- No data migration needed (NFR-1), so the schema can be redesigned from scratch.

Stack today: ASP.NET Core on .NET 9, EF Core 9 + Npgsql, Postgres (`postgres:18beta1`), React frontend.

## Options

| | A. Apache AGE (in Postgres) | B. Neo4j / Memgraph (alongside Postgres) | C. Relational graph in Postgres (edge table + recursive SQL + pgvector) | D. Relational graph in SQLite (embedded file) |
|---|---|---|---|---|
| Datastores | 1 | 2 (Postgres + graph) and a sync path between them | 1 | 1, embedded: no database container |
| Query language | openCypher, wrapped in SQL: `cypher('g', $$…$$) AS (v agtype)` | Cypher | SQL (recursive CTEs, `LATERAL`) | SQL (recursive CTEs). No `LATERAL`, so a per-hop fan-out cap means one query per hop |
| .NET support | No official driver. Community Npgsql plugins only (e.g. `Konnektr.Npgsql.Age`, `ApacheAGE`). No EF Core. Results come back as `agtype`. | Official Neo4j .NET driver. Memgraph uses the Bolt protocol. | EF Core for CRUD, raw SQL for graph queries. All first-party. | First-party EF Core provider. Many schema changes rebuild the table; `DateTimeOffset` can't be sorted in SQL. |
| Graph algorithms | None built in. AGE is a query layer. | Built in: Neo4j GDS, Memgraph MAGE | None built in. Run them in-process; at 10k nodes that takes milliseconds. | Same as C |
| Vectors (FR-A6) | Needs pgvector too. No published image has both, so it needs a custom multi-arch image. | Needs a vector store; still Postgres, or the graph DB's own vector index | `pgvector/pgvector:pg18`: official, amd64 + arm64 | `sqlite-vec`, which is pre-1.0 (its README: "expect breaking changes") |
| License | Apache 2.0 | Neo4j Community: GPLv3. Memgraph Community: BSL. | PostgreSQL license | Public domain |
| PG18 / arm64 | `release_PG18_1.8.0` image, amd64 + arm64 | Not checked | Yes | Yes (a library, not an image) |

Facts checked on 2026-11-13: AGE releases and Docker Hub tags, pgvector README and Docker Hub tags, the Neo4j and Memgraph repo READMEs, and NuGet search for AGE clients. Added 2026-11-15: the `sqlite-vec` README and the EF Core SQLite provider limitations page.

D was added after enrichment moved out of the app. With no in-app job queue, and with external clients using the API instead of the database, nothing needs a database server any more, so an embedded database became a real candidate.

## Measurement

The question that decides this: is plain SQL fast enough, or does it need a graph engine? I built a synthetic graph shaped like the proposed schema at the NFR-4 scale and ran each P1 query against it. Sources are in [`0001-bench/`](0001-bench/).

**Data:** 10k bookmarks, 2k tags (in a hierarchy), 3k domains, 50k unsaved URL entities, 500 authors, 300 topics. About 226k edges. The distribution is skewed so hubs exist: the largest in-degrees are 2,230 (a tag), 1,372 (a domain), 1,713 (a topic).

**Setup:** Postgres 16.15, x86_64 cloud VM, warm cache, 50 random roots per query (10–20 for the queue and path queries).

| Query | FR | p50 ms | p95 ms | max ms |
|---|---|---:|---:|---:|
| Neighbourhood, depth 2, fanout cap 50, 200 nodes | F1/F6 | 1.3 | 2.0 | 2.2 |
| Neighbourhood, depth 3 | F1 | 18.6 | 29.6 | 33.6 |
| Neighbourhood, depth 2, from hub tags | F1 | 2.7 | 3.2 | 4.4 |
| Related bookmarks with reasons, top 20 | C1 | 1.6 | 3.4 | 4.4 |
| Backlinks | C2 | 0.1 | 0.1 | 0.2 |
| Filter by tag including descendants, page of 50 | B1 | 0.7 | 2.7 | 2.8 |
| Finish-the-thread queue, 7d window, **486 seeds** | D1 | 285 | 325 | 327 |
| Finish-the-thread queue, 7d window, 30 most recent seeds | D1 | 21.8 | 22.0 | 22.1 |
| Path between two bookmarks, BFS up to depth 4 | C3 | 46 | 194 | 210 |

What this shows:

1. Every P1 query is one to two orders of magnitude under the 300 ms budget, except the queue when it is seeded from every read in the window.
2. The queue's cost is set by popular tags more than by the number of seeds. See [Reading queue: where the time goes](#reading-queue-where-the-time-goes).
3. Path search finds technically correct but useless paths through hubs (`bookmark → popular tag → bookmark`). FR-C3 needs hub penalties, or a rule against traversing high-degree nodes. That applies to any engine; Cypher's `shortestPath` has the same problem.

### Reading queue: where the time goes

The queue (FR-D1) ranks unread bookmarks by what they share with recent reads. It does this in two hops: from each recent read (a "seed") to its tags, topics and author, then to every other bookmark attached to those. Each pairing becomes one row to score, so:

> rows to score ≈ seeds × tags per seed × bookmarks per tag

Measured fan-out with a 7-day window:

| Step | All 486 seeds | 30 seeds |
|---|---:|---:|
| Seeds | 486 | 30 |
| Hop 1: their tags, topics, authors | 3,134 | 195 |
| Hop 2: rows to score | 687,956 | 47,765 |
| Distinct bookmarks scored | 10,000 | 8,355 |

One tag with 2,230 bookmarks produced 250k of the 688k rows, and the largest topic another 145k. A tag on a fifth of the collection says almost nothing about relatedness, so these rows cost the most and carry the least signal.

Variants, from a separate run (timings vary about 10–40% between runs on this VM):

| Variant | p50 ms | p95 ms |
|---|---:|---:|
| A. All 486 seeds | 324 | 360 |
| B. 30 most recent seeds | 32 | 43 |
| C. All seeds, skip tags/topics with more than 200 bookmarks | 118 | 121 |
| D. 30 seeds, skip those, weight shared tags by 1 / ln(1 + tag size) | 9 | 10 |

- **Speed:** B, C and D all fit the budget.
- **Ranking:** A and B share 10 of their top 20. B and D share none, so popular tags were deciding B's ranking. Synthetic data can't say which ranking is better; that needs real bookmarks.
- **Rule for FR-D1:** cap seeds **and** down-weight popular tags (variant D). It needs a per-tag bookmark count kept up to date. The queue PR (Phase 1, item 7) checks ranking quality against real data before choosing the cutoff and weighting.

### Option D measured: SQLite

The same data was exported from Postgres and loaded into SQLite 3.53.1, and both ran back to back on the same machine ([`0001-bench/sqlite/`](0001-bench/sqlite/)). p50 in ms:

| Query | Postgres | SQLite | Why the gap |
|---|---:|---:|---|
| Backlinks | 0.1 | 0.0 | Index lookup in both |
| Related | 2.3 | 3.0 | Same plan shape |
| Neighbourhood, 2 hops | 2.3 | 2.9 | SQLite runs one query per hop (no `LATERAL`) |
| Neighbourhood, 3 hops | 30 | 20 | Hop-by-hop avoids some duplicate work |
| Filter by tag tree | 0.9 | 0.2 | After rewriting `EXISTS` as `IN`; with `EXISTS` it took 76 ms (a planner quirk, same results) |
| Reading queue, the chosen rule (30 seeds, popular tags discounted) | 11 | 41–48 | SQLite joins with nested loops only; Postgres hashes the 8.5k rows. Forcing materialization didn't help. |
| Reading queue, all 486 seeds (rejected) | 468 | 2,225 | Same reason, amplified |

The VM was noisier in this run than in the earlier ones (Postgres's own queue numbers are higher), but the two engines ran back to back, so the comparison holds.

Limitations: synthetic data, Postgres 16 rather than 18, x86 rather than arm64. A Raspberry Pi-class arm64 host will be slower by some constant factor, which the headroom above covers. AGE and Neo4j were not benchmarked; at this scale they don't need to be, because C already passes.

## Decision

**Option C: model the graph relationally in Postgres. Postgres stays the only datastore and the system of record.**

- Graph queries use recursive CTEs and `LATERAL` joins, held in one repository class and returned through bounded DTOs.
- Use pgvector for embeddings when FR-A6 lands (P2).
- Graph algorithms for P3 (PageRank, community detection, bridges) run in-process in a background job. The results are written back as scores or cluster tables.

Why not A, B or D:

- **The built-in algorithms argument for B** is weak at this scale. Every algorithm FR is P3, and on about 226k edges they run in milliseconds in memory. Against that, B means a second store, dual writes, and a JVM service (Neo4j) on an arm64 host.
- **A's main benefit is Cypher ergonomics**, mostly for variable-length paths. The price: no official .NET driver, `agtype` plumbing, no EF Core, and a custom Postgres image to combine AGE with pgvector. A also adds no algorithms.
- **D is the runner-up.** It removes a container and makes backup a file copy. The price: the one query near its budget (the reading queue) runs about 4× slower, which matters on a small arm64 host; similarity search would rest on a pre-1.0 extension; and EF Core migrations rebuild tables for many schema changes.
- **C doesn't block A later.** AGE is a Postgres extension, so if path-heavy queries become painful in SQL it can be added over the same database.

Revisit if: the edge count passes about 5M, P2/P3 queries turn into mostly variable-length pattern matching, or interactive graph visualization tooling becomes a requirement. Switch to D if similarity search (FR-A6) leaves the app, or the host can't spare a database container.

### Answers to the open questions in #15

1. **Storage:** C (above).
2. **Enrichment provider:** not this app's concern. Enrichment runs in an external client (n8n or any other) through the API, so the client chooses its own fetcher, LLM and embedding model. See [Enrichment](#enrichment-done-by-api-clients-not-the-app).
3. **Ownership:** Postgres is the system of record. There is no derived graph index to keep in sync.
4. **P1 edge vocabulary:** `tagged` (bookmark→tag), `child_of` (tag→tag), `on_domain` (bookmark→domain), `links_to` (bookmark→bookmark|url), `authored_by` (bookmark→author). Dedupe aliases go in a table, not edges. P2 adds `about` (topic, weighted), `found_via`, `in_collection`, and the annotation types (`contradicts`, `supersedes`, `expands_on`).

## Schema sketch (P1)

```sql
CREATE TYPE entity_kind AS ENUM ('bookmark','tag','domain','url','author');
CREATE TYPE edge_type   AS ENUM ('tagged','child_of','on_domain','links_to','authored_by');

-- One id space for everything an edge can point to.
CREATE TABLE entity (id bigserial PRIMARY KEY, kind entity_kind NOT NULL, created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE bookmark (
  id                bigint PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE,
  url               text NOT NULL,
  url_normalized    text NOT NULL UNIQUE,          -- FR-B2
  canonical_url     text,
  title             text,
  why               text,                           -- FR-A8: why it was saved, written at save time
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(), -- cursor for API clients
  read_at           timestamptz,
  enrichment_status text NOT NULL DEFAULT 'pending', -- pending | done | failed, set by the enricher (NFR-2)
  enriched_at       timestamptz,
  search            tsvector                        -- FR-C5, maintained by trigger
);
CREATE INDEX bookmark_pending ON bookmark (updated_at) WHERE enrichment_status = 'pending';
CREATE TABLE note (                                 -- FR-A8: thoughts added later
  id          bigserial PRIMARY KEY,
  bookmark_id bigint NOT NULL REFERENCES bookmark(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tag      (id bigint PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE, name text NOT NULL UNIQUE);
CREATE TABLE domain   (id bigint PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE, host text NOT NULL UNIQUE);
CREATE TABLE url_ref  (id bigint PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE, url_normalized text NOT NULL UNIQUE);
CREATE TABLE author   (id bigint PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE, name text NOT NULL);
CREATE TABLE url_alias(url_normalized text PRIMARY KEY, bookmark_id bigint NOT NULL REFERENCES bookmark(id) ON DELETE CASCADE);

CREATE TABLE edge (
  src        bigint NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  dst        bigint NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  type       edge_type NOT NULL,
  weight     real NOT NULL DEFAULT 1,
  created_by text NOT NULL DEFAULT 'system',  -- 'user' | 'agent' | 'system' (FR-F4)
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (src, type, dst)
);
CREATE INDEX edge_dst ON edge (dst, type, src);
```

The shared `entity` id makes FR-A4 cheap. When a saved page links to a URL that is saved later, the `url_ref` row is replaced by a `bookmark` row with the **same id**, and `entity.kind` flips to `bookmark`. Every incoming `links_to` edge then points at the new bookmark without being rewritten.

Persistence: switch from database-first scaffolding plus `EnsureCreated()` to **EF Core code-first migrations**. NFR-1 allows starting empty, and the schema will change often.

## Enrichment: done by API clients, not the app

**Change from #15 FR-A3.** The issue says "the system fetches the page". Instead, the app never fetches anything. An external client does it, for example an n8n workflow: it asks the API what needs enriching, fetches and parses the page itself, and writes the results back through the API.

```
you / agent ──POST /api/bookmarks {url, why, tags}──▶ app: normalize, dedupe, insert ──▶ 201 (status: pending)

enricher (n8n) ──GET /api/bookmarks?enrichment=pending&since=<cursor>──▶ app
   └─ fetch page → extract title, author, canonical URL, outbound links
   ──PATCH /api/bookmarks/{id} {title, author, canonicalUrl, enrichmentStatus}──▶ app
   ──PUT   /api/bookmarks/{id}/links {urls: [...]}──▶ app: links_to edges, url_ref for unsaved targets (FR-A4)
```

- **Why the app makes no outbound requests:** fetching user-supplied URLs is where SSRF comes from. With no fetcher in the app, there's nothing to guard here, and no outbound network access to configure.
- **SSRF moves to the enricher.** Whoever runs it must refuse private, loopback and link-local addresses, including after redirects. Anyone who can add a bookmark still chooses what the enricher fetches.
- **Pull, not push.** Clients poll the pending list with an `updated_at` cursor. *Why:* there's no webhook to deliver or retry, any number of clients can be added, and the app needs no queue table. The trade-off is latency equal to the poll interval. Phase 1 assumes one enricher; if there are ever several, add a claim endpoint (`SKIP LOCKED` with a lease) so two don't process the same bookmark.
- **Status (NFR-2):** a bookmark starts `pending`, and the enricher sets `done` or `failed`. **Re-run (FR-A10):** set the status back to `pending`, for one bookmark or for a filtered set.
- **A failed or missing enricher doesn't block anything.** Bookmarks stay usable with just a URL, `why` and tags.
- **Normalization (FR-B2) stays in the app, applied before the unique check:** lowercase the scheme and host, drop default ports and the fragment, strip `utm_*`, `fbclid`, `gclid` and similar, and sort the query string. When the enricher reports a `canonicalUrl` that matches another bookmark, the app merges the two and keeps the old URL in `url_alias`. Mirror detection (content hashing) is P2.
- **`url` is required.** Things without a page get a stable link anyway, for example a book via its Goodreads page.
- **P2 enrichment uses the same pattern.** Topics (FR-A5) and embeddings (FR-A6) are written by the client: `PUT …/topics` and `PUT …/embedding`, with the model id stored next to each vector. The client picks the LLM and the embedding model.

## API guardrails (FR-F6)

- Every list or graph endpoint takes `limit` (default 50, max 200) and a cursor. Nothing returns the whole collection.
- Neighbourhood: `depth` ≤ 3 and a per-hop fanout cap, ordered by edge weight. Hub nodes are capped, never fully expanded.
- Reading queue: at most 30 seeds, and shared tags/topics weighted by 1 / ln(1 + their bookmark count), skipping those above a cutoff (200 in the benchmark).
- Search (FR-C5): Postgres full-text search over title, URL, tags, domain, author and notes, plus `pg_trgm` for substring and fuzzy matches. This replaces today's in-memory filter in `BookmarksTool.SearchBookmarks`.

## Consequences

- One datastore; Compose keeps two services; the image becomes `pgvector/pgvector:pg18` (amd64 + arm64).
- Graph queries are hand-written SQL. They need tests against a real Postgres (Testcontainers) rather than the mock service.
- **Required deploy change:** move from `postgres:18beta1` to an 18 GA image. In the 18 images `PGDATA` is `/var/lib/postgresql/18/docker` and the `VOLUME` is `/var/lib/postgresql`, so the existing `deploy/docker-compose.yml` mount at `/var/lib/postgresql/data` has to become `/var/lib/postgresql`.
- Problems found that affect NFR-3:
  - `.devcontainer/Dockerfile` uses a .NET **8** base image, but the backend targets `net9.0`.
  - The same Dockerfile hard-codes `nvim-linux-arm64`, so the devcontainer image breaks on amd64.

## Proposed Phase 1 breakdown (one PR each)

1. Schema plus EF code-first migrations; image bump to `pgvector/pgvector:pg18` and the volume fix; keep today's CRUD, sort and search (NFR-1).
2. URL normalization, the dedupe/alias table, and domain linking (FR-A2, FR-B2).
3. Tags plus the hierarchy, with filtering by tag including descendants (FR-A1, FR-B1).
4. `why` and notes (FR-A8, promoted from P2), plus the enrichment API for external clients: pending list with cursor, metadata `PATCH`, links `PUT` (FR-A3 via client, FR-A4, NFR-2, FR-A10).
5. Server-side search (FR-C5).
6. Related, backlinks and neighbourhood endpoints with bounds (FR-C1, FR-C2, FR-F1, FR-F6).
7. Finish-the-thread queue (FR-D1), with the seed cap and popular-tag weighting; check its ranking against real bookmarks.
8. Frontend: tags, detail view with related and backlinks, queue view.
