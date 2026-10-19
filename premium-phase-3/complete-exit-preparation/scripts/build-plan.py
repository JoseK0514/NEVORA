from pathlib import Path
import re,json,hashlib
root=Path('/workspace/inspect-phase3-final')
out=Path('/workspace/nevora-inspections/premium-phase-3/complete-exit-preparation')
sha='8640247be632ee6382c68b3b1ae3bbed532a5d65'
roles=['AUDIT-E','AUDIT-LONG','AUDIT-ON','AUDIT-BREAK','payroll-qa-a','AUDIT-LEAD','payroll-qa-b']
sizes=['320','360','390','430','844x390']; texts=[100,125,150,200]; engines=['chromium','webkit']
areas={'type-colour-copy.md':('TC-P3',range(1,35)),'alignment.md':('AL-P3',range(1,32)),'stability.md':('P3-ST',range(1,27)),'widths-roles-consistency.md':('P3-WR',range(1,19)),'interaction-states.md':('IS',range(64,83))}
ledger=[]
for file,(prefix,numbers) in areas.items():
 text=(root/'docs/product/specs/premium-phase-3/inspection'/file).read_text()
 for n in numbers:
  id=f'{prefix}-{n:02}' if prefix!='IS' else f'{prefix}-{n}'
  rows=[(i+1,s) for i,s in enumerate(text.splitlines()) if s.startswith('|') and re.match(re.escape(id)+r'(?!\d)(?:\b|$)',s.split('|')[1].replace('**','').replace('`','').strip())]
  ref=rows[-1] if rows else None
  ledger.append({'id':id,'area':file,'sourceReport':str(root/'docs/product/specs/premium-phase-3/inspection'/file),'sourceLine':ref[0] if ref else None,'lastPriorTableRow':ref[1] if ref else None,'status':'pending-final-source-measurement','evidence':[]})
for id,area,alias in [('IS-P3-01','interaction-states.md','IS-74 Availability surface'),('IS-P3-02','interaction-states.md',None),('IS-P3-03','interaction-states.md',None),('ST-P3-24','stability.md','distinct from P3-ST-24 loading-band finding'),('ST-RC-CALENDAR-01','stability.md',None),('ST-RC-ACK-01','stability.md',None),('ST-RC-CORRECTION-01','stability.md',None)]:
 ledger.append({'id':id,'area':area,'aliasOrDistinction':alias,'status':'pending-final-source-measurement','evidence':[]})
for row in ledger:
 if row['id']=='IS-76':row['aliasOrDistinction']='Authoritative ROUND maps IS76 to P3-ST14; separate candidate auth regression IS-RC-UPDATES-AUTH-01 does not redefine it.'
(out/'prior-findings-ledger.json').write_text(json.dumps({'source':sha,'count':len(ledger),'rules':'Source inspection only. A candidate fix or source-only proof cannot close an owner finding. Every ID needs final-source measured evidence, or remains a gap/open. Payroll wording is suggestions, excluded from defect counts.','findings':ledger},indent=2))
route_pages=sorted(str(p.relative_to(root/'src/app/app')).removesuffix('/page.tsx') for p in (root/'src/app/app').rglob('page.tsx'))
route_pages=['/app' if p=='page.tsx' else '/app/'+p for p in route_pages]
(out/'all-route-placeholder-inventory.json').write_text(json.dumps({'source':sha,'count':len(route_pages),'rules':'Shared placeholder ownership covers the entire app route inventory. Resolve bracket IDs from the owned fixture, evaluate actual authorized roles and classify the actual loading boundary before running; no route silently disappears because a sibling chat owns its ready state. Shell-only inspection of other owners; do not refind their ready-state content.','routes':[{'routeTemplate':p,'roleAssignments':'pending-final-source-route-access-catalog','fixtureRoute':'pending' if '[' in p else p,'loadingBoundary':'pending-observation','status':'pending'} for p in route_pages]},indent=2))
read_families=[
 {'name':'Home','route':'/app','read':'GET /api/employee/home','states':['loading','ready','empty-own-schedule','partial','offline','paused','503-read','401','403','expired','return-and-retry']},
 {'name':'My time','route':'/app/my-time','read':'GET /api/employee/my-time','states':['loading','ready','empty','offline','paused','503-read','401','403','expired','return-and-retry']},
 {'name':'Timecards','route':'/app/timecards','read':'POST /api/timecards (READ ONLY)','states':['loading','ready','empty','offline','paused','503-read','401','403','expired','return-and-retry']},
 {'name':'Profile work details','route':'/app/profile','read':'GET /api/employee/profile','states':['loading','ready','offline','paused','503-read','401','403','expired','return-and-retry']},
 {'name':'Calendar disclosure','route':'/app/profile#employee-calendar-title','read':'GET /api/employee/calendar-subscriptions','states':['loading','ready-none','ready-active','offline','paused','503-read','401','403','return-and-retry']},
 {'name':'Updates','route':'/app/updates','read':'GET /api/employee/communications','states':['loading','ready','empty','partial-if-contract-supported','offline','paused','503-read','401','403','expired','return-and-retry']},
 {'name':'My pay','route':'/app/my-pay','read':'GET /api/payroll/statements','states':['loading','ready','empty','offline','paused','503-read','401','403','return-and-retry']},
 {'name':'Notifications','route':'/app/notifications','read':'GET /api/employee/notifications','states':['loading','ready','empty','partial','offline','paused','503-read','401','403','expired','return-and-retry']},
]
actions=[
 {'name':'Time off full day','route':'/app/requests?tab=new','transport':'Next action'},
 {'name':'Time off partial day','route':'/app/requests?tab=new','transport':'Next action'},
 {'name':'Availability normal','route':'/app/availability','transport':'Next action'},
 {'name':'Availability specific week','route':'/app/availability?week=<fixtureNextWeek>','transport':'Next action'},
 {'name':'Withdraw time off','route':'/app/requests?tab=my','transport':'Next action'},
 {'name':'Missing-time correction','route':'/app/my-time','transport':'POST /api/employee/time-corrections'},
 {'name':'Entry-boundary correction','route':'/app/my-time','transport':'POST /api/employee/time-corrections'},
 {'name':'Break-boundary correction','route':'/app/my-time','transport':'POST /api/employee/time-corrections'},
 {'name':'Calendar issue','route':'/app/profile#employee-calendar-title','transport':'POST /api/employee/calendar-subscriptions'},
 {'name':'Calendar rotate','route':'/app/profile#employee-calendar-title','transport':'POST /api/employee/calendar-subscriptions'},
 {'name':'Calendar revoke','route':'/app/profile#employee-calendar-title','transport':'POST /api/employee/calendar-subscriptions'},
 {'name':'Updates acknowledge','route':'/app/updates/<fixtureUpdateId>','transport':'POST /api/employee/communications'},
 {'name':'Notification mark read','route':'/app/notifications','transport':'POST /api/notifications/read'},
 {'name':'Swap','route':'/app/exchange/swap?sourceShiftId=<fixtureShiftId>','transport':'Next action'},
 {'name':'Unable to work','route':'/app/exchange/callout?sourceShiftId=<fixtureShiftId>','transport':'Next action'},
]
plan={'sourcePreparedAgainst':sha,'sourceReleasedForExecution':None,'status':'standby-no-preview-no-browser','roles':roles,'sizes':sizes,'texts':texts,'engines':engines,'baseline':{'cells':4480,'executor':'scripts/serial-baseline.mjs','unchangedSourceChecker':str(root/'scripts/ui-checks/checks.mjs'),'axeRequired':True,'historicalSmokeCells':15,'historicalSmokeCellsHaveAxe':False,'remainingCompleteAxeCellsOn227150b':4480,'remainingOnFinalCandidate':4480},'geometry':{'cells':4480,'method':'Reuse ready page, resize/text one pair at a time; preserve per-cell geometry and line ranges; assess measured differences with viewport crops. Original checker still runs separately unchanged.'},'shell':{'accounts':['AUDIT-E','AUDIT-LEAD','AUDIT-M','QAOWNER'],'reducedMotion':['no-preference','reduce'],'cells':320,'checks':['header/tab-bar/section-tabs geometry','More open/focus/Tab exit/Escape/focus return','sticky Close at maximum scroll','all targets and accessible names','selected tab ownership','focus-follow edge rings','safe areas and keyboard reduced viewport']},'sharedPlaceholders':{'routeInventory':'all-route-placeholder-inventory.json','employeeLeadRouteCells':4480,'otherRolesCount':'resolve each actual authorized route from route inventory on final source; every shared boundary and every route represented','checks':['direct-load and client-navigation loading frames','placeholder band vs ready band','first visible block vs first ready card','text-step and landscape bands','root-placeholder destination shape','no section tabs on focused review','reduced-motion animation','CLS and raw geometry both required']},'largeData':{'separatePreviewRequired':True,'accounts':['AUDIT-M','QAOWNER'],'routes':['/app','/app/inbox','/app/schedule','/app/employees'],'sizes':sizes,'texts':[100,200],'engines':engines,'cells':160,'checks':['placeholders','bands','first card edges','loading to ready CLS','text wraps','50 shifts/day and 200 fictional people visible for the intended location']},'readStateSweeps':{'families':read_families,'accounts':roles,'sizes':['320','390','844x390'],'texts':[100,200],'engines':engines,'sequences':588,'maximumStateObservations':sum(len(x['states']) for x in read_families)*7*3*2*2,'method':'All seven role/state fixtures, every named state where its exact response contract supports it; browser-only interception, fresh context for denied cases. 360/430 and125/150 remain full automated/geometry cells, plus expand a state immediately where a measured defect depends on them. Unsupported model states require source/contract rationale, not a silently passed case.'},'actionStateSweeps':{'surfaces':actions,'roles':['Employee','Lead'],'sizes':['320','390','844x390'],'texts':[100,200],'engines':engines,'surfaceConfigurations':360,'steps':['before','pending held at least3s','second activation sends exactly1 command','pending focus and geometry','failure with draft intact','same-operation retry','second failure reveal and focus','401 signed-out recovery','403 access-changed recovery','offline/resume','success or decided from a valid browser-only response','Escape/focus-return if a dialog or disclosure applies'],'method':'No browser mutation reaches the server. Resolve exact fixture IDs and valid current command payloads on final source. Native action response simulation must be a valid RSC envelope; no arbitrary object should count as a success. If protocol cannot be simulated, report that unmeasured state as a gap and keep exit incomplete.'},'fontSwap':{'routes':['/app','/app/schedule','/app/requests/hub','/app/availability','/app/my-time','/app/profile'],'accounts':['AUDIT-E','AUDIT-LEAD'],'sizes':['320','390','844x390'],'texts':[100,200],'engines':engines,'cells':144,'method':'Hold actual Inter response in browser; compare fallback and loaded boxes and CLS; cold normal load as control.'},'fiveAreaJudgments':{'areaReports':['alignment.md','stability.md','type-colour-copy.md','interaction-states.md','widths-roles.md'],'priorFindingCount':len(ledger),'checks':'Every ID in prior-findings-ledger.json receives final-source measured fixed/not-fixed/partly-fixed status; every listed area gets checked-and-correct numeric examples and unresolved gaps. No zero with incomplete matrix or unobserved required state.','visualJudgment':'Chromium at320/390/landscape, all ready routes and relevant long-name/clock/pay fixture states at100/200;125/150 inspect all recorded line-split/clip/geometry flags and prior reproduction cells; WebKit spot checks plus every earlier engine-specific case.'},'executionOrder':['root completes candidate full gates','root releases exact frozen candidate SHA after final gates','freeze clean detached source and record source/runtime/fixture hashes','own one normal preview and seed/login fictional accounts','run unchanged checks.mjs full matrix serially','geometry + five-area visual judgment + prior IDs','read/action/shell/font/placeholder cases serially','close normal preview with verified PG and source audit','start separate owned large-data preview, --large fixture only','run320large-data cells and shared-boundary cases','close owned processes, audit source cleanliness, finish five reports and summary']}
# Required judgment follows the brief, without a second full route traversal.
plan['geometry']={'method':'External passive Page.close preload, after each unchanged checker cell has computed/pushed its result. No new page visits, no changed checker/timers/conditions. Detailed policy in scripts/collection-policy.mjs. Chromium320/390/landscape for Employee/Lead and relevant fixture variants; WebKit390spots plus every named earlier width/browser reproduction. Follow up other baseline failures only when a concrete concern requires it.','duplicateFullSweepVisits':0,'passiveJudgmentCells':776,'diagnosticExecutor':'scripts/serial-geometry.mjs requires explicit GEO_ROUTES; it is targeted-only, not another full sweep'}
readcases=[]
for family in read_families:
 accounts=roles+(['AUDIT-M','QAOWNER'] if family['name']=='Notifications' else [])
 for account in accounts:
  for size in ['320','390','844x390']:
   for text in [100,200]:readcases.append({'engine':'chromium','account':account,'size':size,'text':text,'family':family['name'],'route':family['route'],'states':family['states']})
 for account in ['AUDIT-E','AUDIT-LEAD']+(['AUDIT-M','QAOWNER'] if family['name']=='Notifications' else []):
  for text in [100,200]:readcases.append({'engine':'webkit','account':account,'size':'390','text':text,'family':family['name'],'route':family['route'],'states':family['states']})
plan['readStateSweeps']['cases']=readcases
plan['readStateSweeps']['sequences']=len(readcases)
plan['readStateSweeps']['maximumStateObservations']=sum(len(c['states']) for c in readcases)
plan['readStateSweeps']['engineScope']='Chromium at320/390/landscape; WebKit390spots plus all earlier engine-specific reproduction cells and independent exact-candidate proofs. No automatic all-engine manual-state crossproduct.'
actioncases=[]
for action in actions:
 for account in ['AUDIT-E','AUDIT-LEAD']:
  for size in ['320','390','844x390']:
   for text in [100,200]:actioncases.append({'engine':'chromium','account':account,'size':size,'text':text,'surface':action['name'],'route':action['route'],'steps':plan['actionStateSweeps']['steps']})
  for text in [100,200]:actioncases.append({'engine':'webkit','account':account,'size':'390','text':text,'surface':action['name'],'route':action['route'],'steps':plan['actionStateSweeps']['steps']})
plan['actionStateSweeps']['cases']=actioncases
plan['actionStateSweeps']['surfaceConfigurations']=len(actioncases)
plan['actionStateSweeps']['engineScope']='Chromium320/390/landscape; WebKit390spots plus earlier engine-specific reproductions. Broaden only where recorded concerns or prior IDs require it.'
fontcases=[]
for account in ['AUDIT-E','AUDIT-LEAD']:
 for route in plan['fontSwap']['routes']:
  for size in ['320','390','844x390']:
   for text in [100,200]:fontcases.append({'engine':'chromium','account':account,'route':route,'size':size,'text':text})
  for text in [100,200]:fontcases.append({'engine':'webkit','account':account,'route':route,'size':'390','text':text})
for route in plan['fontSwap']['routes']:fontcases.append({'engine':'webkit','account':'AUDIT-E','route':route,'size':'320','text':100})
plan['fontSwap']['cases']=fontcases
plan['fontSwap']['cells']=len(fontcases)
plan['fontSwap']['engineScope']='Chromium320/390/landscape, WebKit390spots and320 prior-fallback reproduction routes. Full automatic matrix is unchanged.'
plan['fiveAreaJudgments']['visualJudgment']='Judge saved passive evidence in Chromium320/390/landscape, all ready Employee/Lead routes and relevant long-name/clock/pay fixture pages at every text step. WebKit390spot checks and every earlier engine-specific reproduction. The full4480-cell automated matrix is unchanged. State/shell/placeholder measurement follows after baseline; no second4480-route geometry sweep.'
plan['executionOrder'][5]='unchanged checker finishes each cell, external Page.close hook then collects selected geometry/crops from the same loaded page; judge saved evidence after full baseline'
fixes=json.loads((out/'candidate-fix-ledger.json').read_text())
assert fixes['validationSource']==sha and len(fixes['commits'])==33
plan['acceptedFixBase']={'candidate':fixes['candidate'],'validationSource':sha,'findingCommits':33,'ledger':'candidate-fix-ledger.json','previousTargetedProofsCheckpoint':'b9567abc26b977a517b77622a1661b16172f5b16','provenanceAssessment':'freeze-update-8640247.json','fullCurrentBaselineRequired':True}
plan['largeData'].update({'cells':320,'texts':[100,125,150,200],'requiredBriefCellsAt100And200':160,'legacyAdditionalCellsAt125And150':160,'totalCells':320})
plan['sharedManagementNormalSupplement']={'scopeFile':'normal-shared-scope.json','cells':480,'axe':True}
plan['reconciledPhoneBaselineCells']=5280
plan['staticCandidateAudit']={'sha':sha,'all135Crosswalk':'historical-all-135-crosswalk-8640247.json','extraCandidateFindings':['IS-RC-UPDATES-AUTH-01']}
(out/'full-exit-joblist.json').write_text(json.dumps(plan,indent=2))
print(json.dumps({'baseline':4480,'passiveGeometry':776,'duplicateGeometryVisits':0,'shell':320,'largeData':320,'readStateSequences':plan['readStateSweeps']['sequences'],'readStateObservations':plan['readStateSweeps']['maximumStateObservations'],'actionConfigurations':plan['actionStateSweeps']['surfaceConfigurations'],'fontSwap':plan['fontSwap']['cells'],'priorIDs':len(ledger),'allAppRouteTemplates':len(route_pages),'previewStarted':False,'browserStarted':False}))
