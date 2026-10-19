import json,hashlib
from pathlib import Path
out=Path('/workspace/nevora-inspections/premium-phase-3/complete-exit-preparation'); p=json.loads((out/'full-exit-joblist.json').read_text()); rows=[]
def add(stage,**data):
 raw={'stage':stage,**data}; k=hashlib.sha256(json.dumps(raw,sort_keys=True).encode()).hexdigest()[:20]; rows.append({'id':stage+'-'+k,**raw,'status':'pending','evidence':[]})
for case in p['readStateSweeps']['cases']:add('read-state',**case)
for case in p['actionStateSweeps']['cases']:add('action-state',**case)
for case in p['fontSwap']['cases']:add('font-swap',**case)
for engine in p['engines']:
 for role in p['shell']['accounts']:
  for size in p['sizes']:
   for text in p['texts']:
    for motion in p['shell']['reducedMotion']:add('shell',engine=engine,account=role,size=size,text=text,motion=motion,checks=p['shell']['checks'])
 for role in p['largeData']['accounts']:
  for route in p['largeData']['routes']:
   for size in p['sizes']:
    for text in [100,200]:add('large-data',engine=engine,account=role,route=route,size=size,text=text)
for prior in json.loads((out/'prior-findings-ledger.json').read_text())['findings']:add('prior-id',finding=prior['id'],area=prior['area'],sourceReport=prior.get('sourceReport'),sourceLine=prior.get('sourceLine'))
for route in json.loads((out/'all-route-placeholder-inventory.json').read_text())['routes']:add('placeholder-route-access',routeTemplate=route['routeTemplate'],checks='Resolve authorized roles, fixture ID and actual loading boundary on exact candidate. Then create every required size/text/browser case for that admissible role-route pair.')
(out/'manual-queue.json').write_text(json.dumps({'sha':p['sourcePreparedAgainst'],'status':'pending-resource-release','rules':'Every case is pending. Chromium320/390/landscape judgment and WebKit spots/reproduction cases follow the brief. Full4480-cell baseline retained. A record with errors or an unmeasured state cannot close as passed. Parent independent exact-candidate evidence may be linked where case dimensions and state match.','cases':rows},indent=1))
from collections import Counter
print(json.dumps({'manualQueue':len(rows),'byStage':dict(Counter(r['stage'] for r in rows))}))
