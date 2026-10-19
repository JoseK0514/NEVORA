from pathlib import Path
from collections import Counter,defaultdict
import json
root=Path('/workspace/nevora-inspections/p4-desktop/round-5-8012d97/evidence')
cells=[]
for path in sorted(root.glob('checks-*.json')):
 for cell in json.loads(path.read_text()):cells.append({**cell,'artifact':path.name})
unique={(c['engine'],c['account'],c['size'],c['text'],c['route']):c for c in cells}
last=list(unique.values())
issues=defaultdict(list)
for c in last:
 for category in ['overflow','smallText','targets','errors','axe']:
  for value in c.get(category,[]):issues[(category,value)].append({'engine':c['engine'],'account':c['account'],'size':c['size'],'text':c['text'],'route':c['route'],'artifact':c['artifact']})
 if c['text']==100 and c.get('cls',0)>.01:issues[('cls',str(c['cls']))].append({k:c[k] for k in ['engine','account','size','text','route','artifact']})
summary={'rawCells':len(cells),'uniqueCells':len(last),'rawPassed':sum(c['ok'] for c in last),'rawFailed':sum(not c['ok'] for c in last),'byEngine':dict(Counter(c['engine'] for c in last)),'byAccount':dict(Counter(c['account'] for c in last)),'byWidth':dict(Counter(c['size'] for c in last)),'byText':dict(Counter(c['text'] for c in last)),'observations':[{'category':key[0],'value':key[1],'count':len(value),'cells':value} for key,value in issues.items()]}
(root/'checker-summary.json').write_text(json.dumps(summary,indent=2))
print(json.dumps({k:v for k,v in summary.items() if k!='observations'},indent=2))
for issue in summary['observations']:print(issue['category'],issue['count'],issue['value'][:220])
