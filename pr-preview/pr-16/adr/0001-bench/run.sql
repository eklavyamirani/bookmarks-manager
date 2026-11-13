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
UNION ALL SELECT * FROM bench('C3 path d<=4', 'SELECT path($1, ($1 * 7919) % 10000 + 1)', 1, 10000, 20);
