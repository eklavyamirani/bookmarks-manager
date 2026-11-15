"""SQLite port of the ADR 0001 P1 queries, on the same data as the Postgres benchmark.
Usage: python3 bench_sqlite.py <dir-with-csvs>   (CSV files come from export.sql)"""
import csv, math, os, random, sqlite3, statistics, sys, time

d = sys.argv[1]
db = sqlite3.connect(':memory:')
db.executescript("""
CREATE TABLE entity (id INTEGER PRIMARY KEY, kind TEXT NOT NULL);
CREATE TABLE bookmark (id INTEGER PRIMARY KEY, created_at INTEGER NOT NULL, read_at INTEGER);
CREATE TABLE edge (src INTEGER NOT NULL, dst INTEGER NOT NULL, type TEXT NOT NULL, weight REAL NOT NULL DEFAULT 1,
                   PRIMARY KEY (src, type, dst)) WITHOUT ROWID;
""")
def load(table, n):
    with open(os.path.join(d, table + '.csv')) as f:
        rows = [[None if v == '' else v for v in r] for r in csv.reader(f)]
    db.executemany(f"INSERT INTO {table} VALUES ({','.join('?' * n)})", rows)
load('entity', 2); load('bookmark', 3); load('edge', 4)
db.executescript("""
CREATE INDEX edge_dst ON edge (dst, type, src);
CREATE INDEX bookmark_created ON bookmark (created_at);
CREATE INDEX bookmark_read ON bookmark (read_at);
CREATE TABLE deg AS SELECT dst AS id, type, count(*) AS n FROM edge GROUP BY 1, 2;
CREATE UNIQUE INDEX deg_pk ON deg (id, type);
ANALYZE;
""")
now = int(time.time())

BACKLINKS = """SELECT b.* FROM edge e JOIN bookmark b ON b.id = e.src
  WHERE e.dst = ? AND e.type = 'links_to' ORDER BY b.created_at DESC LIMIT 50"""
BY_TAG = """WITH RECURSIVE t(id) AS (SELECT ? UNION SELECT e.src FROM edge e JOIN t ON e.dst = t.id WHERE e.type = 'child_of')
  SELECT b.* FROM bookmark b
  WHERE EXISTS (SELECT 1 FROM edge e JOIN t ON t.id = e.dst WHERE e.src = b.id AND e.type = 'tagged')
  ORDER BY b.created_at DESC LIMIT 50"""
RELATED = """SELECT other, sum(w) score, group_concat(DISTINCT reason) FROM (
    SELECT e2.src AS other, e1.type AS reason,
      CASE e1.type WHEN 'about' THEN 2 * e1.weight * e2.weight WHEN 'tagged' THEN 1 WHEN 'authored_by' THEN 1
                   WHEN 'links_to' THEN 0.3 WHEN 'on_domain' THEN 0.1 END AS w
    FROM edge e1 JOIN edge e2 ON e2.dst = e1.dst AND e2.type = e1.type AND e2.src <> e1.src
    WHERE e1.src = :r AND e1.type IN ('tagged','about','authored_by','links_to','on_domain')
    UNION ALL SELECT e.dst, 'links_to', 3 FROM edge e JOIN bookmark b ON b.id = e.dst WHERE e.src = :r AND e.type = 'links_to'
    UNION ALL SELECT e.src, 'linked_from', 3 FROM edge e WHERE e.dst = :r AND e.type = 'links_to'
  ) GROUP BY other ORDER BY score DESC LIMIT 20"""
QUEUE = """WITH recent AS (SELECT id FROM bookmark WHERE read_at > :since ORDER BY read_at DESC LIMIT :seeds),
  s AS (
    SELECT e2.src AS cand, (CASE e1.type WHEN 'about' THEN 2 * e1.weight * e2.weight ELSE 1 END) / {div} AS w
    FROM recent r
    JOIN edge e1 ON e1.src = r.id AND e1.type IN ('tagged','about','authored_by')
    {degjoin}
    JOIN edge e2 ON e2.dst = e1.dst AND e2.type = e1.type AND e2.src <> r.id
    UNION ALL SELECT e.dst, 3 FROM recent r JOIN edge e ON e.src = r.id AND e.type = 'links_to'
    UNION ALL SELECT e.src, 3 FROM recent r JOIN edge e ON e.dst = r.id AND e.type = 'links_to')
  SELECT s.cand, sum(w) FROM s JOIN bookmark b ON b.id = s.cand AND b.read_at IS NULL
  GROUP BY s.cand ORDER BY 2 DESC LIMIT 20"""
QUEUE_ALL = QUEUE.format(div='1', degjoin='')
QUEUE_D = QUEUE.format(div='ln(1 + d.n)', degjoin='JOIN deg d ON d.id = e1.dst AND d.type = e1.type AND d.n <= 200')
HOP = """SELECT id, type FROM (
    SELECT n.id, n.type, row_number() OVER (PARTITION BY n.node ORDER BY n.weight DESC) rn FROM (
      SELECT e.src AS node, e.dst AS id, e.type, e.weight FROM edge e WHERE e.src IN ({ph})
      UNION ALL SELECT e.dst, e.src, e.type, e.weight FROM edge e WHERE e.dst IN ({ph})) n)
  WHERE rn <= 50"""
def neighbourhood(root, depth=2, cap=200):
    # SQLite can't LIMIT per row inside a recursive CTE, so the app walks one hop per query.
    seen, frontier = {root}, [root]
    for _ in range(depth):
        ph = ','.join('?' * len(frontier))
        nxt = []
        for nid, _t in db.execute(HOP.format(ph=ph), frontier + frontier):
            if nid not in seen and len(seen) < cap:
                seen.add(nid); nxt.append(nid)
        frontier = nxt
        if not frontier: break
    return seen

def bench(label, fn, ids):
    fn(ids[0])  # warm
    ts = []
    for i in ids:
        t0 = time.perf_counter(); fn(i); ts.append((time.perf_counter() - t0) * 1000)
    ts.sort()
    p95 = ts[max(0, math.ceil(0.95 * len(ts)) - 1)]
    print(f"{label:<40} {statistics.median(ts):8.1f} {p95:8.1f} {ts[-1]:8.1f}")

random.seed(1)
bm = [random.randint(1, 10000) for _ in range(50)]
since = now - 7 * 86400
print(f"{'query':<40} {'p50_ms':>8} {'p95_ms':>8} {'max_ms':>8}")
bench('F1 neighbourhood d=2 (bookmark)', lambda r: neighbourhood(r), bm)
bench('F1 neighbourhood d=3 (bookmark)', lambda r: neighbourhood(r, 3), bm)
bench('F1 neighbourhood d=2 (hub tags)', lambda r: neighbourhood(r), [random.randint(20001, 20010) for _ in range(50)])
bench('C1 related', lambda r: db.execute(RELATED, {'r': r}).fetchall(), bm)
bench('C2 backlinks', lambda r: db.execute(BACKLINKS, (r,)).fetchall(), bm)
bench('B1 by_tag root (hierarchy)', lambda r: db.execute(BY_TAG, (r,)).fetchall(), [random.randint(20001, 20050) for _ in range(50)])
bench('D1 queue 7d, all seeds', lambda _: db.execute(QUEUE_ALL, {'since': since, 'seeds': 10**6}).fetchall(), [0] * 10)
bench('D1 queue 7d, 30 seeds', lambda _: db.execute(QUEUE_ALL, {'since': since, 'seeds': 30}).fetchall(), [0] * 20)
bench('D1 queue 7d, 30 seeds, skip hubs >200', lambda _: db.execute(QUEUE_D, {'since': since, 'seeds': 30}).fetchall(), [0] * 20)
print('recent reads (7d):', db.execute('SELECT count(*) FROM bookmark WHERE read_at > ?', (since,)).fetchone()[0])
# results for the cross-engine check (written to the current directory)
import json
json.dump({'queue_d': [r[0] for r in db.execute(QUEUE_D, {'since': since, 'seeds': 30}).fetchall()],
           'related_42': [r[0] for r in db.execute(RELATED, {'r': 42}).fetchall()],
           'by_tag_20003': [r[0] for r in db.execute(BY_TAG, (20003,)).fetchall()]}, open('sqlite_results.json', 'w'))
