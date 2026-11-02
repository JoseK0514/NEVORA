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
args = parser.parse_args()
match = re.fullmatch(r'emulator-(\d{4})', args.serial)
if not match or not 5554 <= int(match[1]) <= 5682 or int(match[1]) % 2:
    parser.error('Select an explicitly owned emulator serial, never a physical or implicit device')
if args.only_testing and not re.fullmatch(r'com\.velani\.nevora\.development\.ShellInstrumentedTest(?:#[A-Za-z0-9_]+)?', args.only_testing):
    parser.error('Select a known native instrumentation test')
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
evidence = Path(tempfile.mkdtemp(prefix='nevora-native-android-'))
invocation = uuid.uuid4().hex
(evidence / 'owner').write_text(invocation)
env = {key: value for key, value in os.environ.items() if key in ['PATH', 'HOME', 'TMPDIR', 'LANG', 'JAVA_HOME']}
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
        + [root / 'app/build.gradle', root / 'gradlew', root.parent / 'ios/Fixtures/server.mjs']))
    digest = hashlib.sha256()
    for path in files:
        if path.is_file():
            digest.update(str(path.relative_to(root.parent)).encode() + b'\0' + path.read_bytes())
    return digest.hexdigest()

fixture = None
ports = []
report = {'evidence': str(evidence), 'serial': args.serial, 'passed': False, 'fixtureOnly': True}
try:
    assert device('get-state').stdout.strip() == 'device', 'Selected emulator unavailable'
    assert device('shell', 'getprop', 'ro.kernel.qemu').stdout.strip() == '1', 'Not an emulator'
    before = source_hash()
    report['sourceHash'] = before
    fixture = subprocess.Popen(['node', str(root.parent / 'ios/Fixtures/server.mjs')], env=env, stdout=subprocess.PIPE, text=True)
    with selectors.DefaultSelector() as selector:
        selector.register(fixture.stdout, selectors.EVENT_READ)
        if not selector.select(timeout=5):
            raise RuntimeError('Fixture did not become ready')
        addresses = json.loads(fixture.stdout.readline(4096))
    for key in ['origin', 'unavailableOrigin']:
        url = urlsplit(addresses[key])
        assert url.scheme == 'http' and url.hostname == '127.0.0.1' and url.port and not url.path and not url.query and not url.fragment and not url.username
        ports.append(url.port)
        device('reverse', f'tcp:{url.port}', f'tcp:{url.port}')
    report['fixtureOrigin'] = addresses['origin']
    with (evidence / 'build.log').open('w') as output:
        built = subprocess.run([str(root / 'gradlew'), '--no-daemon', '--project-cache-dir', str(evidence / 'gradle-cache'),
            f'-PnevoraBuildDirectory={evidence / "app-build"}', ':app:assembleDebug', ':app:assembleDebugAndroidTest'],
            cwd=root, env=env, stdout=output, stderr=subprocess.STDOUT, timeout=300)
        if built.returncode:
            raise RuntimeError('Android build failed; see build.log')
    for apk in [evidence / 'app-build/outputs/apk/debug/app-debug.apk', evidence / 'app-build/outputs/apk/androidTest/debug/app-debug-androidTest.apk']:
        device('install', '-r', '-t', str(apk), timeout=60)
    result = device('shell', 'am', 'instrument', '-w', '-e', 'class', args.only_testing or 'com.velani.nevora.development.ShellInstrumentedTest',
        '-e', 'fixtureOrigin', addresses['origin'], '-e', 'unavailableOrigin', addresses['unavailableOrigin'], '-e', 'nativeEvidenceKey', invocation,
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
        assert int(completed[1]) == 8, 'Expected complete eight-test matrix'
        device('shell', 'am', 'force-stop', 'com.velani.nevora.development')
        device('shell', 'am', 'start', '-W', '-n', 'com.velani.nevora.development/.PortalActivity', '--es', 'nevora.debug.origin', addresses['origin'])
        xml_path = f'/data/local/tmp/nevora-native-{invocation}.xml'
        try:
            deadline = time.monotonic() + 25
            while True:
                device('shell', 'uiautomator', 'dump', xml_path, timeout=15)
                hierarchy = device('exec-out', 'cat', xml_path).stdout
                if 'Fictional Owner Home' in hierarchy:
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
