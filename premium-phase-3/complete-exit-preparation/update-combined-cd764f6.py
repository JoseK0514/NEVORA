"""Static-only authorized source rebind. Never launches source tooling or resets cases."""
from pathlib import Path
from collections import Counter
import datetime
import hashlib
import json
import subprocess

out = Path(__file__).parent
root = Path('/workspace/inspect-phase3-final')
old = '8640247be632ee6382c68b3b1ae3bbed532a5d65'
sha = 'cd764f614be8ca5b5215be19d46e07cf968638d7'
old_tree = 'fc83886c2f3d2d7a2f2d6ef6894aedf469f01ac1'
tree = '64bc4c24afac005ce5270b3d65112a797b59b511'
git = lambda *args: subprocess.check_output(['git', *args], cwd=root, text=True).strip()
assert git('rev-parse', 'HEAD') == sha
assert git('rev-parse', 'HEAD^{tree}') == tree
assert not git('status', '--porcelain', '--untracked-files=no')
changed = git('diff', '--name-only', old, sha).splitlines()
assert changed == ['src/app/app/exchange/callout/page.test.tsx', 'src/components/kit/kit.css']
archive = out / 'freeze-history/8640247-preparation'
assert (archive / 'snapshot-manifest.json').exists()
now = datetime.datetime.now(datetime.timezone.utc).isoformat()

def write(name, value):
    (out / name).write_text(json.dumps(value, indent=2) + '\n')

def rebind(value):
    if isinstance(value, str):
        return value.replace(old, sha).replace(old_tree, tree)
    if isinstance(value, list):
        return [rebind(item) for item in value]
    if isinstance(value, dict):
        return {key: rebind(item) for key, item in value.items()}
    return value

active = ['candidate-fix-ledger.json', 'full-exit-joblist.json', 'manual-queue.json',
          'prior-findings-ledger.json', 'all-route-placeholder-inventory.json',
          'fixture-preparation.json', 'normal-shared-scope.json',
          'large-shared-scope.json', 'baseline-dry-run.json']
for name in active:
    value = rebind(json.loads((out / name).read_text()))
    if name == 'full-exit-joblist.json':
        value['acceptedFixBase']['provenanceAssessment'] = 'freeze-update-cd764f6.json'
        value['staticCandidateAudit']['all135Crosswalk'] = 'historical-all-135-crosswalk-cd764f6.json'
    if name == 'fixture-preparation.json':
        for source in value['sourceHashes']:
            assert hashlib.sha256((root / source).read_bytes()).hexdigest() == value['sourceHashes'][source]
    write(name, value)

for suffix in ['json', 'md']:
    source = out / f'historical-all-135-crosswalk-8640247.{suffix}'
    target = out / f'historical-all-135-crosswalk-cd764f6.{suffix}'
    if suffix == 'json':
        value = rebind(json.loads(source.read_text()))
        value['previousReviewedSHA'] = old
        value['createdAt'] = now
        value['sourceRebind'] = {'changedFiles': changed, 'sourceFindingCriteriaChanged': False,
                                 'currentRuntimeEvidence': False}
        write(target.name, value)
    else:
        target.write_text(source.read_text().replace(old, sha).replace('8640247', 'cd764f6') +
                          '\nSource rebind only: the descendant changes callout test mocking and removes a redundant kit selector. No inspected criteria or runtime evidence changed. The prior864 audit remains preserved.\n')
(out / 'candidate-findings-cd764f6.md').write_text(
    (out / 'candidate-findings-8640247.md').read_text().replace(old, sha) +
    '\nRechecked by exact source diff: neither communications parser nor Updates View changed between864 and this descendant. This remains static evidence; fresh browser measurement is pending.\n')

p = out / 'scripts/build-plan.py'
p.write_text(p.read_text().replace(old, sha)
             .replace('freeze-update-8640247.json', 'freeze-update-cd764f6.json')
             .replace('historical-all-135-crosswalk-8640247.json', 'historical-all-135-crosswalk-cd764f6.json'))

p = out / 'scope-reconciliation-aa5e07e.json'
value = json.loads(p.read_text())
value['currentCandidateTarget'] = sha
value['currentTargetNote'] = 'Exact corrected combined Claude4aaa + accepted33 descendant; no current runtime results. Unique source/role/viewport/text/engine/dataset dimensions unchanged.'
write(p.name, value)

p = out / 'README.md'
text = p.read_text().replace(old, sha).replace(old_tree, tree)
text = text.replace("Its parents are Claude's all-six integration `4aaa793` and the accepted candidate `b68f250` with **33 finding commits**.",
                    "It descends from combined864, whose parents are Claude's all-six integration `4aaa793` and accepted candidate `b68f250` with **33 finding commits**. The corrected descendant restores kit.css byte-for-byte to Claude4aaa (the existing coordinator selector already covers the opacity rule) and retains actual PendingLabel in the callout test mock; no fixture/backend/checker/portal/criteria changed.")
text = text.replace('combined864 passes', 'current combined passes')
text = text.replace('phase3-combined-864', 'phase3-combined-cd764f6').replace('round-5-8640247-full', 'round-5-cd764f6-full')
text = text.replace('Older9ec preparation files', 'The complete prior864 preparation snapshot is preserved in `freeze-history/8640247-preparation/` with a file-hash manifest. Older9ec preparation files')
p.write_text(text)

queue = json.loads((out / 'manual-queue.json').read_text())
prior_queue = json.loads((archive / 'manual-queue.json').read_text())
assert len(queue['cases']) == 1546
assert queue['sha'] == sha
assert [row['id'] for row in queue['cases']] == [row['id'] for row in prior_queue['cases']]
assert all(row['status'] == 'pending' and not row['evidence'] for row in queue['cases'])
prior = json.loads((out / 'prior-findings-ledger.json').read_text())
assert prior['count'] == len(prior['findings']) == 135
fixes = json.loads((out / 'candidate-fix-ledger.json').read_text())
assert fixes['commitCount'] == len(fixes['commits']) == 33
assert fixes['candidate'] == 'b68f250129e2d21731624652e0aad7412b042bc3'
plan = json.loads((out / 'full-exit-joblist.json').read_text())
assert plan['reconciledPhoneBaselineCells'] == 5280
assert plan['baseline']['cells'] == 4480 and plan['largeData']['cells'] == 320
assert plan['sharedManagementNormalSupplement']['cells'] == 480
assert plan['readStateSweeps']['sequences'] == 384
assert plan['readStateSweeps']['maximumStateObservations'] == 3856

receipt = rebind(json.loads((archive / 'preparation-receipt.json').read_text()))
receipt.update({'parents': git('show', '--format=%P', '--no-patch', 'HEAD').split(),
                'integrationBase': old, 'previousSourceSnapshot': 'freeze-history/8640247-preparation/',
                'createdAt': now, 'internallyConsistentStaticFreezeAt': now,
                'all135StaticCrosswalk': 'historical-all-135-crosswalk-cd764f6.json',
                'scriptSyntaxOrAppTestsRunOn864': False,
                'scriptSyntaxOrAppTestsRunOnCurrentSource': False,
                'all1546PriorManualIDsPreserved': True,
                'manualStageCounts': dict(Counter(row['stage'] for row in queue['cases'])),
                'rebind': {'fromSource': old, 'changedFiles': changed,
                           'kind': 'static preparation/source reference rebind only',
                           'appEdits': False, 'criteriaChanges': False,
                           'previewStarted': False, 'browserStarted': False,
                           'runtimeTestsRun': False, 'resourceRelease': 'not yet granted'}})
receipt['scriptHashes'] = {name: hashlib.sha256((out / name).read_bytes()).hexdigest()
                           for name in receipt['scriptHashes']}
assert receipt['baselineCheckerSha256'] == hashlib.sha256((root / 'scripts/ui-checks/checks.mjs').read_bytes()).hexdigest()
write('preparation-receipt.json', receipt)
write('freeze-update-cd764f6.json', receipt)
print(json.dumps({'source': sha, 'tree': tree, 'baselineCells': 5280,
                  'manualRows': len(queue['cases']), 'priorIDs': len(prior['findings']),
                  'archive': str(archive), 'previewStarted': False, 'browserStarted': False,
                  'runtimeTestsRun': False, 'resourceRelease': 'not yet granted'}, indent=2))
