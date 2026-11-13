-- psql -f schema_seed.sql -f queries.sql -f run.sql
SET search_path = kg;
SET client_min_messages = warning;
SELECT count(*) AS recent_reads_7d FROM bookmark WHERE read_at > now() - interval '7 days';
SELECT * FROM bench('F1 neighbourhood d=2 (bookmark)', 'SELECT count(*) FROM neighbourhood($1)', 1, 10000)
UNION ALL SELECT * FROM bench('F1 neighbourhood d=3 (bookmark)', 'SELECT count(*) FROM neighbourhood($1, 3)', 1, 10000)
UNION ALL SELECT * FROM bench('F1 neighbourhood d=2 (hub tags)', 'SELECT count(*) FROM neighbourhood($1)', 20001, 20010)
UNION ALL SELECT * FROM bench('C1 related', 'SELECT count(*) FROM related($1)', 1, 10000)
UNION ALL SELECT * FROM bench('C2 backlinks', 'SELECT count(*) FROM backlinks($1)', 1, 10000)
UNION ALL SELECT * FROM bench('B1 by_tag root (hierarchy)', 'SELECT count(*) FROM by_tag($1)', 20001, 20050)
UNION ALL SELECT * FROM bench('D1 queue 7d, all seeds', 'SELECT count(*) FROM thread_queue(7) WHERE $1 > 0', 1, 1, 10)
UNION ALL SELECT * FROM bench('D1 queue 7d, 30 seeds', 'SELECT count(*) FROM thread_queue(7, 30) WHERE $1 > 0', 1, 1, 20)
UNION ALL SELECT * FROM bench('D1 queue 7d, all seeds, skip hubs >200', 'SELECT count(*) FROM thread_queue_hubcap(7, 1000000, 200) WHERE $1 > 0', 1, 1, 10)
UNION ALL SELECT * FROM bench('D1 queue 7d, 30 seeds, skip hubs >200', 'SELECT count(*) FROM thread_queue_hubcap(7, 30, 200) WHERE $1 > 0', 1, 1, 20)
UNION ALL SELECT * FROM bench('C3 path d<=4', 'SELECT path($1, ($1 * 7919) % 10000 + 1)', 1, 10000, 20);

-- Queue fan-out by step (all seeds vs 30 most recent)
WITH seeds AS (SELECT id, rank() OVER (ORDER BY read_at DESC) r FROM bookmark WHERE read_at > now() - interval '7 days'),
hop1 AS (SELECT s.r, e1.* FROM seeds s JOIN edge e1 ON e1.src = s.id AND e1.type IN ('tagged','about','authored_by')),
hop2 AS (SELECT h.r, e2.src cand FROM hop1 h JOIN edge e2 ON e2.dst = h.dst AND e2.type = h.type AND e2.src <> h.src)
SELECT 'seeds' step, count(*) all_seeds, count(*) FILTER (WHERE r <= 30) first_30 FROM seeds
UNION ALL SELECT 'hop 1', count(*), count(*) FILTER (WHERE r <= 30) FROM hop1
UNION ALL SELECT 'hop 2 rows', count(*), count(*) FILTER (WHERE r <= 30) FROM hop2
UNION ALL SELECT 'distinct candidates', count(DISTINCT cand), count(DISTINCT cand) FILTER (WHERE r <= 30) FROM hop2;
