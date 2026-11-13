# ADR 0001: Knowledge graph storage and enrichment pipeline

- **Status:** Proposed
- **Date:** 2026-11-13
- **Issue:** #15 (open questions 1, 3, 4; question 2 only partly, see [Enrichment](#enrichment-pipeline))
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

| | A. Apache AGE (in Postgres) | B. Neo4j / Memgraph (alongside Postgres) | C. Relational graph in Postgres (edge table + recursive SQL + pgvector) |
|---|---|---|---|
| Datastores | 1 | 2 (Postgres + graph) and a sync path between them | 1 |
| Query language | openCypher, wrapped in SQL: `cypher('g', $$…$$) AS (v agtype)` | Cypher | SQL (recursive CTEs, `LATERAL`) |
| .NET support | No official driver. Community Npgsql plugins only (e.g. `Konnektr.Npgsql.Age`, `ApacheAGE`). No EF Core. Results come back as `agtype`. | Official Neo4j .NET driver. Memgraph uses the Bolt protocol. | EF Core for CRUD, raw SQL for graph queries. All first-party. |
| Graph algorithms | None built in. AGE is a query layer. | Built in: Neo4j GDS, Memgraph MAGE | None built in. Run them in-process; at 10k nodes that takes milliseconds. |
| Vectors (FR-A6) | Needs pgvector too. No published image has both, so it needs a custom multi-arch image. | Needs a vector store; still Postgres, or the graph DB's own vector index | `pgvector/pgvector:pg18`: official, amd64 + arm64 |
| License | Apache 2.0 | Neo4j Community: GPLv3. Memgraph Community: BSL. | PostgreSQL license |
| PG18 / arm64 | `release_PG18_1.8.0` image, amd64 + arm64 | Not checked | Yes |

Facts checked on 2026-11-13: AGE releases and Docker Hub tags, pgvector README and Docker Hub tags, the Neo4j and Memgraph repo READMEs, and NuGet search for AGE clients.

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
2. The queue's cost grows with the number of seeds. 486 reads in 7 days is an artifact of the synthetic data (40% of bookmarks read within 60 days); realistic personal numbers are far lower. Still, **cap the seeds** (most recent N, weighted by recency) instead of relying on the window alone.
3. Path search finds technically correct but useless paths through hubs (`bookmark → popular tag → bookmark`). FR-C3 needs hub penalties, or a rule against traversing high-degree nodes. That applies to any engine; Cypher's `shortestPath` has the same problem.

Limitations: synthetic data, Postgres 16 rather than 18, x86 rather than arm64. A Raspberry Pi-class arm64 host will be slower by some constant factor, which the headroom above covers. AGE and Neo4j were not benchmarked; at this scale they don't need to be, because C already passes.

## Decision

**Option C: model the graph relationally in Postgres. Postgres stays the only datastore and the system of record.**

- Graph queries use recursive CTEs and `LATERAL` joins, held in one repository class and returned through bounded DTOs.
- Use pgvector for embeddings when FR-A6 lands (P2).
- Graph algorithms for P3 (PageRank, community detection, bridges) run in-process in a background job. The results are written back as scores or cluster tables.

Why not A or B:

- **The built-in algorithms argument for B** is weak at this scale. Every algorithm FR is P3, and on about 226k edges they run in milliseconds in memory. Against that, B means a second store, dual writes, and a JVM service (Neo4j) on an arm64 host.
- **A's main benefit is Cypher ergonomics**, mostly for variable-length paths. The price: no official .NET driver, `agtype` plumbing, no EF Core, and a custom Postgres image to combine AGE with pgvector. A also adds no algorithms.
- **C doesn't block A later.** AGE is a Postgres extension, so if path-heavy queries become painful in SQL it can be added over the same database.

Revisit if: the edge count passes about 5M, P2/P3 queries turn into mostly variable-length pattern matching, or interactive graph visualization tooling becomes a requirement.

### Answers to the open questions in #15

1. **Storage:** C (above).
2. **Enrichment provider:** deferred to ADR 0002. P1 doesn't need an LLM (see phasing below).
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
  created_at        timestamptz NOT NULL DEFAULT now(),
  read_at           timestamptz,
  enrichment_status text NOT NULL DEFAULT 'pending', -- NFR-2
  enriched_at       timestamptz,
  search            tsvector                        -- FR-C5, maintained by trigger/job
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

## Enrichment pipeline

```
POST /bookmarks ──tx──▶ insert entity + bookmark(status=pending) + enrichment_job ──▶ 201
                                                     │ NOTIFY enrichment
BackgroundService ◀── LISTEN + poll (SELECT … FOR UPDATE SKIP LOCKED) ──┘
   └─ fetch → normalize/dedupe → extract (title, canonical, author, links) → resolve links → [P2: topics, embeddings]
```

- **Queue:** a Postgres table plus `SKIP LOCKED`, running in the same process. No Redis or RabbitMQ. Retries back off; `attempts` and `last_error` are visible through the API (NFR-2).
- **Stages are idempotent and versioned.** FR-A10's re-run means enqueuing a job again, for one bookmark or for all.
- **A failed fetch doesn't fail the save** (FR-A3). The bookmark stays usable, with `enrichment_status=failed`.
- **SSRF:** by default the fetcher refuses private, loopback and link-local targets, including after redirects. An MCP or agent client can add arbitrary URLs, and the server shares a network with Postgres. Make this configurable for intranet bookmarks.
- **Normalization (FR-B2), applied before the unique check:** lowercase the scheme and host, drop default ports and the fragment, strip `utm_*`, `fbclid`, `gclid` and similar, and sort the query string. After the fetch, a redirect target or `rel=canonical` that matches an existing bookmark merges into it, and the old URL goes into `url_alias`. Mirror detection (content hashing) is P2.
- **P1 needs no LLM.** Tags are user-supplied; domain, author, links and canonical URL come from parsing HTML. Topics (FR-A5) and embeddings (FR-A6) are P2. They sit behind `ITopicExtractor` / `IEmbedder`, aimed at an OpenAI-compatible endpoint so llama.cpp, Ollama or a hosted API can be swapped by config. The choice of model and provider is ADR 0002. Store the embedding model id next to each vector, so changing models means re-embedding instead of silently mixing vector spaces.

## API guardrails (FR-F6)

- Every list or graph endpoint takes `limit` (default 50, max 200) and a cursor. Nothing returns the whole collection.
- Neighbourhood: `depth` ≤ 3 and a per-hop fanout cap, ordered by edge weight. Hub nodes are capped, never fully expanded.
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
4. Enrichment queue, fetcher, HTML extraction and link resolution (FR-A3, FR-A4, NFR-2).
5. Server-side search (FR-C5).
6. Related, backlinks and neighbourhood endpoints with bounds (FR-C1, FR-C2, FR-F1, FR-F6).
7. Finish-the-thread queue (FR-D1).
8. Frontend: tags, detail view with related and backlinks, queue view.
