-- Export the Postgres synthetic graph (after schema_seed.sql) so SQLite runs on identical data.
SET search_path = kg;
\copy (SELECT id, kind FROM entity) TO 'entity.csv' CSV
\copy (SELECT id, extract(epoch FROM created_at)::bigint, extract(epoch FROM read_at)::bigint FROM bookmark) TO 'bookmark.csv' CSV
\copy (SELECT src, dst, type, weight FROM edge) TO 'edge.csv' CSV
