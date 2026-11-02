"""Run transport-fixture instrumentation on an explicitly owned emulator."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import selectors
import subprocess
import tempfile
import time
from urllib.parse import urlsplit
import uuid

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--serial', required=True)
parser.add_argument('--only-testing')
parser.add_argument('--mode', choices=['transport', 'owned-backend'], default='transport')
parser.add_argument('--backend-origin')
parser.add_argument('--backend-control-origin')
parser.add_argument('--backend-owner')
parser.add_argument('--expected-sha')
parser.add_argument('--evidence-root')
args = parser.parse_args()
match = re.fullmatch(r'emulator-(\d{4})', args.serial)
if not match or not 5554 <= int(match[1]) <= 5682 or int(match[1]) % 2:
    parser.error('Select an explicitly owned emulator serial, never a physical or implicit device')
if args.only_testing and not re.fullmatch(r'com\.velani\.nevora\.development\.ShellInstrumentedTest(?:#[A-Za-z0-9_]+)?', args.only_testing):
    parser.error('Select a known native instrumentation test')
backend = args.mode == 'owned-backend'
backend_values = [args.backend_origin, args.backend_control_origin, args.backend_owner, args.expected_sha, args.evidence_root]
if backend:
    if args.only_testing or not all(backend_values) or not re.fullmatch('[a-f0-9]{32}', args.backend_owner) or not re.fullmatch('[a-f0-9]{40}', args.expected_sha):
        parser.error('Owned backend requires the full invocation receipt')
    for value in [args.backend_origin, args.backend_control_origin]:
        try:
            url = urlsplit(value)
            valid_origin = url.scheme == 'http' and url.hostname == '127.0.0.1' and url.port and not (url.path or url.query or url.fragment) and url.username is None
        except ValueError:
            valid_origin = False
        if not valid_origin:
            parser.error('Owned backend must use explicit loopback origins')
    receipt = Path(args.evidence_root)
    if not receipt.is_absolute() or receipt.resolve() != receipt or not receipt.is_dir() or receipt.is_symlink() or not receipt.name.startswith('nevora-native-owned-') or receipt.stat().st_uid != os.getuid():
        parser.error('Invalid owned evidence root')
    try:
        valid_receipt = (receipt / 'native-owner').read_text() == args.backend_owner and json.loads((receipt / 'source-custody.json').read_text())['checkpoint'] == args.expected_sha
    except (OSError, ValueError, KeyError):
        valid_receipt = False
    if not valid_receipt:
        parser.error('Backend ownership/source receipt mismatch')
elif any(backend_values):
    parser.error('Backend inputs require explicit owned-backend mode')
owner = (Path(tempfile.gettempdir()) / f'nevora-native-android-{args.serial}.lock').open('a+')
try:
    fcntl.flock(owner, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    parser.error('Emulator is already in use by another native test invocation')
sdk = Path(os.environ.get('ANDROID_HOME', ''))
adb = sdk / 'platform-tools/adb'
if not adb.is_file():
    parser.error('ANDROID_HOME must identify the installed SDK')
root = Path(__file__).resolve().parent
evidence = Path(tempfile.mkdtemp(prefix='nevora-native-android-', dir=args.evidence_root if backend else None))
invocation = args.backend_owner if backend else uuid.uuid4().hex
(evidence / 'owner').write_text(invocation)
env = {key: value for key, value in os.environ.items() if key in ['PATH', 'HOME', 'TMPDIR', 'LANG', 'JAVA_HOME', 'NEVORA_OWNED_PROCESS_OWNER']}
env['ANDROID_HOME'] = str(sdk)

def run(command, timeout=45, check=True):
    result = subprocess.run(command, env=env, capture_output=True, text=True, timeout=timeout)
    if check and result.returncode:
        raise RuntimeError(f'{Path(str(command[0])).name} failed: {result.stderr[-1500:]}')
    return result

def device(*command, **options):
    return run([str(adb), '-s', args.serial, *command], **options)

def source_hash():
    files = sorted(set(list((root / 'app/src').rglob('*')) + list(root.glob('*.gradle'))
        + list(root.glob('*.properties')) + list(root.glob('*.py')) + list((root / 'gradle/wrapper').glob('*'))
        + [root / 'app/build.gradle', root / 'gradlew', root.parent / 'ios/Fixtures/server.mjs', root.parent.parent / 'src/lib/native-shell/security.ts']))
    digest = hashlib.sha256()
    for path in files:
        if path.is_file():
            digest.update(str(path.relative_to(root.parent.parent)).encode() + b'\0' + path.read_bytes())
    return digest.hexdigest()

fixture = None
ports = []
report = {'evidence': str(evidence), 'serial': args.serial, 'passed': False, 'fixtureOnly': not backend, 'checkpoint': args.expected_sha, 'ownerId': args.backend_owner}
try:
    if backend:
        assert not evidence.is_relative_to(root.parent.parent), 'Evidence cannot be inside source'
        assert run(['git', '-C', str(root.parent.parent), 'rev-parse', 'HEAD']).stdout.strip() == args.expected_sha
        assert not run(['git', '-C', str(root.parent.parent), 'status', '--porcelain=v1']).stdout.strip()
    assert device('get-state').stdout.strip() == 'device', 'Selected emulator unavailable'
    assert device('shell', 'getprop', 'ro.kernel.qemu').stdout.strip() == '1', 'Not an emulator'
    before = source_hash()
    report['sourceHash'] = before
    if backend:
        addresses = {'origin': args.backend_origin, 'controlOrigin': args.backend_control_origin}
    else:
        fixture = subprocess.Popen(['node', str(root.parent / 'ios/Fixtures/server.mjs')], env=env, stdout=subprocess.PIPE, text=True)
        with selectors.DefaultSelector() as selector:
            selector.register(fixture.stdout, selectors.EVENT_READ)
            if not selector.select(timeout=5):
                raise RuntimeError('Fixture did not become ready')
            addresses = json.loads(fixture.stdout.readline(4096))
    for key in addresses:
        url = urlsplit(addresses[key])
        assert url.scheme == 'http' and url.hostname == '127.0.0.1' and url.port and not url.path and not url.query and not url.fragment and not url.username
        ports.append(url.port)
        device('reverse', f'tcp:{url.port}', f'tcp:{url.port}')
    report['origin'] = addresses['origin']
    if not backend: report['fixtureOrigin'] = addresses['origin']
    with (evidence / 'build.log').open('w') as output:
        built = subprocess.run([str(root / 'gradlew'), '--no-daemon', '--project-cache-dir', str(evidence / 'gradle-cache'),
            f'-PnevoraBuildDirectory={evidence / "app-build"}', ':app:assembleDebug', ':app:assembleDebugAndroidTest'],
            cwd=root, env=env, stdout=output, stderr=subprocess.STDOUT, timeout=300)
        if built.returncode:
            raise RuntimeError('Android build failed; see build.log')
    for apk in [evidence / 'app-build/outputs/apk/debug/app-debug.apk', evidence / 'app-build/outputs/apk/androidTest/debug/app-debug-androidTest.apk']:
        device('install', '-r', '-t', str(apk), timeout=60)
    selected_class = 'com.velani.nevora.development.BackendInstrumentedTest' if backend else args.only_testing or 'com.velani.nevora.development.ShellInstrumentedTest'
    settings = ['-e', 'backendOrigin', addresses['origin'], '-e', 'backendControlOrigin', addresses['controlOrigin']] if backend else ['-e', 'fixtureOrigin', addresses['origin'], '-e', 'unavailableOrigin', addresses['unavailableOrigin']]
    result = device('shell', 'am', 'instrument', '-w', '-e', 'class', selected_class,
        *settings, '-e', 'nativeEvidenceKey', invocation,
        'com.velani.nevora.development.test/androidx.test.runner.AndroidJUnitRunner', timeout=480)
    text = result.stdout + result.stderr
    (evidence / 'instrumentation.log').write_text(text)
    diagnostic_root = f'cache/nevora-native-tests-{invocation}'
    diagnostics = device('shell', 'run-as', 'com.velani.nevora.development', 'ls', diagnostic_root, check=False)
    if diagnostics.returncode == 0:
        for name in diagnostics.stdout.splitlines():
            if not re.fullmatch(r'[A-Za-z0-9_]+\.(?:png|xml)', name):
                raise RuntimeError('Unexpected diagnostic artifact')
            data = subprocess.run([str(adb), '-s', args.serial, 'exec-out', 'run-as', 'com.velani.nevora.development', 'cat', f'{diagnostic_root}/{name}'], env=env, capture_output=True, timeout=15, check=True)
            (evidence / name).write_bytes(data.stdout)
    completed = re.search(r'OK \((\d+) tests?\)', text)
    if not completed or int(completed[1]) < 1 or any(value in text for value in ['FAILURES!!!', 'INSTRUMENTATION_FAILED', 'Process crashed']):
        raise RuntimeError('Instrumentation did not pass; see instrumentation.log')
    report['instrumentationTests'] = int(completed[1])
    if not args.only_testing:
        assert int(completed[1]) == (2 if backend else 9), 'Expected complete selected matrix'
        device('shell', 'am', 'force-stop', 'com.velani.nevora.development')
        device('shell', 'am', 'start', '-W', '-n', 'com.velani.nevora.development/.PortalActivity', '--es', 'nevora.debug.origin', addresses['origin'])
        xml_path = f'/data/local/tmp/nevora-native-{invocation}.xml'
        try:
            deadline = time.monotonic() + 25
            while True:
                device('shell', 'uiautomator', 'dump', xml_path, timeout=15)
                hierarchy = device('exec-out', 'cat', xml_path).stdout
                expected_home = ('Team' in hierarchy and 'Schedule' in hierarchy) if backend else 'Fictional Owner Home' in hierarchy
                if expected_home:
                    (evidence / 'cold-start.xml').write_text(hierarchy)
                    report['coldProcessRestart'] = True
                    break
                if time.monotonic() >= deadline:
                    raise RuntimeError('Owner session did not survive a real process restart')
                time.sleep(0.2)
        finally:
            device('shell', 'rm', '-f', xml_path, check=False)
        screenshot = subprocess.run([str(adb), '-s', args.serial, 'exec-out', 'screencap', '-p'], env=env, capture_output=True, timeout=15, check=True)
        (evidence / 'owner-cold-start.png').write_bytes(screenshot.stdout)
    assert source_hash() == before, 'Native/fixture source changed during verification'
    if backend:
        assert run(['git', '-C', str(root.parent.parent), 'rev-parse', 'HEAD']).stdout.strip() == args.expected_sha
        assert not run(['git', '-C', str(root.parent.parent), 'status', '--porcelain=v1']).stdout.strip()
    report['passed'] = True
finally:
    device('shell', 'am', 'force-stop', 'com.velani.nevora.development', check=False)
    for port in ports:
        device('reverse', '--remove', f'tcp:{port}', check=False)
    if fixture:
        fixture.terminate()
        try:
            fixture.wait(timeout=5)
        except subprocess.TimeoutExpired:
            fixture.kill(); fixture.wait()
        fixture.stdout.close()
    (evidence / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))
