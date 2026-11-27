#!/usr/bin/env bash
# Retire the helper branches (Jose, Nov 26, 2026; refreshed Nov 27). Run from a clone of JoseK0514/NEVORA with push access.
# Keeps main, development and claude-codex-collab-nevora. This run retires 36 branches; -qa and -screens-final are still
# in use (QA evidence, guide builds) and are retired after the final guide build by re-running with them added back.
# Step 1 tags each branch at the exact commit recorded here, step 2 checks every tag on GitHub, and step 3 deletes a
# branch only when its tag matches and the branch has not moved since. Safe to re-run.
set -euo pipefail

git fetch --prune origin
D=archive/branches/2026-11-26
ok=0; skip=0
while read -r b sha; do
  cur=$(git rev-parse -q --verify "refs/remotes/origin/$b" || true)
  if [ -z "$cur" ]; then echo "gone already: $b"; continue; fi
  if [ "$cur" != "$sha" ]; then echo "MOVED, skipping: $b (now $cur, expected $sha)"; skip=$((skip+1)); continue; fi
  git tag -f "$D/$b" "$sha" >/dev/null
  git push -q origin "refs/tags/$D/$b"
  remote=$(git ls-remote origin "refs/tags/$D/$b" | cut -f1)
  if [ "$remote" != "$sha" ]; then echo "TAG NOT VERIFIED, not deleting: $b"; skip=$((skip+1)); continue; fi
  git push -q origin --delete "$b"
  echo "retired: $b -> $D/$b ($sha)"; ok=$((ok+1))
done <<EOF
claude-codex-collab-nevora-account ba21804201cd30d0d29114b2e63e8b157e59f4f0
claude-codex-collab-nevora-alerts ee222b0da2eb35f40f9e006f0f5f2d7f73e8e473
claude-codex-collab-nevora-batch-clocker 743212e8cce365ea269c703fa200563d64f4f66d
claude-codex-collab-nevora-batch-nav c5d8273e14f9061e925739e62a3034298f9782a4
claude-codex-collab-nevora-batch-public 11574da9cc25e25c0d465b2c10a113af9a3da0b7
claude-codex-collab-nevora-batch-time-team 7c00717aa3afdc84c75da9e8550823792445d9f9
claude-codex-collab-nevora-clocker-states c215ae9e3e9fb44ed6a8dcf85a038d6db0e1fed1
claude-codex-collab-nevora-core e2c0e8d9fbe2ec084dbc9330aa34ccf437c6bc82
claude-codex-collab-nevora-core-options 9943126429dd0ab1ce8aa2735bae2635536d6f14
claude-codex-collab-nevora-ds-pages 53e1e67f295ef84e878d2eae0e800b61531f2a47
claude-codex-collab-nevora-es-employee 84e8109b3ef8eec100cc0c0e26880e772b239403
claude-codex-collab-nevora-es-mobile 2cd9ed8cdeafcf3c0dfc4b23027ecd51a8352dc5
claude-codex-collab-nevora-es-owner 6de7c2dc234498f55915def4b57b46cdb748f698
claude-codex-collab-nevora-es-payroll 89824b49d72d18380d4a2206e425b37f2527e276
claude-codex-collab-nevora-es-rest eced81af42d78c15e927886653dd3dbae966d7fd
claude-codex-collab-nevora-es-rondo 9ceeb06ec2a9d8361d7df95ae4d288d0a418f123
claude-codex-collab-nevora-kit-final 2f3e56177a9049363af89157582c67f7dc24cf37
claude-codex-collab-nevora-messages 867fdc8766a6a7af803ece27b7228281d6f19e01
claude-codex-collab-nevora-messages-2 170d012272d95c44a4f73cc11f1e1627dc2840be
claude-codex-collab-nevora-payroll-2 d9282e7191beb86505c9d0696800702b1097885f
claude-codex-collab-nevora-prodcheck 19c9b09fe482bb21035ee3a0fe7132bc8b13bdf4
claude-codex-collab-nevora-profile a25021850a460f47c1f38874463dc4d955d4de73
claude-codex-collab-nevora-requests-account ea2601e589a26806d9ab39a82e661710ab20c2cc
claude-codex-collab-nevora-rondo 8a400c4213c23ab9dceb2b63aa0157574cad6665
claude-codex-collab-nevora-schedule-tools a2381a1671c9b51cd246d4ec447b78da5f96579c
claude-codex-collab-nevora-schedule-tools-2 dcc12231d4cc93b919c09235e97671625e757dd1
claude-codex-collab-nevora-settings-2 5032ed10b57321922934bfd95e4bc24445de197d
claude-codex-collab-nevora-settings-base cbc3d4bc7287b7beffb9d0fcc327824e579b6133
claude-codex-collab-nevora-settings-billing 528f77995e9f5ba41ac8f3a6f32ebc48e9ed8b9a
claude-codex-collab-nevora-settings-final 109e6acc8121eec07449b207360e995f820842a8
claude-codex-collab-nevora-settings-locations 0e21bbbcaacfe8a1af73c8d096073fd4e228a2b5
claude-codex-collab-nevora-settings-policies 27a6143487f614748b36be9010da57594c4d5d73
claude-codex-collab-nevora-settings-positions db6508e85d38bbf5742e15a689fb3706237db1d4
claude-codex-collab-nevora-staff 83a43d0031f1957bb44856ddecf19ee83a78f1b6
claude-codex-collab-nevora-sweep-1 156a1735574e7e31576a9f56efc7e6577fa2a7f8
claude-codex-collab-nevora-timecards-final 8e9c11eada97c532a69496963132be4eae3b2b04
EOF
echo "retired $ok, skipped $skip"
git ls-remote --heads origin | sed "s|.*refs/heads/||"   # expected: claude-codex-collab-nevora, development, main
