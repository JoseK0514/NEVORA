"""Own fixture ports, derived data and test results for one simulator run."""
from pathlib import Path
import argparse
import fcntl
import json
import plistlib
import subprocess
import tempfile
import uuid

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--simulator', required=True, help='UUID of a disposable test simulator')
parser.add_argument('--only-testing', action='append', default=[], help='Explicit XCTest identifier to run (repeatable)')
args = parser.parse_args()
try:
    args.simulator = str(uuid.UUID(args.simulator)).upper()
except ValueError:
    parser.error('Simulator must be an explicit UUID')
# A simulator is mutable shared state even when fixture ports are isolated.
# Keep the inode stable and the descriptor held until this invocation exits.
simulator_lock = (Path(tempfile.gettempdir()) / f'nevora-native-simulator-{args.simulator}.lock').open('a+')
try:
    fcntl.flock(simulator_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    parser.error('Simulator is already in use by another native test invocation')
root = Path(__file__).resolve().parent
evidence = Path(tempfile.mkdtemp(prefix='nevora-native-ui-'))
fixture = subprocess.Popen(['node', str(root / 'Fixtures/server.mjs')], stdout=subprocess.PIPE, text=True)
try:
    addresses = json.loads(fixture.stdout.readline())
    destination = f'platform=iOS Simulator,id={args.simulator}'
    with (evidence / 'build.log').open('w') as log:
        subprocess.run(['xcodebuild', '-project', str(root / 'NEVORA.xcodeproj'), '-scheme', 'NEVORA',
                        '-configuration', 'Debug', '-destination', destination,
                        '-derivedDataPath', str(evidence / 'DerivedData'),
                        'CODE_SIGNING_ALLOWED=NO', 'build-for-testing'], check=True, stdout=log, stderr=subprocess.STDOUT, timeout=300)
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
        'NEVORA_NATIVE_FIXTURE_ORIGIN': addresses['origin'],
        'NEVORA_NATIVE_UNAVAILABLE_ORIGIN': addresses['unavailableOrigin']})
    owned_plan = products / 'InvocationOwned.xctestrun'
    owned_plan.write_bytes(plistlib.dumps(plan))
    with (evidence / 'tests.log').open('w') as log:
        result = subprocess.run(['xcodebuild', 'test-without-building', '-xctestrun', str(owned_plan),
                                 '-destination', destination, '-parallel-testing-enabled', 'NO',
                                 '-resultBundlePath', str(evidence / 'tests.xcresult'),
                                 *[f'-only-testing:{test}' for test in args.only_testing]],
                                stdout=log, stderr=subprocess.STDOUT, timeout=600)
    print(json.dumps({'evidence': str(evidence), 'passed': result.returncode == 0}))
    raise SystemExit(result.returncode)
finally:
    fixture.terminate()
    try:
        fixture.wait(timeout=5)
    except subprocess.TimeoutExpired:
        fixture.kill()
        fixture.wait()
