import {spawnSync} from 'node:child_process';
/** Validate names, regular-file type, size and exact inventory before extraction.
 * Python's standard ZIP reader avoids ambient unzip options and follows no ZIP
 * symlinks. The caller creates and removes this owned temporary directory. */
export function extractNeonArchive(archive,files,destination){
 const code=String.raw`
import sys,json,zipfile,pathlib,stat
expected=json.load(sys.stdin)
assert len(expected)==len(set(expected)), 'duplicate manifest entry'
with zipfile.ZipFile(sys.argv[1]) as archive:
 entries=archive.infolist()
 names=[e.filename for e in entries]
 assert len(names)==len(set(names)) and set(names)==set(expected), 'archive entry inventory mismatch'
 assert sum(e.file_size for e in entries)<=134217728, 'archive too large'
 for entry in entries:
  path=pathlib.PurePosixPath(entry.filename)
  mode=entry.external_attr>>16
  assert not path.is_absolute() and '..' not in path.parts and '\\' not in entry.filename and str(path)==entry.filename, 'unsafe archive entry'
  assert not entry.is_dir() and not (entry.flag_bits&1) and (not stat.S_IFMT(mode) or stat.S_ISREG(mode)), 'non-regular archive entry'
  assert 0<=entry.file_size<=67108864, 'archive entry too large'
  target=pathlib.Path(sys.argv[2]).joinpath(*path.parts)
  target.parent.mkdir(parents=True,exist_ok=True)
  with target.open('xb') as output:
   output.write(archive.read(entry))
`;
 const result=spawnSync('python3',['-c',code,archive,destination],{input:JSON.stringify(files),encoding:'utf8',timeout:30000,maxBuffer:1048576});
 if(result.error||result.status!==0)throw Error('Deployment archive validation failed: '+(result.stderr??'').slice(-2000));
}
