"""Compare top results across engines. Usage: python3 crosscheck.py <pg.json> <sqlite.json> <neo4j.json>"""
import json, sys
pg, sl, nj = (json.load(open(p)) for p in sys.argv[1:4])
for k in pg:
    a, b, c = pg[k], sl[k], nj[k]
    print(f"{k:<14} n={len(a):>2}  pg∩sqlite={len(set(a) & set(b)):>2}  pg∩neo4j={len(set(a) & set(c)):>2}  same order pg/sqlite={a == b} pg/neo4j={a == c}")
