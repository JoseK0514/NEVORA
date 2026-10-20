from pathlib import Path
import json,time,os,signal,datetime
p=Path('/workspace/nevora-inspections/release/preview-integration-33/candidate-a21650d-repairs');target='/workspace/nevora-inspection-runtime/final-verification/candidate-repairs-preparation/repair-priority-continuation-v6.mjs'
def state(pid):
 try:return Path(f'/proc/{pid}/stat').read_text().split(') ')[1].split()[0]
 except FileNotFoundError:return None
while True:
 x=json.loads((p/'priority-continuation-v6.json').read_text())
 if x['jobs'] and x['jobs'][-1]['stage']=='markread-chromium':break
 assert not any(j['stage'] not in ['wb-contrast'] for j in x['jobs']),'Mark-read checkpoint passed'
 time.sleep(.5)
parents=[]
for proc in Path('/proc').iterdir():
 if not proc.name.isdigit():continue
 try:
  argv=(proc/'cmdline').read_bytes().split(b'\0')
  if len(argv)>1 and argv[1].decode(errors='ignore')==target:parents.append(int(proc.name))
 except (FileNotFoundError,PermissionError):pass
assert len(parents)==1;outer=parents[0];children=[]
for proc in Path('/proc').iterdir():
 if not proc.name.isdigit():continue
 try:
  fields=(proc/'stat').read_text().split(') ')[1].split()
  if int(fields[1])==outer and fields[0]!='Z':children.append(int(proc.name))
 except (FileNotFoundError,PermissionError):pass
assert len(children)==1;child=children[0];assert Path(f'/proc/{child}/cmdline').read_bytes().split(b'\0')[1].decode()==str(p/'executed-scripts/scoped-verify-v2.mjs')
os.kill(outer,signal.SIGSTOP)
for _ in range(100):
 if state(outer)=='T':break
 time.sleep(.01)
assert state(outer)=='T'
a=p/'attempts/005-markread-ready-geometry-checkpoint';a.mkdir(parents=True,exist_ok=True)
receipt={'checkpoint':x['checkpoint'],'outerCoordinatorPID':outer,'allowedExistingMarkReadChildPID':child,'pausedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'reason':'Root authorized same-worker Timecards geometry2 and narrow same-key Mark-read real-ready setup replay; no existing action assertion changed','noNewBrowserUntilExistingChildClosed':True}
(a/'pause.json').write_text(json.dumps(receipt,indent=2)+'\n')
while state(child)not in [None,'Z']:time.sleep(.5)
receipt['existingChildClosedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();receipt['safeForSoleSerialFollowup']=True;(a/'pause.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'safeCheckpoint':True,'outerCoordinatorPID':outer,'closedMarkReadChildPID':child}))
