"""Restore the exact verified Owner prototype from Git-tracked parts, outside the app checkout."""
from pathlib import Path
import argparse,hashlib,json,os,shutil,subprocess,sys,tempfile,zipfile

def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for data in iter(lambda:f.read(1024*1024),b''):h.update(data)
 return h.hexdigest()

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--destination',type=Path,required=True);a=p.parse_args();here=Path(__file__).resolve().parent;repo=here.parents[2];dest=a.destination.expanduser().resolve()
 if dest==repo or repo in dest.parents:raise ValueError('Choose a separate workspace outside the application checkout so prototype sources cannot enter its compiler/lint scan.')
 if dest.exists():raise FileExistsError('Destination exists; choose a new directory. Existing work is never overwritten: '+str(dest))
 m=json.loads((here/'bundle/manifest.json').read_text());parts=[]
 for row in m['parts']:
  rel=Path(row['file']);assert not rel.is_absolute() and len(rel.parts)==1 and '..' not in rel.parts
  f=here/'bundle'/rel
  if not f.is_file():raise FileNotFoundError('Missing Git payload part: '+row['file'])
  if f.stat().st_size!=row['size'] or digest(f)!=row['sha256']:raise ValueError('Corrupt Git payload part: '+row['file'])
  parts.append(f)
 dest.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='.nevora-owner-restore-',dir=str(dest.parent)) as scratch:
  tmp=Path(scratch);archive=tmp/'owner.zip';stage=tmp/'workspace';stage.mkdir()
  with archive.open('wb') as out:
   for part in parts:
    with part.open('rb') as src:shutil.copyfileobj(src,out,1024*1024)
  assert archive.stat().st_size==m['archive_size'] and digest(archive)==m['archive_sha256'],'Reassembled archive identity differs'
  with zipfile.ZipFile(archive) as z:
   names=z.namelist();assert len(names)==len(set(names)),'Duplicate archive names'
   for info in z.infolist():
    rel=Path(info.filename);assert not rel.is_absolute() and '..' not in rel.parts and '\\' not in info.filename,'Unsafe archive path'
    assert ((info.external_attr>>16)&0o170000)!=0o120000,'Archive symlink rejected'
   assert z.testzip() is None,'Archive CRC failure';z.extractall(stage)
  verifier=stage/'handoff/codex-cloud-owner-desktop/verify-bundle.py';run=subprocess.run([sys.executable,str(verifier),'--root',str(stage),'--variant','full'],capture_output=True,text=True)
  if run.returncode:raise RuntimeError('Frozen bundle verification failed: '+run.stdout+run.stderr)
  proof=json.loads(run.stdout);assert proof['result']=='PASS' and proof['runtime_sha256']==m['runtime_sha256']
  # Exclusive creation avoids overwriting a destination created concurrently.
  dest.mkdir(exist_ok=False)
  for f in stage.iterdir():shutil.move(str(f),str(dest/f.name))
 print(json.dumps({'restored_to':str(dest),'files_checked':proof['checked'],'runtime_sha256':proof['runtime_sha256'],'result':'PASS','application_checkout_modified':False,'next_read':str(dest/'handoff/codex-cloud-owner-desktop/START-HERE.md'),'cloud_environment_certified':False},indent=2))

if __name__=='__main__':main()
