import os, subprocess
keys=['PATH','HOME','TMPDIR','LANG','NEVORA_TEST_PG_BIN']
env={k:os.environ[k] for k in keys if k in os.environ}
env['NODE_ENV']='test'
commands=[['node','node_modules/vitest/vitest.mjs','run','src/lib/native-push','src/test/native-push-regression-config.test.ts','src/app/api/mobile/v1/notifications','src/app/api/mobile/v1/session/route.test.ts','src/test/migration-order.test.ts','src/lib/auth/session.test.ts','src/lib/notifications','src/lib/data/push-subscriptions.test.ts','src/lib/data/push-deliveries.test.ts','--maxWorkers=1'],['node','scripts/payroll-postgres.mjs','vitest.native-push-regressions.config.mts']]
for command in commands: subprocess.run(command,env=env,check=True)
