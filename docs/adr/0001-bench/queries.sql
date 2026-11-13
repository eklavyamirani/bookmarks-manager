SET search_path = kg;
SET client_min_messages = warning;

-- FR-F1 neighbourhood: undirected, per-hop fanout cap, total cap (FR-F6)
CREATE OR REPLACE FUNCTION neighbourhood(root bigint, max_depth int DEFAULT 2, fanout int DEFAULT 50, max_nodes int DEFAULT 200)
RETURNS TABLE(id bigint, depth int, via bigint, type edge_type) LANGUAGE sql STABLE AS $$
  WITH RECURSIVE nb(id, depth, via, type) AS (
    SELECT root, 0, NULL::bigint, NULL::edge_type
    UNION ALL
    SELECT n.id, nb.depth + 1, nb.id, n.type
    FROM nb CROSS JOIN LATERAL (
      SELECT * FROM (
        SELECT e.dst AS id, e.type, e.weight FROM edge e WHERE e.src = nb.id
        UNION ALL
        SELECT e.src, e.type, e.weight FROM edge e WHERE e.dst = nb.id) x
      ORDER BY x.weight DESC LIMIT fanout) n
    WHERE nb.depth < max_depth)
  SELECT * FROM (SELECT DISTINCT ON (id) * FROM nb ORDER BY id, depth) d
  ORDER BY depth LIMIT max_nodes
$$;

-- FR-C1 related bookmarks with reasons
CREATE OR REPLACE FUNCTION related(root bigint, k int DEFAULT 20)
RETURNS TABLE(other bigint, score real, reasons text[]) LANGUAGE sql STABLE AS $$
  SELECT other, sum(w)::real, array_agg(DISTINCT reason) FROM (
    SELECT e2.src AS other, e1.type::text AS reason,
           CASE e1.type WHEN 'about' THEN 2 * e1.weight * e2.weight
                        WHEN 'tagged' THEN 1 WHEN 'authored_by' THEN 1
                        WHEN 'links_to' THEN 0.3 WHEN 'on_domain' THEN 0.1 END AS w
    FROM edge e1
    JOIN edge e2 ON e2.dst = e1.dst AND e2.type = e1.type AND e2.src <> e1.src
    WHERE e1.src = root AND e1.type IN ('tagged','about','authored_by','links_to','on_domain')
    UNION ALL
    SELECT e.dst, 'links_to', 3 FROM edge e JOIN bookmark b ON b.id = e.dst
    WHERE e.src = root AND e.type = 'links_to'
    UNION ALL
    SELECT e.src, 'linked_from', 3 FROM edge e WHERE e.dst = root AND e.type = 'links_to'
  ) s GROUP BY other ORDER BY 2 DESC LIMIT k
$$;

-- FR-C2 backlinks
CREATE OR REPLACE FUNCTION backlinks(root bigint, k int DEFAULT 50)
RETURNS SETOF bookmark LANGUAGE sql STABLE AS $$
  SELECT b.* FROM edge e JOIN bookmark b ON b.id = e.src
  WHERE e.dst = root AND e.type = 'links_to' ORDER BY b.created_at DESC LIMIT k
$$;

-- FR-B1 filter by tag incl. descendants, paginated
CREATE OR REPLACE FUNCTION by_tag(tag bigint, k int DEFAULT 50)
RETURNS SETOF bookmark LANGUAGE sql STABLE AS $$
  WITH RECURSIVE t(id) AS (
    SELECT tag UNION SELECT e.src FROM edge e JOIN t ON e.dst = t.id WHERE e.type = 'child_of')
  SELECT b.* FROM bookmark b
  WHERE EXISTS (SELECT 1 FROM edge e JOIN t ON t.id = e.dst WHERE e.src = b.id AND e.type = 'tagged')
  ORDER BY b.created_at DESC LIMIT k
$$;

-- FR-D1 finish-the-thread queue: unread ranked by closeness to recently read
CREATE OR REPLACE FUNCTION thread_queue(window_days int DEFAULT 7, max_seeds int DEFAULT 1000000, k int DEFAULT 20)
RETURNS TABLE(id bigint, score real) LANGUAGE sql STABLE AS $$
  WITH recent AS (
    SELECT id FROM bookmark WHERE read_at > now() - make_interval(days => window_days)
    ORDER BY read_at DESC LIMIT max_seeds),
  s AS (
    SELECT e2.src AS cand, CASE e1.type WHEN 'about' THEN 2 * e1.weight * e2.weight ELSE 1 END AS w
    FROM recent r
    JOIN edge e1 ON e1.src = r.id AND e1.type IN ('tagged','about','authored_by')
    JOIN edge e2 ON e2.dst = e1.dst AND e2.type = e1.type AND e2.src <> r.id
    UNION ALL
    SELECT e.dst, 3 FROM recent r JOIN edge e ON e.src = r.id AND e.type = 'links_to'
    UNION ALL
    SELECT e.src, 3 FROM recent r JOIN edge e ON e.dst = r.id AND e.type = 'links_to')
  SELECT s.cand, sum(w)::real FROM s JOIN bookmark b ON b.id = s.cand AND b.read_at IS NULL
  GROUP BY s.cand ORDER BY 2 DESC LIMIT k
$$;

-- FR-C3 path (P2): BFS in plpgsql with a visited set, max depth
CREATE OR REPLACE FUNCTION path(a bigint, b bigint, max_depth int DEFAULT 4)
RETURNS bigint[] LANGUAGE plpgsql AS $$
DECLARE d int := 0; found bool := false; p bigint[]; cur bigint;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS v(id bigint PRIMARY KEY, parent bigint, depth int) ON COMMIT DROP;
  TRUNCATE v; INSERT INTO v VALUES (a, NULL, 0);
  WHILE d < max_depth AND NOT found LOOP
    INSERT INTO v
      SELECT DISTINCT ON (n.id) n.id, n.parent, d + 1 FROM (
        SELECT e.dst AS id, e.src AS parent FROM v JOIN edge e ON e.src = v.id WHERE v.depth = d
        UNION ALL
        SELECT e.src, e.dst FROM v JOIN edge e ON e.dst = v.id WHERE v.depth = d) n
      ORDER BY n.id
    ON CONFLICT DO NOTHING;
    found := EXISTS (SELECT 1 FROM v WHERE id = b);
    d := d + 1;
  END LOOP;
  IF NOT found THEN RETURN NULL; END IF;
  cur := b;
  WHILE cur IS NOT NULL LOOP p := cur || p; SELECT parent INTO cur FROM v WHERE id = cur; END LOOP;
  RETURN p;
END $$;

-- harness: run `q` n times with $1 = random id in [lo, hi], return ms percentiles
CREATE OR REPLACE FUNCTION bench(label text, q text, lo int, hi int, n int DEFAULT 50)
RETURNS TABLE(query text, p50_ms numeric, p95_ms numeric, max_ms numeric) LANGUAGE plpgsql AS $$
DECLARE t0 timestamptz; ts float8[] := '{}'; i int;
BEGIN
  EXECUTE q USING lo;  -- warm
  FOR i IN 1..n LOOP
    t0 := clock_timestamp();
    EXECUTE q USING (lo + floor(random() * (hi - lo + 1)))::bigint;
    ts := ts || extract(epoch FROM clock_timestamp() - t0) * 1000;
  END LOOP;
  RETURN QUERY SELECT label,
    round(percentile_cont(0.5) WITHIN GROUP (ORDER BY x)::numeric, 1),
    round(percentile_cont(0.95) WITHIN GROUP (ORDER BY x)::numeric, 1),
    round(max(x)::numeric, 1) FROM unnest(ts) x;
END $$;
