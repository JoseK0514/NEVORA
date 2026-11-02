"""Own fixture ports, derived data and test results for one simulator run."""
from pathlib import Path
import argparse
import fcntl
import hashlib
import json
import os
import plistlib
import subprocess
import tempfile
import uuid
from urllib.parse import urlsplit

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--simulator', required=True, help='UUID of a disposable test simulator')
parser.add_argument('--only-testing', action='append', default=[], help='Explicit XCTest identifier to run (repeatable)')
parser.add_argument('--mode', choices=['transport', 'owned-backend'], default='transport')
parser.add_argument('--backend-origin')
parser.add_argument('--backend-control-origin')
parser.add_argument('--backend-owner')
parser.add_argument('--expected-sha')
parser.add_argument('--evidence-root')
args = parser.parse_args()
try:
    args.simulator = str(uuid.UUID(args.simulator)).upper()
except ValueError:
    parser.error('Simulator must be an explicit UUID')
backend = args.mode == 'owned-backend'
backend_values = [args.backend_origin, args.backend_control_origin, args.backend_owner, args.expected_sha, args.evidence_root]
if backend:
    if args.only_testing or not all(backend_values) or len(args.backend_owner) != 32 or len(args.expected_sha) != 40 or any(c not in '0123456789abcdef' for c in args.backend_owner + args.expected_sha):
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
# A simulator is mutable shared state even when fixture ports are isolated.
# Keep the inode stable and the descriptor held until this invocation exits.
simulator_lock = (Path(tempfile.gettempdir()) / f'nevora-native-simulator-{args.simulator}.lock').open('a+')
try:
    fcntl.flock(simulator_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    parser.error('Simulator is already in use by another native test invocation')
root = Path(__file__).resolve().parent
evidence = Path(tempfile.mkdtemp(prefix='nevora-native-ui-', dir=args.evidence_root if backend else None))
env = {key: value for key, value in os.environ.items() if key in ['PATH','HOME','TMPDIR','LANG','NEVORA_OWNED_PROCESS_OWNER']}
def source_hash():
    files = [root / 'Package.swift', root / 'NEVORA.xcodeproj/project.pbxproj', root / 'generate-project.py', root / 'test-ui.py', root / 'Fixtures/server.mjs', root.parent.parent / 'src/lib/native-shell/security.ts']
    for pattern in ['App/*.swift','Sources/**/*.swift','Tests/**/*.swift','UITests/*.swift','Configuration/*.plist']:
        files.extend(root.glob(pattern))
    digest = hashlib.sha256()
    for path in sorted(set(files)):
        if path.is_file(): digest.update(str(path.relative_to(root.parent.parent)).encode() + b'\0' + path.read_bytes())
    return digest.hexdigest()
def assert_source():
    if backend:
        assert not evidence.is_relative_to(root.parent.parent), 'Evidence cannot be inside source'
        assert subprocess.check_output(['git','-C',str(root.parent.parent),'rev-parse','HEAD'],env=env,text=True).strip() == args.expected_sha
        assert not subprocess.check_output(['git','-C',str(root.parent.parent),'status','--porcelain=v1'],env=env,text=True).strip()
fixture = None
report = {'evidence': str(evidence), 'passed': False, 'fixtureOnly': not backend, 'checkpoint': args.expected_sha, 'simulator': args.simulator, 'ownerId': args.backend_owner}
try:
    assert_source(); before = source_hash(); report['sourceHash'] = before
    if backend:
        addresses = {'origin': args.backend_origin}
    else:
        fixture = subprocess.Popen(['node', str(root / 'Fixtures/server.mjs')], env=env, stdout=subprocess.PIPE, text=True)
        addresses = json.loads(fixture.stdout.readline())
    report['origin'] = addresses['origin']
    destination = f'platform=iOS Simulator,id={args.simulator}'
    with (evidence / 'build.log').open('w') as log:
        subprocess.run(['xcodebuild', '-project', str(root / 'NEVORA.xcodeproj'), '-scheme', 'NEVORA',
                        '-configuration', 'Debug', '-destination', destination,
                        '-derivedDataPath', str(evidence / 'DerivedData'),
                        'CODE_SIGNING_ALLOWED=NO', 'build-for-testing'], env=env, check=True, stdout=log, stderr=subprocess.STDOUT, timeout=300)
    products = evidence / 'DerivedData/Build/Products'
    inputs = list(products.glob('*.xctestrun'))
    if len(inputs) != 1:
        raise RuntimeError('Expected exactly one generated XCTest configuration')
    plan = plistlib.loads(inputs[0].read_bytes())
    if 'TestConfigurations' in plan:
        targets = [target for config in plan['TestConfigurations'] for target in config['TestTargets']]
    else:
        targets = [value for value in plan.values() if isinstance(value, dict) and 'TestBundlePath' in value]
    if len(targets) != 1:
        raise RuntimeError('Unexpected test targets')
    targets[0].setdefault('EnvironmentVariables', {}).update({
        'NEVORA_NATIVE_BACKEND_ORIGIN': addresses['origin'], 'NEVORA_NATIVE_CONTROL_ORIGIN': args.backend_control_origin,
        'NEVORA_NATIVE_TEST_OWNER': args.backend_owner} if backend else {
        'NEVORA_NATIVE_FIXTURE_ORIGIN': addresses['origin'], 'NEVORA_NATIVE_UNAVAILABLE_ORIGIN': addresses['unavailableOrigin']})
    owned_plan = products / 'InvocationOwned.xctestrun'
    owned_plan.write_bytes(plistlib.dumps(plan))
    with (evidence / 'tests.log').open('w') as log:
        result = subprocess.run(['xcodebuild', 'test-without-building', '-xctestrun', str(owned_plan),
                                 '-destination', destination, '-parallel-testing-enabled', 'NO',
                                 '-resultBundlePath', str(evidence / 'tests.xcresult'),
                                 *[f'-only-testing:{test}' for test in (args.only_testing or ['NevoraUITests/NevoraBackendUITests' if backend else 'NevoraUITests/NevoraUITests'])]],
                                env=env, stdout=log, stderr=subprocess.STDOUT, timeout=600)
    assert_source(); assert source_hash() == before, 'Native/fixture source changed during verification'
    if result.returncode == 0:
        summary = json.loads(subprocess.check_output(['xcrun','xcresulttool','get','test-results','summary','--path',str(evidence/'tests.xcresult'),'--compact'],env=env,text=True,timeout=20))
        (evidence/'summary.json').write_text(json.dumps(summary,indent=2))
        assert summary['failedTests'] == 0 and summary['skippedTests'] == 0 and summary['passedTests'] > 0
        if backend: assert summary['passedTests'] == 2
        report['instrumentationTests'] = summary['passedTests']
        report['passed'] = True
    raise SystemExit(result.returncode)
finally:
    if fixture:
        fixture.terminate()
        try:
            fixture.wait(timeout=5)
        except subprocess.TimeoutExpired:
            fixture.kill(); fixture.wait()
    (evidence / 'result.json').write_text(json.dumps(report,indent=2) + '\n')
    print(json.dumps(report))
