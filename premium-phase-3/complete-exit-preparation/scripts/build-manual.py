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
    for text in p['largeData'].get('texts',[100,200]):add('large-data',engine=engine,account=role,route=route,size=size,text=text)
for prior in json.loads((out/'prior-findings-ledger.json').read_text())['findings']:add('prior-id',finding=prior['id'],area=prior['area'],sourceReport=prior.get('sourceReport'),sourceLine=prior.get('sourceLine'))
for route in json.loads((out/'all-route-placeholder-inventory.json').read_text())['routes']:add('placeholder-route-access',routeTemplate=route['routeTemplate'],checks='Resolve authorized roles, fixture ID and actual loading boundary on exact candidate. Then create every required size/text/browser case for that admissible role-route pair.')
for finding in p.get('staticCandidateAudit',{}).get('extraCandidateFindings',[]):add('candidate-finding',finding=finding,checks='Exact-final-source reproduction and fresh closure; preserve original135-ID ledger separately.')
classification_file=out/'source-contract-classifications.json'
if classification_file.exists():
 classification=json.loads(classification_file.read_text())
 assert classification['sha']==p['sourcePreparedAgainst'],'Source-contract classifications must match the exact prepared source'
 ids=set(classification['caseIDs'])
 assert len(ids)==classification['count']==16
 for row in rows:
  if row['id'] in ids:
   assert row['stage']=='action-state' and row['surface']=='Notification mark read' and row['account'] in ['AUDIT-E','AUDIT-LEAD']
   row.update({'status':'not-applicable','evidence':[str(classification_file)],'note':'Exact combined-source Notifications page grants Mark read only to Manager/Owner; source-based exclusion, no runtime pass.','classificationBasis':'source-contract','sha':p['sourcePreparedAgainst']})
 assert len([row for row in rows if row['status']=='not-applicable'])==16
supplement_file=out/'management-action-supplement.json'
if supplement_file.exists():
 supplement=json.loads(supplement_file.read_text())
 assert supplement['sha']==p['sourcePreparedAgainst'] and supplement['count']==len(supplement['cases'])==16
 assert len(rows)==1546
 for row in supplement['cases']:
  assert row['stage']=='action-state-management-supplement' and row['account'] in ['AUDIT-M','QAOWNER'] and row['surface']=='Notification mark read'
  rows.append(row)
 assert len({row['id'] for row in rows})==1562
rules='Required Chromium320/390/landscape judgment and WebKit spots/reproductions remain. Full4480 core/5280 combined baseline retained. Explicit source-contract exclusions grant no runtime pass. Every other applicable case remains pending; errors or unmeasured required states cannot close as passed. Parent exact-source evidence may be linked only where dimensions and state match.'
(out/'manual-queue.json').write_text(json.dumps({'sha':p['sourcePreparedAgainst'],'status':'pending-resource-release','rules':rules,'cases':rows},indent=1))
from collections import Counter
print(json.dumps({'manualQueue':len(rows),'byStage':dict(Counter(r['stage'] for r in rows))}))
