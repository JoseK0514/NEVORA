#!/usr/bin/env bash
# Start one disposable collab QA workspace and retain evidence after cleanup.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
if [[ "$(id -u)" == 0 ]]; then
  echo "Run from a workspace owned by a non-root user. PostgreSQL initdb refuses root." >&2
  exit 1
fi
if [[ -z "${NEVORA_TEST_PG_BIN:-}" ]] && command -v pg_config >/dev/null; then
  export NEVORA_TEST_PG_BIN="$(pg_config --bindir)"
fi
if [[ ! -x "${NEVORA_TEST_PG_BIN:-}/initdb" ]]; then
  echo "Set NEVORA_TEST_PG_BIN to the absolute PostgreSQL binaries directory." >&2
  exit 1
fi
ready_attempts=240
if [[ "${1:-}" == --production ]]; then
  shift
  case "${1:-}" in
    --scoped-manager|--serve|--inventory|--inventory-only|--signup-only|--full) ;;
    *) echo "Use --production with --full, --inventory, --inventory-only, --signup-only, --scoped-manager, or --serve." >&2; exit 1 ;;
  esac
  export NEVORA_COLLAB_PRODUCTION=1
  ready_attempts=600
fi
evidence="$(mktemp -d "${TMPDIR:-/tmp}/nevora-collab-qa.XXXXXXXX")"
echo "Collab QA evidence directory $evidence"
node_flags=(--conditions=react-server --import ./scripts/node-server-context.mjs --import tsx)
node "${node_flags[@]}" scripts/rondo-local.mts "$evidence" --collab > "$evidence/launcher.log" 2>&1 &
launcher=$!
cleanup() {
  kill -TERM "$launcher" 2>/dev/null || true
  wait "$launcher" || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# The runtime manifest is published only after migrations, server startup and
# fictional test data are ready. Leave the next log in the evidence directory.
for ((attempt=0; attempt<ready_attempts; attempt++)); do
  [[ -s "$evidence/runtime.json" ]] && break
  if ! kill -0 "$launcher" 2>/dev/null; then
    echo "Collab workspace stopped during startup. See $evidence/launcher.log." >&2
    exit 1
  fi
  sleep 1
done
if [[ ! -s "$evidence/runtime.json" ]]; then
  echo "Collab workspace timed out during startup. See $evidence/launcher.log." >&2
  exit 1
fi

if [[ "${1:-}" == --serve && $# == 1 ]]; then
  cat "$evidence/launcher.log"
  wait "$launcher"
elif [[ "${1:-}" == --full && $# == 1 ]]; then
  status=0
  node "${node_flags[@]}" scripts/ui-checks/collab-browser.mjs "$evidence" --inventory --screenshots || status=1
  cleanup
  trap - EXIT
  mkdir "$evidence/central-billing" "$evidence/step4-local"
  NEVORA_CENTRAL_BILLING_EVIDENCE="$evidence/central-billing" node scripts/onboarding-owned.mjs --suite central-billing || status=1
  NEVORA_STEP4_EVIDENCE="$evidence/step4-local" node scripts/onboarding-owned.mjs --suite step4-local || status=1
  exit "$status"
else
  node "${node_flags[@]}" scripts/ui-checks/collab-browser.mjs "$evidence" "$@"
fi
