"""Restore the immutable base plus verified standalone continuation outside this checkout."""
from pathlib import Path,PurePosixPath
import argparse,hashlib,json,subprocess,sys,tarfile,tempfile,shutil
p=argparse.ArgumentParser();p.add_argument('--destination',help='New directory outside the application checkout');args=p.parse_args()
here=Path(__file__).resolve().parent;handoff=here.parents[1];repository=handoff.parents[2]
destination=Path(args.destination).expanduser().resolve() if args.destination else Path(tempfile.mkdtemp(prefix='nevora-owner-through39-'))/'package'
if destination.exists():raise SystemExit('Existing destination preserved; choose a new directory.')
if destination==repository or repository in destination.parents:raise SystemExit('Destination must be outside the application checkout.')
meta=json.loads((here/'CHECKPOINT.json').read_text());archive=here/meta['archive_file'];digest=lambda b:hashlib.sha256(b).hexdigest()
if archive.parent!=here or not archive.is_file():raise SystemExit('Missing checkpoint archive.')
if archive.stat().st_size!=meta['archive_bytes'] or digest(archive.read_bytes())!=meta['archive_sha256']:raise SystemExit('Checkpoint archive identity mismatch.')
base=subprocess.run([sys.executable,str(handoff/'prepare_cloud.py'),'--destination',str(destination)],capture_output=True,text=True)
if base.returncode:
 print(base.stdout,end='');print(base.stderr,file=sys.stderr,end='');raise SystemExit(base.returncode)
with tarfile.open(archive,'r:xz') as tar:
 members=tar.getmembers();prefix=meta['archive_root']
 for member in members:
  path=PurePosixPath(member.name)
  if path.is_absolute() or '..'in path.parts or not path.parts or path.parts[0]!=prefix or not(member.isfile()or member.isdir()):raise SystemExit('Unsafe checkpoint member.')
 manifest=json.loads(tar.extractfile(prefix+'/'+meta['manifest']).read())
 if manifest['artifact_sha256']!=meta['artifact_sha256']:raise SystemExit('Manifest artifact identity mismatch.')
 # Validate declared files before applying the overlay.
 for record in manifest['files']:
  path=PurePosixPath(record['path'])
  if path.is_absolute() or '..'in path.parts:raise SystemExit('Unsafe manifest path.')
  data=tar.extractfile(prefix+'/'+record['path']).read()
  if len(data)!=record['bytes'] or digest(data)!=record['sha256']:raise SystemExit('Checkpoint file mismatch: '+record['path'])
 for member in members:
  relative=Path(*PurePosixPath(member.name).parts[1:]);target=destination/relative
  if member.isdir():target.mkdir(parents=True,exist_ok=True)
  else:
   target.parent.mkdir(parents=True,exist_ok=True)
   with tar.extractfile(member) as source,target.open('wb') as output:shutil.copyfileobj(source,output)
for record in manifest['files']:
 target=destination/record['path']
 if target.stat().st_size!=record['bytes'] or digest(target.read_bytes())!=record['sha256']:raise SystemExit('Restored file mismatch: '+record['path'])
subprocess.run([sys.executable,'work/owner-mobile/build.py'],cwd=destination,check=True,capture_output=True)
actual=digest((destination/'outputs/nevora-owner-mobile.html').read_bytes())
if actual!=meta['artifact_sha256']:raise SystemExit('Restored canonical rebuild mismatch.')
result={'package_directory':str(destination),'original_base_validated':True,'continuation_files_verified':len(manifest['files']),'artifact_sha256':actual,'canonical_rebuild_matches':True,'next_read':[str(destination/'AGENTS.md'),str(destination/'START-HERE.md')],'next_batch':'4.1 P-07 export mapping profiles','scope':'Standalone MOBILE OWNER only; no real app/services/data/messages/activation/merge/deployment.'}
(destination/'CONTINUATION-VALIDATION.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
