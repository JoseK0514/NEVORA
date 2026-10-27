"""Extract the original handoff without changing application files or running app scripts."""
from pathlib import Path, PurePosixPath
import argparse, hashlib, json, shutil, subprocess, sys, tarfile, tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--destination', help='A new directory outside this repository; it must not exist')
args = parser.parse_args()
here = Path(__file__).resolve().parent
repository = here.parents[2]
destination = Path(args.destination).expanduser().resolve() if args.destination else Path(tempfile.mkdtemp(prefix='nevora-owner-cloud-')) / 'package'
if destination.exists():
    raise SystemExit('Existing destination preserved. Choose a new directory.')
if destination == repository or repository in destination.parents:
    raise SystemExit('Choose a destination outside the application checkout.')
manifest = json.loads((here / 'payload-manifest.json').read_text())
files = 0
with tempfile.TemporaryDirectory(prefix='nevora-owner-archive-') as temporary:
    archive = Path(temporary) / 'payload.tar.xz'
    digest = hashlib.sha256()
    with archive.open('wb') as combined:
        for part in manifest['parts']:
            path = here / part['file']
            if path.name != part['file'] or not path.is_file():
                raise SystemExit('Missing or invalid archive part: ' + part['file'])
            data = path.read_bytes()
            if len(data) != part['bytes'] or hashlib.sha256(data).hexdigest() != part['sha256']:
                raise SystemExit('Archive part identity mismatch: ' + part['file'])
            combined.write(data)
            digest.update(data)
    if digest.hexdigest() != manifest['archive_sha256'] or archive.stat().st_size != manifest['archive_bytes']:
        raise SystemExit('Combined archive identity mismatch')
    destination.mkdir(parents=True)
    with tarfile.open(archive, 'r:xz') as payload:
        for member in payload:
            path = PurePosixPath(member.name)
            if path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0] != manifest['extraction_root']:
                raise SystemExit('Unsafe archive path')
            relative = Path(*path.parts[1:])
            output = destination / relative
            if member.isdir():
                output.mkdir(parents=True, exist_ok=True)
            elif member.isfile():
                output.parent.mkdir(parents=True, exist_ok=True)
                with payload.extractfile(member) as source, output.open('wb') as target:
                    shutil.copyfileobj(source, target)
                files += 1
            else:
                raise SystemExit('Unexpected non-regular archive member')
checked = subprocess.run([sys.executable, str(destination / 'tools/validate_handoff.py')], capture_output=True, text=True)
print(checked.stdout, end='')
if checked.returncode:
    print(checked.stderr, file=sys.stderr)
    raise SystemExit(checked.returncode)
print(json.dumps({'package_directory': str(destination), 'extracted_files': files,
                  'next_read': str(destination / 'START-HERE.md'),
                  'next_batch': '3.6 Company/location operational policies and history/conflicts'}, indent=2))
