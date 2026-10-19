import json,pathlib,subprocess,re,hashlib,datetime,functools
repo=pathlib.Path('/workspace/NEVORA');out=pathlib.Path(__file__).parent;source='227150bb2658cb5a30db3c644b6b8f76031d3c79';candidate='e8e947eafabc61b9ed62a08c1762e8c896737c0b'
@functools.lru_cache(None)
def read(sha,path):return subprocess.check_output(['git','show',f'{sha}:{path}'],cwd=repo,text=True)
old=json.loads((out/'prior-findings-ledger.json').read_text());reportpaths={'type-colour-copy.md':'docs/product/specs/premium-phase-3/inspection/type-colour-copy.md','alignment.md':'docs/product/specs/premium-phase-3/inspection/alignment.md','stability.md':'docs/product/specs/premium-phase-3/inspection/stability.md','interaction-states.md':'docs/product/specs/premium-phase-3/inspection/interaction-states.md','widths-roles-consistency.md':'docs/product/specs/premium-phase-3/inspection/widths-roles-consistency.md'}
reports={name:read(source,path) for name,path in reportpaths.items()}
# Prior table parsing is exact on the first cell, avoiding ST01 accidentally matching ST17.
def prior_rows(ident):
 hits=[]
 for name,body in reports.items():
  for line,text in enumerate(body.splitlines(),1):
   if not text.startswith('|'):continue
   cell=text.split('|')[1].replace('**','').replace('`','').strip()
   if re.match(re.escape(ident)+r'(?!\d)(?:\b|$)',cell):hits.append({'report':reportpaths[name],'line':line,'row':text})
 return hits
notes={
'TC-P3-09':('candidate-repair-present','e8e947e','availability/page.tsx specific-week context and Last updated; manager-weekly-roster selected-day summary keepWhole; alias TC30'),
'TC-P3-23':('candidate-repair-present',None,'employee-time-panel stamp() has minute only, entryDate callers and duration use keepWhole'),
'TC-P3-24':('candidate-repair-present','9c6f98b','manager-weekly-roster both timezone strings now timeZoneLabel; hub/lead/deadline/status naming remainders repaired earlier'),
'TC-P3-25':('candidate-repair-present','b5e02c9','all originally reported live failure-copy branches and Timecards503 retry label completed; no unrelated/legal copy changed'),
'TC-P3-27':('candidate-repair-present',None,'Availability locked and Home all-set apostrophes curly'),
'TC-P3-28':('candidate-repair-present','2bc174c','Today headline; existing Timecards title3, Close quiet-label kit role, Timeoff type label overrides'),
'TC-P3-30':('candidate-repair-present','e8e947e','selected roster-day date alias TC09; Home row clamp override portal1456 already present'),
'TC-P3-34':('candidate-repair-present','581921b','corporate footer actual one-column grid+controls placement completed; Profile labels stack; wrapping/hyphens source repair present. More/Notifications still require final geometry judgment'),
'AL-P3-12':('retained-measurement-gap',None,'prior503 prevented actual metric rows; baseline source rule present; must load fictional Timecards data and measure'),
'AL-P3-13':('external-repair-ready',None,'chosen40px confirmation column repaired, but actual phone icon32px and aligncenter remained; AL-P3-13-confirmation-tile.patch'),
'AL-P3-22':('candidate-repair-present','4314266','Home quiet Refresh shared shape; optional negative trailing margin was a judgment option, not required extra change; guarded pending focus now repaired'),
'AL-P3-25':('candidate-repair-present',None,'explicit date/total/disclosure columns and row placement; large-text total moves under entry'),
'AL-P3-26':('candidate-repair-present',None,'Published text sets baseline; decorative dot align-self center'),
'AL-P3-28':('retained-measurement-gap',None,'Updates empty/error box source flattened; fresh empty/error visual judgment needed'),
'AL-P3-29':('candidate-repair-present',None,'day-count normal whitespace and max-width100 at narrow widths'),
'AL-P3-30':('candidate-repair-present',None,'week-note margin18 offsets day-strip negative6 for intended12px gap'),
'AL-P3-31':('external-repair-ready',None,'horizontal20 already repaired; landscape section block padding24 remained; AL-P3-31-landscape-inset.patch'),
'P3-ST-02':('candidate-repair-present',None,'clock aside HoldHeight; compact failed footer copy shortened; needs current ready/pause/offline/fail geometry'),
'P3-ST-14':('candidate-repair-present',None,'corporate panel display:flex gives HoldHeight a real measured box'),
'P3-ST-17':('candidate-repair-present','b68f250','Home public-name/timezone hidden grid sizers reserve title/eyebrow/summary/review row; exactb68 prior80Home cases independent provenance'),
'P3-ST-20':('candidate-repair-present',None,'per-route/role/width/text-step loading-band reservations; all-route44 inventory remains manual, not replaced by16-route baseline'),
'P3-ST-21':('candidate-repair-present',None,'Inbox200% eyebrow reserves96px while loading'),
'P3-ST-23':('candidate-repair-present',None,'app/app/layout.tsx ReactDOM preload variable.woff2 plus existing metric fallback; forced font-hold Profile390 still mandatory fresh measurement'),
'P3-ST-24':('candidate-repair-present',None,'local placeholder ID; schedule/review320 band table repaired; DISTINCT from cloud ST-P3-24 Availability pending'),
'P3-ST-25':('retained-reported-cause',None,'visible-first-block margins moved, but portal-motion.css260 parent grid gap20 remains; current overlap firstblock20px low and flat margin16+gap20; proposal banded phone row-gap0 in local CSS'),
'P3-ST-26':('retained-unisolated-measurement',None,'original measured Manager Timecards320/200 band304→256 at3.3s; cause never isolated. Current band SSR; preload may help but no evidence can close. Need >=3cold traces including children/font timing'),
'P3-WR-07':('candidate-repair-present',None,'all Availability rows stack at150/200 via text-step scope, not non-scaling rem container'),
'P3-WR-11':('candidate-repair-present','d04755e','Inbox exact when nowrap removed and keepWhole applied; Notifications open/footer wrap fixes already present'),
'P3-WR-12':('external-repair-ready',None,'Home/Updates review, Draft and Offclock require existing kit Status glyph+shape; P3-WR-12-kit-status.patch; active Clockedin/Onbreak styles preserved'),
'P3-WR-13':('candidate-repair-present',None,'landscape Home band table now180; Home33 may alter content reservations, so fresh route-placeholder trace mandatory'),
'P3-WR-14':('external-repair-ready',None,'all explicitly reported primary retry/Signin and duplicate-refresh remainders in P3-WR-14-recovery-controls.patch; no legal/pay copy changes'),
'P3-WR-16':('candidate-repair-present',None,'agenda day track minmax2.5rem/max-content'),
'P3-WR-17':('candidate-repair-present',None,'large-text totals second row and duration no-wrap'),
'P3-WR-18':('candidate-repair-present',None,'keepWhole binds month+day, permits long weekday and year break'),
'IS-65':('candidate-repair-present',None,'latest source phase3round3 paragraph reports follower full ring fixed; filters end-padding/fade source exists'),
'IS-66':('candidate-repair-present',None,'latest source phase3round3 paragraph reports one-row scrolling+ring fixed; nowrap/min-width source exists'),
'IS-74':('candidate-repair-present','4b041f7','pending focus all five measured submit surfaces; independent Desktop recorded-time/HomeRefresh alias later repaired4314266'),
'IS-75':('candidate-repair-present','db48fb3','Timeoff/Availability failed-submit reveal helper, alias cloudIS-P3-02'),
'IS-76':('retained-candidate-regression',None,'MyPay/ManagerHome/Inbox/Payroll signed-out links present; Updates401 parser reason session_ended not recognized by View. Separately named IS-RC-UPDATES-AUTH-01 static candidate regression and patch, not new source finding. WR14 separately handles visual roles'),
'IS-77':('candidate-repair-present','ac265b9','Timecards clear stale summary/count and busy state after hidden/offline'),
'IS-78':('candidate-repair-present','6990234','all correction/withdraw/calendar/Timecards real Signin recovery; cloudTimecards401 subset separately mapped'),
'IS-79':('candidate-repair-present','f16da25','persistent polite ACK pending status;401 distinct from403'),
'IS-80':('candidate-repair-present','ab7d866','Calendar unknown recovery above providers, focus/reveal and exact operation retry'),
'IS-81':('candidate-repair-present',None,'inside focus rings on sectiontabs/notification/update rows and existing Profile/hub rules'),
'IS-82':('candidate-repair-present','2dfc390','withdraw form prevents native reset; operation/controlled confirmation preserved'),
'IS-P3-01':('candidate-repair-present','4b041f7','cloud Availability pending-focus alias IS74'),
'IS-P3-02':('candidate-repair-present','db48fb3','cloud Timeoff/Availability feedback alias IS75'),
'IS-P3-03':('candidate-repair-present','6229ad4','Availability caught save native-reset guard'),
'ST-P3-24':('candidate-repair-present','74b527d','cloud Availability pending-label reservation; DISTINCT from localP3-ST-24'),
'ST-RC-CALENDAR-01':('candidate-repair-present','58e100a','cloudST-P3-27 Calendar pending alias; source original broaderIS74Calendar'),
'ST-RC-ACK-01':('candidate-repair-present','e05d661','ACK label reservation candidate-only supplemental ID'),
'ST-RC-CORRECTION-01':('candidate-repair-present','e2d21fb','correction label reservation candidate-only supplemental ID')}
rows=[]
for item in old['findings']:
 ident=item['id'];hits=prior_rows(ident);kind,commit,note=notes.get(ident,('historically-fixed-regression-pending',None,'Original latest explicit status is fixed or superseded; no surviving explicitly open cause identified in this static audit. Re-measure final dimensions/states; historical pass does not certify candidate.'))
 # Source comments are review pointers, not current dynamic proof.
 pattern=r'(?<![A-Z0-9-])'+re.escape(ident)+r'(?![0-9])'
 pointers=[]
 for p in ['src/app/app/portal-premium.css','src/app/app/schedule/employee-schedule.css','src/app/app/availability/availability.css','src/app/employee-mobile-corporate.css','src/components/employee-time-panel.tsx','src/components/employee-home-reviewed.tsx','src/components/employee-updates.tsx','src/components/timecards.tsx']:
  text=read(candidate,p)
  for n,line in enumerate(text.splitlines(),1):
   if re.search(pattern,line):pointers.append({'file':p,'line':n,'text':line[:500]})
 rows.append({'id':ident,'area':item['area'],'historicalRows':hits,'staticStatus':kind,'candidateCommit':commit,'assessment':note,'codeCommentPointers':pointers,'finalMeasurementStatus':'pending-final-frozen-source','currentDynamicPassClaimed':False})
assert len(rows)==135 and len({r['id']for r in rows})==135
retained=[r for r in rows if r['staticStatus'] in ['external-repair-ready','retained-reported-cause','retained-unisolated-measurement','retained-measurement-gap','retained-candidate-regression']]
result={'sourceSHA':source,'candidateReviewedSHA':candidate,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'All135 named ledger IDs across five areas; static survivor audit, never a zero/exit judgment','rules':['Original report table matching is exact on first ID cell; latest explanatory paragraphs are considered for IS65/66 and aliases.','Every final measurement remains pending until exact final freeze. Source fixed, static implementation present, retained gap, unisolated cause and fresh dynamic pass are different states.','No application source, Claude branch, STATUS, commit, runtime, browser, test or CI changed by this audit.','Old b956152 and b6880Home evidence keeps original checkpoint provenance; no cross-SHA pass relabeling.'],'sourceReports':[{'path':reportpaths[n],'sha256':hashlib.sha256(t.encode()).hexdigest()}for n,t in reports.items()],'counts':{k:sum(r['staticStatus']==k for r in rows)for k in sorted({r['staticStatus']for r in rows})},'findings':rows,'extraCandidateFindings':[{'id':'IS-RC-UPDATES-AUTH-01','severity':'P2','sourceAlias':'IS-76 Updates read-auth surface','status':'external-repair-ready-static-only','findingFile':'candidate-findings.md','patch':'IS-RC-UPDATES-AUTH-01.patch','noCurrentBrowserClaim':True}],'retainedQueueIds':[r['id']for r in retained],'collisions':[{'ids':['P3-ST-24','ST-P3-24'],'distinction':'localplaceholder vs cloudAvailabilitypending'},{'ids':['TC-P3-32','cloudTC-P3-32','TC-P3-33'],'distinction':'localTC32datewrapping; cloudTC32Availabilitylabels aliases localTC33; repairedsource227'},{'ids':['IS-75','IS-P3-02'],'distinction':'failed-alertreveal aliases'},{'ids':['IS-74','IS-P3-01'],'distinction':'cloudAvailabilitypending subset of originalfive-surfaceIS74'},{'ids':['TC-P3-09','TC-P3-30'],'distinction':'selectedrosterdate is one surviving cause, repairedoneTC09commit'}],'acceptedDecisions':['Profile ST04 values may grow downward as their real text wraps; this was accepted source behavior, not a new stability defect.','IS63 first-load failure vs previously-loaded content height was explicitly accepted after separate-path measurements; do not reopen by comparing different paths.','WR15 purposeful exact-punch seconds in one older report is superseded by later TC23 explicit minute-only finding and source implementation.','AL22 negative Refresh margin was optional; shared quiet shape and kit type are required.','Close quiet control now uses kit label role; its old shell17/1.5 role leakage is removed.','Callout policy, pay calculations/legal wording, permission/authority and real seed eligibility remain unchanged.']}
(out/'historical-all-135-crosswalk-e8e947e.json').write_text(json.dumps(result,indent=2)+'\n')
lines=['# Phase3 historical survivor audit','',f'Source `{source}`; candidate static review `{candidate}`. All135 IDs included. No current dynamic pass or zero claim.','', 'Remaining repair proposals:','']
for r in retained:lines.append(f"- **{r['id']}** — {r['staticStatus']}: {r['assessment']}")
lines+=['','Fresh final measurements remain required for every ID, especially Home/clock holds, all-route skeletons, font swaps, Inbox200% header, Timecards320/200 late band, large data, action recovery and all role/width/text matrices. Core4480 all--axe remains independent; supplementary eligibility scope is reconciled in scope-reconciliation-aa5e07e.json.','', 'Every historical fixed ID is a regression obligation, not evidence that the final candidate passed.']
(out/'historical-all-135-crosswalk-e8e947e.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'count':len(rows),'counts':result['counts'],'retainedQueueIds':result['retainedQueueIds']},indent=2))
