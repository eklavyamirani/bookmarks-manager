"""Convert the CSVs from ../sqlite/export.sql into neo4j-admin bulk-import files.
Usage: python3 prepare_import.py <csv-dir> <out-dir>
Model: every entity is (:Entity:<Kind> {id}); bookmarks also carry created_at / read_at (epoch seconds);
every edge becomes a typed relationship (TAGGED, CHILD_OF, ON_DOMAIN, LINKS_TO, AUTHORED_BY, ABOUT) with a weight."""
import csv, os, sys
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
label = {'bookmark': 'Bookmark', 'tag': 'Tag', 'domain': 'Domain', 'url': 'Url', 'author': 'Author', 'topic': 'Topic'}
bm = {r[0]: r[1:] for r in csv.reader(open(os.path.join(src, 'bookmark.csv')))}
with open(os.path.join(out, 'nodes.csv'), 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow([':ID', 'id:long', ':LABEL', 'created_at:long', 'read_at:long'])
    for eid, kind in csv.reader(open(os.path.join(src, 'entity.csv'))):
        c, r = bm.get(eid, ('', ''))
        w.writerow([eid, eid, 'Entity;' + label[kind], c, r])
with open(os.path.join(out, 'rels.csv'), 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow([':START_ID', ':END_ID', ':TYPE', 'weight:float'])
    for s, d, t, wt in csv.reader(open(os.path.join(src, 'edge.csv'))):
        w.writerow([s, d, t.upper(), wt])
print('wrote', out)
