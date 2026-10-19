from pathlib import Path
import subprocess,difflib,json,hashlib
repo=Path('/workspace/NEVORA');out=Path(__file__).parent
claude='4aaa79383f82a3c6023f9d2a2c2f492ba3152fce';candidate='b68f250129e2d21731624652e0aad7412b042bc3';ready='368e98a18c16d47df04a93f2bea560843e461e0e';source='9bd265ebb5d2bdfa98eb51f4b386018d5aeecbf7'
def read(sha,f):return subprocess.check_output(['git','show',sha+':'+f],cwd=repo,text=True)
def blob(sha,f):return subprocess.check_output(['git','rev-parse',sha+':'+f],cwd=repo,text=True).strip()
files=['src/components/communication-compose.tsx','src/components/communication-detail.tsx','src/components/payroll/payroll-settings.tsx','src/app/app/premium-wave-b.css'];manifest=[];chunks=[]
for f in files:
 original=read(claude,f);frozen=read(source,f);assert original==frozen,(f,'Claude additions exist: require new manual resolution')
 resolved=read(ready,f);target=out/'resolved'/f;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(resolved)
 diff=''.join(difflib.unified_diff(original.splitlines(True),resolved.splitlines(True),fromfile='a/'+f,tofile='b/'+f));chunks.append(diff)
 (out/(Path(f).name+'.port.diff')).write_text(diff)
 manifest.append({'file':f,'claudeBlob':blob(claude,f),'sourceBlob':blob(source,f),'claudeMatchesFrozenSource':True,'resolvedReadyBlob':blob(ready,f),'resolvedSHA256':hashlib.sha256(resolved.encode()).hexdigest(),'changedLines':{'add':sum(1 for l in diff.splitlines() if l.startswith('+') and not l.startswith('+++')),'remove':sum(1 for l in diff.splitlines() if l.startswith('-') and not l.startswith('---'))}})
(out/'resolution-from-4aaa.patch').write_text(''.join(chunks))
assert subprocess.run(['git','cat-file','-e',claude+':src/components/communication-compose.css'],cwd=repo,stderr=subprocess.DEVNULL).returncode!=0
assert "communication-compose.css" not in read(claude,files[0]) and "communication-compose.css" not in read(ready,files[0])
(out/'MANIFEST.json').write_text(json.dumps({'authoritativeUI':claude,'exact33FixCheckpoint':candidate,'reusedApprovedResolution':ready,'source9bd':source,'files':manifest,'composeCSS':'KEEP DELETED; no import; pending intent ported into premium-wave-b.css','prohibitedLaterScopesExcluded':['IS-B12-COMPLETION','IS-B31-PAYROLL','IS-B33','IS-B29-ready-only','IS-B31 Rules eb83869 (no wave-b-forms.tsx copied)'],'sourceIndexRefWrites':False,'browserOrCI':False,'independentClosureClaim':False},indent=2)+'\n')
print(json.dumps({'path':str(out),'files':len(files),'patchSHA256':hashlib.sha256((out/'resolution-from-4aaa.patch').read_bytes()).hexdigest(),'perFile':[{k:v for k,v in x.items() if k in ['file','changedLines','claudeMatchesFrozenSource']} for x in manifest]},indent=2))
