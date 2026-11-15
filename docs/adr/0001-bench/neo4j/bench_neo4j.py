"""Neo4j (Cypher) port of the ADR 0001 P1 queries, on the same data as the Postgres and SQLite runs.
Usage: python3 bench_neo4j.py [bolt-uri]   (auth disabled; data loaded with prepare_import.py + neo4j-admin import)"""
import math, random, statistics, sys, time, json
from neo4j import GraphDatabase

drv = GraphDatabase.driver(sys.argv[1] if len(sys.argv) > 1 else 'bolt://localhost:7687', notifications_min_severity='OFF')
s = drv.session()
for stmt in ["CREATE INDEX entity_id IF NOT EXISTS FOR (n:Entity) ON (n.id)",
             "CREATE INDEX bookmark_read IF NOT EXISTS FOR (b:Bookmark) ON (b.read_at)",
             "CREATE INDEX bookmark_created IF NOT EXISTS FOR (b:Bookmark) ON (b.created_at)"]:
    s.run(stmt).consume()
s.run("CALL db.awaitIndexes(300)").consume()

NB2 = """MATCH (r:Entity {id: $id})
CALL (r) { MATCH (r)-[e]-(n) RETURN n ORDER BY e.weight DESC LIMIT 50 }
WITH r, collect(DISTINCT n) AS h1
UNWIND h1 AS n
CALL (n) { MATCH (n)-[e]-(m) RETURN m ORDER BY e.weight DESC LIMIT 50 }
WITH r, h1, collect(DISTINCT m) AS h2
RETURN size(([r] + h1 + [x IN h2 WHERE x <> r AND NOT x IN h1])[..200]) AS n"""
NB3 = """MATCH (r:Entity {id: $id})
CALL (r) { MATCH (r)-[e]-(n) RETURN n ORDER BY e.weight DESC LIMIT 50 }
WITH r, collect(DISTINCT n) AS h1
UNWIND h1 AS n
CALL (n) { MATCH (n)-[e]-(m) RETURN m ORDER BY e.weight DESC LIMIT 50 }
WITH r, h1, collect(DISTINCT m) AS h2
UNWIND h2 AS m
CALL (m) { MATCH (m)-[e]-(o) RETURN o ORDER BY e.weight DESC LIMIT 50 }
WITH r, h1, h2, collect(DISTINCT o) AS h3
RETURN size(([r] + h1 + [x IN h2 WHERE x <> r AND NOT x IN h1] + h3)[..200]) AS n"""
RELATED = """MATCH (r:Entity {id: $id})
CALL (r) {
  MATCH (r)-[e1:TAGGED|ABOUT|AUTHORED_BY|LINKS_TO|ON_DOMAIN]->(x)<-[e2]-(o)
  WHERE type(e2) = type(e1) AND o <> r
  RETURN o, type(e1) AS t,
    CASE type(e1) WHEN 'ABOUT' THEN 2 * e1.weight * e2.weight WHEN 'TAGGED' THEN 1.0 WHEN 'AUTHORED_BY' THEN 1.0
                  WHEN 'LINKS_TO' THEN 0.3 ELSE 0.1 END AS w
  UNION ALL MATCH (r)-[:LINKS_TO]->(o:Bookmark) RETURN o, 'links_to' AS t, 3.0 AS w
  UNION ALL MATCH (o)-[:LINKS_TO]->(r) RETURN o, 'linked_from' AS t, 3.0 AS w
}
RETURN o.id AS id, sum(w) AS score, collect(DISTINCT t) AS why ORDER BY score DESC LIMIT 20"""
BACKLINKS = """MATCH (b:Bookmark)-[:LINKS_TO]->(:Entity {id: $id})
RETURN b.id AS id ORDER BY b.created_at DESC LIMIT 50"""
BY_TAG = """MATCH (t:Entity {id: $id})<-[:CHILD_OF*0..]-(d)<-[:TAGGED]-(b:Bookmark)
WITH DISTINCT b ORDER BY b.created_at DESC LIMIT 50 RETURN b.id AS id"""
QUEUE = """MATCH (r:Bookmark) WHERE r.read_at > $since
WITH r ORDER BY r.read_at DESC LIMIT $seeds
CALL (r) {
  MATCH (r)-[e1:TAGGED|ABOUT|AUTHORED_BY]->(x)
  WITH r, e1, x, CASE type(e1) WHEN 'TAGGED' THEN COUNT { (x)<-[:TAGGED]-() }
                               WHEN 'ABOUT' THEN COUNT { (x)<-[:ABOUT]-() }
                               ELSE COUNT { (x)<-[:AUTHORED_BY]-() } END AS n
  WHERE n <= $hub_max
  MATCH (x)<-[e2]-(c:Bookmark) WHERE type(e2) = type(e1) AND c <> r AND c.read_at IS NULL
  RETURN c, (CASE type(e1) WHEN 'ABOUT' THEN 2 * e1.weight * e2.weight ELSE 1.0 END)
            / CASE WHEN $discount THEN log(1 + n) ELSE 1.0 END AS w
  UNION ALL MATCH (r)-[:LINKS_TO]->(c:Bookmark) WHERE c.read_at IS NULL RETURN c, 3.0 AS w
  UNION ALL MATCH (c:Bookmark)-[:LINKS_TO]->(r) WHERE c.read_at IS NULL RETURN c, 3.0 AS w
}
RETURN c.id AS id, sum(w) AS score ORDER BY score DESC LIMIT 20"""

since = int(time.time()) - 7 * 86400
Q_ALL = dict(since=since, seeds=10**6, hub_max=10**9, discount=False)
Q_30 = dict(since=since, seeds=30, hub_max=10**9, discount=False)
Q_D = dict(since=since, seeds=30, hub_max=200, discount=True)
LAST = {}
def run(q, **p):
    r = s.run(q, p); rows = r.data(); sm = r.consume()
    LAST['server'] = (sm.result_available_after or 0) + (sm.result_consumed_after or 0)
    return rows

random.seed(1)
bm = [random.randint(1, 10000) for _ in range(50)]
hubs = [random.randint(20001, 20010) for _ in range(50)]
roots = [random.randint(20001, 20050) for _ in range(50)]
cases = [
    ('F1 neighbourhood d=2 (bookmark)', lambda i: run(NB2, id=i), bm),
    ('F1 neighbourhood d=3 (bookmark)', lambda i: run(NB3, id=i), bm),
    ('F1 neighbourhood d=2 (hub tags)', lambda i: run(NB2, id=i), hubs),
    ('C1 related', lambda i: run(RELATED, id=i), bm),
    ('C2 backlinks', lambda i: run(BACKLINKS, id=i), bm),
    ('B1 by_tag root (hierarchy)', lambda i: run(BY_TAG, id=i), roots),
    ('D1 queue 7d, all seeds', lambda _: run(QUEUE, **Q_ALL), [0] * 10),
    ('D1 queue 7d, 30 seeds', lambda _: run(QUEUE, **Q_30), [0] * 20),
    ('D1 queue 7d, 30 seeds, skip hubs >200', lambda _: run(QUEUE, **Q_D), [0] * 20),
]
# A long-running server is warm: plan caching and JIT. Warm every query shape before timing.
for _, fn, ids in cases:
    for i in ids[:5]: fn(i)
p95 = lambda xs: sorted(xs)[max(0, math.ceil(.95 * len(xs)) - 1)]
base = []
for _ in range(50):
    t0 = time.perf_counter(); run('RETURN 1 AS x'); base.append((time.perf_counter() - t0) * 1000)
print(f"client round trip for RETURN 1: p50 {statistics.median(base):.2f} ms")
print(f"{'query':<40} {'server p50':>10} {'server p95':>10} {'client p50':>10}")
for label, fn, ids in cases:
    cl, sv = [], []
    for i in ids:
        t0 = time.perf_counter(); fn(i); cl.append((time.perf_counter() - t0) * 1000); sv.append(LAST['server'])
    print(f"{label:<40} {statistics.median(sv):10.1f} {p95(sv):10.1f} {statistics.median(cl):10.1f}")
print('recent reads (7d):', run("MATCH (b:Bookmark) WHERE b.read_at > $since RETURN count(b) AS n", since=since)[0]['n'])
# results for the cross-engine check
json.dump({'queue_d': [r['id'] for r in run(QUEUE, **Q_D)], 'related_42': [r['id'] for r in run(RELATED, id=42)],
           'by_tag_20003': [r['id'] for r in run(BY_TAG, id=20003)]}, open('neo4j_results.json', 'w'))
drv.close()
