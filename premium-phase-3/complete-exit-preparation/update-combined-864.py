from pathlib import Path
import subprocess,json,hashlib,datetime
out=Path(__file__).parent;root=Path('/workspace/inspect-phase3-final');sha='8640247be632ee6382c68b3b1ae3bbed532a5d65';accepted='b68f250129e2d21731624652e0aad7412b042bc3';base='8e18a958dfbfd1e5c6d6da44396d82c95d4e18e7';git=lambda *a:subprocess.check_output(['git',*a],cwd=root,text=True).strip();assert git('rev-parse','HEAD')==sha and not git('status','--porcelain','--untracked-files=no')
archive=out/'freeze-history/9ec3adc-preparation';archive.mkdir(parents=True,exist_ok=True)
for name in ['README.md','full-exit-joblist.json','candidate-fix-ledger.json','fixture-preparation.json','preparation-receipt.json','manual-queue.json','prior-findings-ledger.json','all-route-placeholder-inventory.json','baseline-dry-run.json']:
 p=out/name
 if p.exists() and not (archive/name).exists():(archive/name).write_bytes(p.read_bytes())
commits=[]
for line in git('log','--reverse','--format=%H\t%s',base+'..'+accepted).splitlines():
 commit,title=line.split('\t',1);commits.append({'sha':commit,'finding':title.split(':',1)[0],'title':title,'files':git('diff-tree','--no-commit-id','--name-only','-r',commit).splitlines()})
assert len(commits)==33
(out/'candidate-fix-ledger.json').write_text(json.dumps({'validationSource':sha,'candidate':accepted,'base':base,'commits':commits,'commitCount':33,'claudeParent':'4aaa79383f82a3c6023f9d2a2c2f492ba3152fce','later34To45Included':False,'rule':'Only exact accepted33; original31 and33 runtime proofs retain original SHA. Combined source requires fresh complete review.'},indent=2)+'\n')
p=out/'scripts/build-plan.py';s=p.read_text();s=s.replace("sha='9ec3adcf486bf4d18d6b9c8d5ed9af9e876d332b'",f"sha='{sha}'")
s=s.replace("re.search(r'\\b'+re.escape(id)+r'\\b',s)","re.match(re.escape(id)+r'(?!\\d)(?:\\b|$)',s.split('|')[1].replace('**','').replace('`','').strip())")
s=s.replace("assert fixes['candidate']==sha and len(fixes['commits'])==32","assert fixes['validationSource']==sha and len(fixes['commits'])==33")
s=s.replace("plan['acceptedFixBase']={'candidate':sha,'findingCommits':32", "plan['acceptedFixBase']={'candidate':fixes['candidate'],'validationSource':sha,'findingCommits':33")
s=s.replace("'provenanceAssessment':'freeze-update-9ec3adc.json'", "'provenanceAssessment':'freeze-update-8640247.json'")
s=s.replace("(out/'full-exit-joblist.json').write_text", "plan['largeData'].update({'cells':320,'texts':[100,125,150,200],'requiredBriefCellsAt100And200':160,'legacyAdditionalCellsAt125And150':160,'totalCells':320})\nplan['sharedManagementNormalSupplement']={'scopeFile':'normal-shared-scope.json','cells':480,'axe':True}\nplan['reconciledPhoneBaselineCells']=5280\nplan['staticCandidateAudit']={'sha':sha,'all135Crosswalk':'historical-all-135-crosswalk-8640247.json','extraCandidateFindings':['IS-RC-UPDATES-AUTH-01']}\n(out/'full-exit-joblist.json').write_text")
s=s.replace('run160large-data cells','run320large-data cells')
s=s.replace("'largeData':160","'largeData':320")
p.write_text(s)
for name in ['normal-shared-scope.json','large-shared-scope.json']:
 p=out/name;j=json.loads(p.read_text());j['preparedAgainst']=sha;j['releaseTarget']=sha;j['resourceStatus']='held until root gate release';p.write_text(json.dumps(j,indent=2)+'\n')
p=out/'fixture-preparation.json';j=json.loads(p.read_text());j['checkpoint']=sha
for key in list(j.get('sourceHashes',{})):
 if(root/key).exists():j['sourceHashes'][key]=hashlib.sha256((root/key).read_bytes()).hexdigest()
j['kind']='static exact combined-source fixture preparation; nothing seeded or launched';p.write_text(json.dumps(j,indent=2)+'\n')
receipt={'source':sha,'tree':git('rev-parse','HEAD^{tree}'),'parents':git('show','--format=%P','--no-patch','HEAD').split(),'acceptedFindingCommits':33,'acceptedCandidate':accepted,'later45Checkpoint':'historical e8e947e; interrupted by user target switch; no pass inherited','baselineCheckerSha256':hashlib.sha256((root/'scripts/ui-checks/checks.mjs').read_bytes()).hexdigest(),'phoneAxes':{'core':4480,'managementNormalSupplement':480,'separateLarge':320,'total':5280},'manualRowsExpected':1546,'priorIDs':135,'previewStarted':False,'browserStarted':False,'runtimeTestsRun':False,'resourceRelease':'not yet granted','previousProofProvenance':'b956152 andb6880Home retain original checkpoints; all current required cells/states remain fresh review obligations','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(out/'freeze-update-8640247.json').write_text(json.dumps(receipt,indent=2)+'\n');(out/'preparation-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt,indent=2))
