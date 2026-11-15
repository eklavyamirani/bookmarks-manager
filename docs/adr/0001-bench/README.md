# ADR 0001 benchmark

These scripts produce the numbers in [ADR 0001](../0001-knowledge-graph-storage-and-enrichment.md). They run synthetic data at the NFR-4 target, about 10k bookmarks and 226k edges with skewed hubs, on three engines: Postgres (C), SQLite (D) and Neo4j as the only datastore (E).

## 1. Postgres: generates the data
```sh
psql -f schema_seed.sql -f queries.sql -f run.sql    # seed, define the queries, time them
```

## 2. Export the same data for the other engines
```sh
mkdir out && cd out && psql -f ../sqlite/export.sql   # writes entity.csv, bookmark.csv, edge.csv
```

## 3. SQLite
```sh
python3 ../sqlite/bench_sqlite.py .                   # also writes sqlite_results.json
python3 ../sqlite/bench_sqlite_rewrites.py .          # query-shape fixes for SQLite's planner
```

## 4. Neo4j Community 5.26 (Java 17 or 21)
Add to `conf/neo4j.conf`:
```
dbms.security.auth_enabled=false
server.memory.heap.initial_size=1g
server.memory.heap.max_size=1g
server.memory.pagecache.size=512m
server.default_listen_address=127.0.0.1
```
Then load the data and run the benchmark:
```sh
python3 ../neo4j/prepare_import.py . neo4j-import
neo4j-admin database import full neo4j --nodes=neo4j-import/nodes.csv \
  --relationships=neo4j-import/rels.csv --id-type=integer --overwrite-destination
neo4j start
pip install neo4j && python3 ../neo4j/bench_neo4j.py bolt://127.0.0.1:7687   # also writes neo4j_results.json
```

## 5. Check the ports agree
Write Postgres's results to `pg_results.json`, with the keys `queue_d`, `related_42` and `by_tag_20003`, using `thread_queue_hubcap(7, 30, 200)`, `related(42)` and `by_tag(20003)`. Then:
```sh
python3 ../crosscheck.py pg_results.json sqlite_results.json neo4j_results.json
```
Expect identical results for the queue and the tag filter. `related` differs only inside a tie at the same score.
