BEGIN;
-- Empty in legacy mode. Only isolated, freshly provisioned companies receive an anchor.
CREATE TABLE onboarding_workspace_identity(
 workspace_id text PRIMARY KEY REFERENCES workspaces(id),
 singleton boolean NOT NULL UNIQUE DEFAULT true CHECK(singleton),
 environment text NOT NULL CHECK(environment IN('test','development','production')),
 incarnation bigint NOT NULL CHECK(incarnation>0),
 provider_project_id text NOT NULL,
 lifecycle text NOT NULL CHECK(lifecycle IN('OWNER_ACTIVATION_REQUIRED','ACTIVE','SUSPENDED','QUARANTINED')),
 lock_token boolean NOT NULL DEFAULT true CHECK(lock_token)
);
CREATE TABLE onboarding_runtime_roles(
 kind text PRIMARY KEY CHECK(kind IN('APP','WORKER')),
 login_role name NOT NULL UNIQUE
);
REVOKE ALL ON onboarding_workspace_identity,onboarding_runtime_roles FROM PUBLIC;
COMMIT;
