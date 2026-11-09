"""Stage only unsigned, source-bound Android outputs for CI publication."""
from pathlib import Path
import argparse,hashlib,io,json,os,re,shutil,stat,struct,subprocess,tempfile,zipfile

class Refused(Exception):
    def __init__(self,reason):self.reason=reason

def require(value,reason):
    if not value:raise Refused(reason)

def source_matches(repo,expected):
    require(re.fullmatch('[a-f0-9]{40}',expected),'source')
    head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
    clean=subprocess.check_output(['git','status','--porcelain'],cwd=repo)
    require(head==expected and not clean,'source')

def unsigned_payload(path,kind):
    try:fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
    except FileNotFoundError:raise Refused('missing')
    except OSError:raise Refused('input')
    with os.fdopen(fd,'rb') as stream:
        info=os.fstat(stream.fileno());limit=256*1024*1024
        require(stat.S_ISREG(info.st_mode) and info.st_uid==os.getuid() and 0<info.st_size<=limit,'input')
        data=stream.read(limit+1);require(len(data)==info.st_size,'input')
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:names=archive.namelist()
    except zipfile.BadZipFile:raise Refused('package')
    required={'AndroidManifest.xml','classes.dex'} if kind=='apk' else {'BundleConfig.pb','base/manifest/AndroidManifest.xml','base/dex/classes.dex'}
    require(required.issubset(names) and len(names)==len(set(names)),'package')
    require(not any(re.fullmatch(r'META-INF/[^/]+\.(SF|RSA|DSA|EC)',name,re.I) for name in names),'signed')
    if kind=='apk':
        end=data.rfind(b'PK\x05\x06',max(0,len(data)-65557))
        require(end>=0 and end+22<=len(data),'package')
        comment=struct.unpack_from('<H',data,end+20)[0];require(end+22+comment==len(data),'package')
        central=struct.unpack_from('<I',data,end+16)[0]
        require(0<=central<=end,'package')
        require(data[max(0,central-16):central]!=b'APK Sig Block 42','signed')
    return data

def prepare(repo,expected,build,output):
    require(output.is_absolute() and not output.exists() and not output.is_symlink(),'destination')
    require(output.parent.is_dir() and not output.is_relative_to(repo),'destination')
    source_matches(repo,expected)
    payloads={
        'app-release-unsigned.apk':unsigned_payload(build/'outputs/apk/release/app-release-unsigned.apk','apk'),
        'app-release.aab':unsigned_payload(build/'outputs/bundle/release/app-release.aab','aab'),
        'source-sha.txt':(expected+'\n').encode(),
    }
    temporary=Path(tempfile.mkdtemp(prefix='.native-artifact-',dir=output.parent))
    try:
        hashes={name:hashlib.sha256(data).hexdigest() for name,data in payloads.items()}
        for name,data in payloads.items():
            with (temporary/name).open('xb') as stream:stream.write(data)
            require(hashlib.sha256((temporary/name).read_bytes()).hexdigest()==hashes[name],'copy')
        (temporary/'artifacts.sha256').write_text(''.join(hashes[name]+'  '+name+'\n' for name in payloads))
        receipt={'sourceCommit':expected,'unsignedOnly':True,'payloadSha256':hashes}
        (temporary/'custody.json').write_text(json.dumps(receipt,indent=2)+'\n')
        source_matches(repo,expected)
        require(not output.exists() and not output.is_symlink(),'destination')
        temporary.rename(output)
    finally:
        if temporary.exists():shutil.rmtree(temporary)
    return {'passed':True,'sourceCommit':expected,'androidArtifacts':2}

if __name__=='__main__':
    os.umask(0o077)
    parser=argparse.ArgumentParser();parser.add_argument('--repo',type=Path,required=True);parser.add_argument('--expected-sha',required=True);parser.add_argument('--build-dir',type=Path,required=True);parser.add_argument('--output-directory',type=Path,required=True);args=parser.parse_args()
    try:
        result=prepare(args.repo.resolve(),args.expected_sha,args.build_dir,args.output_directory)
        print(json.dumps(result))
    except Refused as error:print(json.dumps({'passed':False,'reason':error.reason}));raise SystemExit(1)
    except Exception:print(json.dumps({'passed':False,'reason':'infrastructure'}));raise SystemExit(1)
