"""Query-shape variants for the two queries where SQLite lagged Postgres. Usage: python3 bench_sqlite_rewrites.py <csv-dir>"""
import runpy, sys, time, statistics, math, random
ns = runpy.run_path(__file__.replace('_rewrites', ''), run_name='lib')  # loads data and prints the base run
db, bench, now = ns['db'], ns['bench'], ns['now']
BY_TAG_IN = """WITH RECURSIVE t(id) AS (SELECT ? UNION SELECT e.src FROM edge e JOIN t ON e.dst = t.id WHERE e.type = 'child_of')
  SELECT b.* FROM bookmark b WHERE b.id IN (SELECT e.src FROM edge e JOIN t ON e.dst = t.id WHERE e.type = 'tagged')
  ORDER BY b.created_at DESC LIMIT 50"""
QUEUE_D_MAT = """WITH recent AS MATERIALIZED (SELECT id FROM bookmark WHERE read_at > :since ORDER BY read_at DESC LIMIT :seeds),
  hop1 AS MATERIALIZED (SELECT r.id AS seed, e1.dst, e1.type, e1.weight, d.n FROM recent r
     JOIN edge e1 ON e1.src = r.id AND e1.type IN ('tagged','about','authored_by')
     JOIN deg d ON d.id = e1.dst AND d.type = e1.type WHERE d.n <= 200),
  s AS (
    SELECT e2.src AS cand, (CASE h.type WHEN 'about' THEN 2 * h.weight * e2.weight ELSE 1 END) / ln(1 + h.n) AS w
    FROM hop1 h JOIN edge e2 ON e2.dst = h.dst AND e2.type = h.type AND e2.src <> h.seed
    UNION ALL SELECT e.dst, 3 FROM recent r JOIN edge e ON e.src = r.id AND e.type = 'links_to'
    UNION ALL SELECT e.src, 3 FROM recent r JOIN edge e ON e.dst = r.id AND e.type = 'links_to')
  SELECT s.cand, sum(w) FROM s JOIN bookmark b ON b.id = s.cand AND b.read_at IS NULL
  GROUP BY s.cand ORDER BY 2 DESC LIMIT 20"""
random.seed(2)
since = now - 7 * 86400
print('--- rewrites ---')
bench('B1 by_tag, IN instead of EXISTS', lambda r: db.execute(BY_TAG_IN, (r,)).fetchall(), [random.randint(20001, 20050) for _ in range(50)])
bench('D1 queue 30 seeds skip hubs, MATERIALIZED', lambda _: db.execute(QUEUE_D_MAT, {'since': since, 'seeds': 30}).fetchall(), [0] * 20)
# same answers?
a = db.execute(ns['BY_TAG'], (20003,)).fetchall(); b = db.execute(BY_TAG_IN, (20003,)).fetchall()
q1 = db.execute(ns['QUEUE_D'], {'since': since, 'seeds': 30}).fetchall(); q2 = db.execute(QUEUE_D_MAT, {'since': since, 'seeds': 30}).fetchall()
print('by_tag same result:', a == b, '| queue same ids:', [r[0] for r in q1] == [r[0] for r in q2])
