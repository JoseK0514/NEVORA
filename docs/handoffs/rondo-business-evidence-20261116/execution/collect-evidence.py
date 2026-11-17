from pathlib import Path
import json,hashlib,shutil,subprocess
root=Path.cwd();scratch=root/'.superpowers/sdd/2026-11-16-rondo-business-evidence';out=root/'docs/handoffs/rondo-business-evidence-20261116';out.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
files=[]
def put(p,dest):
 dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest);files.append({'file':str(dest.relative_to(out)),'sha256':sha(dest)})
for p in sorted(scratch.iterdir()):
 if p.is_file() and p.name!='task-8-collection.log' and (p.suffix=='.log' or p.name=='progress.md' or p.name.startswith('final-review') or p.name.endswith('-report.json') or p.name in ['collect-evidence.py','final-source-custody.json']):put(p,out/'execution'/p.name)
external=Path('/Users/josek0514/.codex/visualizations/2026/11/16/rondo-business-evidence-20261116');raw=[]
for p in sorted(external.rglob('*')):
 if not p.is_file() or not (p.name in ['report.json','ownership.json','source-manifest.json','next.log'] or p.suffix=='.png'):continue
 if '/app/' in str(p):continue
 rel=p.relative_to(external);raw.append({'location':str(p),'sha256':sha(p)})
 if p.name in ['report.json','source-manifest.json']:
  x=json.loads(p.read_text())
  for key in ['source','hashes']:
   if isinstance(x.get(key),dict):x[key+'Files']=[{'file':k,'sha256':v} for k,v in sorted(x.pop(key).items())]
  x['originalRawReport']={'location':str(p),'sha256':sha(p)}
  dest=out/'browser'/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(x,indent=2)+'\n');files.append({'file':str(dest.relative_to(out)),'sha256':sha(dest)})
 else:put(p,out/'browser'/rel)
files=[{'file':str(p.relative_to(out)),'sha256':sha(p)} for p in sorted(out.rglob('*')) if p.is_file() and p!=out/'manifest.json']
manifest={'scope':'Local backend/API, fictional owned SQL/browser and scripted providers; no actual-model or hosted acceptance','sourceHead':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'style':'B2','uiOwner':'Claude','actual50ModelRuns':0,'all50Scores':'null','realProvidersActivated':0,'copiedFileRecords':files,'originalExternalReports':raw,'oldWeeklyEvidence':'../rondo-manager-program-evidence-20261116/manifest.json','rawEvidencePolicy':'Original raw files retained unchanged at listed external locations. Copied JSON hash maps are represented losslessly as file/sha256 arrays, with original raw hashes.'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Copied',len(files),'records; retained',len(raw),'external raw files')
