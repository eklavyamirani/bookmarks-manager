-- Synthetic knowledge graph at NFR-4 scale (10k bookmarks), skewed so hubs exist.
DROP SCHEMA IF EXISTS kg CASCADE; CREATE SCHEMA kg; SET search_path = kg;
SELECT setseed(0.42);

CREATE TYPE entity_kind AS ENUM ('bookmark','tag','domain','url','author','topic');
CREATE TYPE edge_type   AS ENUM ('tagged','child_of','on_domain','links_to','authored_by','about');

CREATE TABLE entity (id bigint PRIMARY KEY, kind entity_kind NOT NULL, name text NOT NULL);
CREATE TABLE bookmark (
  id bigint PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE,
  url text NOT NULL, title text, created_at timestamptz NOT NULL, read_at timestamptz);
CREATE TABLE edge (
  src bigint NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  dst bigint NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  type edge_type NOT NULL,
  weight real NOT NULL DEFAULT 1,
  PRIMARY KEY (src, type, dst));
CREATE INDEX edge_dst ON edge (dst, type, src);

-- id ranges per kind
--  bookmarks 1..10000, tags 20001..22000, domains 30001..33000,
--  urls 40001..90000, authors 100001..100500, topics 110001..110300
INSERT INTO entity SELECT g, 'bookmark', 'b'||g FROM generate_series(1,10000) g;
INSERT INTO entity SELECT g, 'tag',      't'||g FROM generate_series(20001,22000) g;
INSERT INTO entity SELECT g, 'domain',   'd'||g FROM generate_series(30001,33000) g;
INSERT INTO entity SELECT g, 'url',      'u'||g FROM generate_series(40001,90000) g;
INSERT INTO entity SELECT g, 'author',   'a'||g FROM generate_series(100001,100500) g;
INSERT INTO entity SELECT g, 'topic',    'p'||g FROM generate_series(110001,110300) g;

INSERT INTO bookmark
SELECT g, 'https://x/'||g, 'title '||g,
       now() - (random()*730 || ' days')::interval,
       CASE WHEN random() < 0.4 THEN now() - (random()*60 || ' days')::interval END
FROM generate_series(1,10000) g;

-- skew helper: floor(n * random()^k) concentrates on low ids => hubs
-- ~3 tags per bookmark
INSERT INTO edge SELECT b, 20001 + floor(2000*random()^3)::int, 'tagged'
FROM generate_series(1,10000) b, generate_series(1,3) ON CONFLICT DO NOTHING;
-- tag hierarchy: each tag (except first 50 roots) has a parent with lower id
INSERT INTO edge SELECT t, 20001 + floor((t-20001)*random())::int, 'child_of'
FROM generate_series(20051,22000) t;
-- 1 domain per bookmark, heavy skew (github.com-style hubs)
INSERT INTO edge SELECT b, 30001 + floor(3000*random()^4)::int, 'on_domain'
FROM generate_series(1,10000) b;
-- ~15 outbound links per bookmark: 20% to saved bookmarks, rest to url entities
INSERT INTO edge
SELECT b, CASE WHEN random() < 0.2 THEN 1 + floor(10000*random()^2)::int
               ELSE 40001 + floor(50000*random()^2)::int END, 'links_to'
FROM generate_series(1,10000) b, generate_series(1,15)
ON CONFLICT DO NOTHING;
DELETE FROM edge WHERE src = dst;
-- author on half the bookmarks
INSERT INTO edge SELECT b, 100001 + floor(500*random()^2)::int, 'authored_by'
FROM generate_series(1,10000) b WHERE random() < 0.5;
-- ~3 topics per bookmark with relevance score
INSERT INTO edge SELECT b, 110001 + floor(300*random()^2)::int, 'about', random()
FROM generate_series(1,10000) b, generate_series(1,3) ON CONFLICT DO NOTHING;

VACUUM ANALYZE;
SELECT type, count(*) FROM edge GROUP BY 1 ORDER BY 1;
SELECT 'max in-degree', type, max(c) FROM (SELECT dst, type, count(*) c FROM edge GROUP BY 1,2) s GROUP BY 2 ORDER BY 2;
