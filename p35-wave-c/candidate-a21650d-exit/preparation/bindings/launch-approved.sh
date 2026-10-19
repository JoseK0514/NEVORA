#!/usr/bin/env bash
set -euo pipefail
[[ "${WC_RESOURCE_RELEASE:-}" == runtime-setup-released ]] || { echo 'Wave C launch is held until runtime_setup explicitly releases capacity.' >&2; exit 1; }
[[ "${READY_REVIEW_RELEASED_SHA:-}" == a21650de50374683d52e32b883d7f419d7344f22 ]] || { echo 'Exact Wave C source release is required.' >&2; exit 1; }
python3 - <<'PY'
from pathlib import Path
import json,hashlib,subprocess
root=Path('/workspace/nevora-inspections/p35-wave-c/candidate-a21650d-exit/preparation')
config=json.loads((root/'runtime-config-hashes.json').read_text())
for path,expected in config['helperInputs'].items():
 assert hashlib.sha256(Path(path).read_bytes()).hexdigest()==expected,'Runtime helper input changed: '+path
ext=config['extension'];assert hashlib.sha256(Path(ext['path']).read_bytes()).hexdigest()==ext['sha256'],'Wave C extension changed'
source='/workspace/inspect-wave-c-candidate-a21650d'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()==config['checkpoint']
assert not subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=source,text=True).strip()
PY
export PREVIEW_SOURCE=/workspace/inspect-wave-c-candidate-a21650d
export PREVIEW_OUT=${PREVIEW_OUT:-/workspace/paused-previews/wave-c-candidate-a21650d}
export PREVIEW_OWNER=wave-c-a21650d
export NEVORA_PREVIEW_TMP=${NEVORA_PREVIEW_TMP:-/workspace/paused-previews/pg}
export INSPECTION_FIXTURE_MODE=${INSPECTION_FIXTURE_MODE:-normal}
export INSPECTION_INITIAL_EXTENSION=/workspace/nevora-inspections/p35-wave-c/candidate-a21650d-exit/preparation/bindings/initial-extension.mts
export INSPECTION_INITIAL_EXTENSION_EXPORT=seedInitialWaveCBrandHistory
exec bash /workspace/nevora-inspection-runtime/launch-before-listen.sh
