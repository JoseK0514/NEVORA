"""Restore G10 plus the verified G11 overlay into a fresh separate prototype directory."""
from pathlib import Path
import argparse,hashlib,json,subprocess,sys,tempfile,zipfile,shutil
p=argparse.ArgumentParser();p.add_argument('--destination',type=Path,required=True);a=p.parse_args();here=Path(__file__).resolve().parent;repo=here.parents[2];dest=a.destination.expanduser().resolve();assert not dest.exists(),'Choose a fresh destination; existing work is never overwritten';assert dest!=repo and repo not in dest.parents,'Restore outside the application checkout'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();m=json.loads((here/'bundle/manifest.json').read_text())
dest.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='nevora-g11-restore-',dir=str(dest.parent)) as tmp:
 archive=Path(tmp)/'overlay.zip'
 with archive.open('wb') as out:
  for row in m['parts']:
   rel=Path(row['file']);assert len(rel.parts)==1 and not rel.is_absolute() and '..' not in rel.parts;f=here/'bundle'/rel;assert f.stat().st_size==row['size'] and sha(f)==row['sha256'],f
   with f.open('rb') as src:shutil.copyfileobj(src,out)
 assert archive.stat().st_size==m['archive_size'] and sha(archive)==m['archive_sha256']
 with zipfile.ZipFile(archive) as z:
  assert len(z.namelist())==len(set(z.namelist()));assert set(z.namelist())==set(m['changed']);assert z.testzip() is None
  for info in z.infolist():
   rel=Path(info.filename);assert not rel.is_absolute() and '..' not in rel.parts and '\\' not in info.filename;assert ((info.external_attr>>16)&0o170000)!=0o120000
  base=repo/'docs/handoffs/owner-desktop-cloud-20261027/restore-owner-desktop.py';subprocess.run([sys.executable,str(base),'--destination',str(dest)],cwd=repo,check=True,capture_output=True,text=True)
  assert sha(dest/'outputs/owner-desktop/index.html')==m['base_runtime_sha256']
  for name,row in m['changed'].items():
   f=dest/name
   if row['baseline_sha256'] is None:assert not f.exists(),name
   else:assert f.is_file() and sha(f)==row['baseline_sha256'],name
   data=z.read(name);assert len(data)==row['size'] and hashlib.sha256(data).hexdigest()==row['sha256'];f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(data)
 for name,row in m['complete_files'].items():
  rel=Path(name);assert not rel.is_absolute() and '..' not in rel.parts;f=dest/rel;assert f.is_file() and f.stat().st_size==row['size'] and sha(f)==row['sha256'],name
 assert sha(dest/'outputs/owner-desktop/index.html')==m['runtime_sha256']
print(json.dumps({'result':'PASS','restored_to':str(dest),'complete_files_checked':len(m['complete_files']),'runtime_sha256':m['runtime_sha256'],'application_checkout_modified':False,'next_read':str(dest/'CODEX-CLOUD-G11-CONTINUATION.md'),'browser_matrix_rerun':False},indent=2))
