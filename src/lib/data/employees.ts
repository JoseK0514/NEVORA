import {assertOperationalAccess,operationalScopeStatements} from '../company-access/operational-scope.server';
import { getDb, queryRows } from "@/lib/db";
import type { Employee, UserRole } from "@/lib/domain";
import type { SqlExecutor, SqlStatement } from "../notifications/types";
import { neonNotificationExecutor } from "./notification-transactions";
import { getWorkspace, workspaceReadGuard } from "./workspaces";
import { employeePositionMembershipStatements } from "./positions";
import type { SessionMutationProof } from '../shift-changes/types';
import { assertManagementProof, managementSessionStatements } from './management-session';

type EmployeeRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  role: UserRole;
  primary_location_id: string;
  active: boolean;
  eligible_location_ids: string[] | null;
  position_ids: string[] | null;
};

type EmployeeManagementRow = EmployeeRow & {
  updated_at: string;
};

export type EmployeeManagementProfile = Employee & {
  updatedAt: string;
};

export async function listEmployees(executor?: SqlExecutor): Promise<Employee[]> {
  const text = `SELECT
       e.id,
       e.first_name,
       e.last_name,
       e.phone,
       e.email,
       e.role,
       e.primary_location_id,
       e.active,
       ARRAY(SELECT ep.position_id FROM employee_positions ep WHERE ep.employee_id = e.id ORDER BY ep.position_id) AS position_ids,
       COALESCE(
         array_agg(elig.location_id ORDER BY elig.location_id)
           FILTER (WHERE elig.location_id IS NOT NULL),
         ARRAY[]::text[]
       ) AS eligible_location_ids
     FROM employees e
     LEFT JOIN employee_location_eligibility elig
       ON elig.employee_id = e.id
     GROUP BY
       e.id,
       e.first_name,
       e.last_name,
       e.phone,
       e.email,
       e.role,
       e.primary_location_id,
       e.active
     ORDER BY e.active DESC, e.first_name, e.last_name`;
  const rows = executor
    ? await executor.query<EmployeeRow>({ text, values: [] })
    : (await getDb().query(text)) as EmployeeRow[];

  return rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email ?? undefined,
    role: row.role,
    primaryLocationId: row.primary_location_id,
    eligibleLocationIds: row.eligible_location_ids ?? [],
    positionIds: row.position_ids ?? [],
    active: row.active,
  }));
}

export { listLocations } from './locations';

export async function findEmployeeCredential(employeeId: string) {
  const sql = getDb();
  const rows = queryRows<{
    id: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    primary_location_id: string;
    active: boolean;
    password_hash: string;
    must_change_password: boolean;
    updated_at: string;
    password_updated_at: string;
  }>(
    await sql.query(
      `SELECT
         e.id,
         e.first_name,
         e.last_name,
         e.role,
         e.primary_location_id,
         e.active,
         c.password_hash,
         c.must_change_password,
         e.updated_at::text AS updated_at,
         c.password_updated_at::text AS password_updated_at
       FROM employees e
       JOIN employee_credentials c ON c.employee_id = e.id
       WHERE upper(e.id) = upper($1)
       LIMIT 1`,
      [employeeId],
    ),
  );

  return rows[0];
}

export type EmployeeCreationMutationInput = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  role: UserRole;
  primaryLocationId: string;
  eligibleLocationIds: string[];
  passwordHash?: string;
  positionIds?: readonly string[];
  actorEmployeeId: string;
  proof: SessionMutationProof;
};

export async function prepareEmployeeCreationMutation(input: EmployeeCreationMutationInput, executor?: SqlExecutor) {
  assertManagementProof(input.proof, input.actorEmployeeId);
  const sql = executor ?? neonNotificationExecutor();
  const workspace = await getWorkspace(sql);
  const eligible = [...new Set([input.primaryLocationId, ...input.eligibleLocationIds])].sort();
  const positions = [...new Set(input.positionIds ?? [])].sort();
  if (!["OWNER", "MANAGER", "LEAD", "EMPLOYEE"].includes(input.role)) throw new Error('Choose an access role.');
  const guards: SqlStatement[] = [
    ...workspaceReadGuard(workspace),
    { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR UPDATE', values: [input.actorEmployeeId] },
    { text: `SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees WHERE id=$1 AND active=true AND role IN ('OWNER','MANAGER') AND ($2<>'OWNER' OR role='OWNER')) THEN '1' ELSE 'employee_creation_permission_denied' END)::integer`, values: [input.actorEmployeeId, input.role] },
    { text: 'SELECT id FROM locations WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', values: [eligible] },
    { text: `SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM unnest($1::text[]) requested(id) LEFT JOIN locations l ON l.id=requested.id WHERE l.id IS NULL OR NOT l.active OR l.workspace_id<>$2) THEN '1' ELSE 'employee_location_invalid' END)::integer`, values: [eligible, workspace.id] },
    { text: 'SELECT id FROM positions WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', values: [positions] },
    { text: `SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM unnest($1::text[]) requested(id) LEFT JOIN positions p ON p.id=requested.id WHERE p.id IS NULL OR NOT p.active OR p.workspace_id<>$2) THEN '1' ELSE 'employee_position_invalid' END)::integer`, values: [positions, workspace.id] },
    ...managementSessionStatements(input.proof, input.actorEmployeeId),
  ];
  const writes: SqlStatement[] = [
    { text: 'INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES($1,$2,$3,$4,$5,$6,$7)', values: [input.id, input.firstName, input.lastName, input.phone, input.email ?? null, input.role, input.primaryLocationId] },
    ...eligible.map(locationId => ({ text: 'INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES($1,$2)', values: [input.id, locationId] })),
    ...employeePositionMembershipStatements({ employeeId: input.id, positionIds: positions }),
  ];
  if (input.passwordHash) writes.push({ text: 'INSERT INTO employee_credentials(employee_id,password_hash) VALUES($1,$2)', values: [input.id, input.passwordHash] });
  return { workspace, guards, writes, finalAuthority: managementSessionStatements(input.proof, input.actorEmployeeId) };
}

export async function insertEmployee(input: EmployeeCreationMutationInput, executor?: SqlExecutor) {
  const sql = executor ?? neonNotificationExecutor();
  const batch = await prepareEmployeeCreationMutation(input, sql);
  await sql.transaction([...batch.guards, ...batch.writes, ...batch.finalAuthority]);
}

/** Retired knowledge-only first activation. Public initialization requires invitation possession. */
export async function activateEmployeeCredential(_input: {employeeId:string;phone:string;passwordHash:string}):Promise<null> {
  return null;
}

export async function getEmployeeActivationState(employeeId: string) {
  const sql = getDb();
  const rows = queryRows<{
    id: string;
    active: boolean;
    has_credential: boolean;
  }>(
    await sql.query(
      `SELECT
         e.id,
         e.active,
         EXISTS (
           SELECT 1
           FROM employee_credentials c
           WHERE c.employee_id = e.id
         ) AS has_credential
       FROM employees e
       WHERE upper(e.id) = upper($1)
       LIMIT 1`,
      [employeeId],
    ),
  );

  return rows[0] ?? null;
}

export async function getEmployeeManagementProfile(
  employeeId: string,
  executor?: SqlExecutor,
): Promise<EmployeeManagementProfile | null> {
  const text = `SELECT
      e.id,
      e.first_name,
      e.last_name,
      e.phone,
      e.email,
      e.role,
      e.primary_location_id,
      e.active,
      e.updated_at::text AS updated_at,
      ARRAY(
        SELECT elig.location_id
        FROM employee_location_eligibility elig
        WHERE elig.employee_id=e.id
        ORDER BY elig.location_id
      ) AS eligible_location_ids,
      ARRAY(
        SELECT ep.position_id
        FROM employee_positions ep
        WHERE ep.employee_id=e.id
        ORDER BY ep.position_id
      ) AS position_ids
    FROM employees e
    WHERE e.id=$1
    LIMIT 1`;
  const rows = executor
    ? await executor.query<EmployeeManagementRow>({ text, values: [employeeId] })
    : queryRows<EmployeeManagementRow>(await getDb().query(text, [employeeId]));
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email ?? undefined,
    role: row.role,
    primaryLocationId: row.primary_location_id,
    eligibleLocationIds: row.eligible_location_ids ?? [],
    positionIds: row.position_ids ?? [],
    active: row.active,
    updatedAt: row.updated_at,
  };
}

export type EmployeeCoreMutationInput = {
    employeeId: string;
    expectedUpdatedAt: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    role: UserRole;
    primaryLocationId: string;
    active: boolean;
    actorEmployeeId: string;
    proof: SessionMutationProof;
  };

export async function prepareEmployeeProfileMutation(input: EmployeeCoreMutationInput, executor?: SqlExecutor) {
  assertManagementProof(input.proof, input.actorEmployeeId);
  if (!["OWNER", "MANAGER", "LEAD", "EMPLOYEE"].includes(input.role)) {
    throw new Error("employee_profile_invalid_role");
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = input.phone.trim();
  const email = input.email?.trim() || null;
  if (
    !input.employeeId ||
    !input.expectedUpdatedAt ||
    !firstName ||
    !lastName ||
    !phone ||
    !input.primaryLocationId
  ) {
    throw new Error("employee_profile_invalid");
  }

  const sql = executor ?? neonNotificationExecutor();
  const workspace = await getWorkspace(sql);
  const lockIds = [...new Set([input.actorEmployeeId, input.employeeId])].sort();

  const guards: SqlStatement[] = [
    ...workspaceReadGuard(workspace),
    {
      text: `SELECT e.id
        FROM employees e
        WHERE e.id=ANY($1::text[])
           OR (
             e.active AND e.role='OWNER'
             AND EXISTS (
               SELECT 1
               FROM employees target
               WHERE target.id=$2
                 AND target.role='OWNER'
                 AND ($3<>'OWNER' OR NOT $4::boolean)
             )
           )
        ORDER BY e.id
        FOR UPDATE`,
      values: [lockIds, input.employeeId, input.role, input.active],
    },
    {
      text: `SELECT (CASE WHEN EXISTS (
        SELECT 1
        FROM employees actor
        JOIN employees target ON target.id=$2
        WHERE actor.id=$1
          AND actor.active=true
          AND actor.role IN ('OWNER','MANAGER')
          AND (
            actor.role='OWNER'
            OR (target.role<>'OWNER' AND $3<>'OWNER')
          )
      ) THEN '1' ELSE 'employee_profile_permission_denied' END)::integer`,
      values: [input.actorEmployeeId, input.employeeId, input.role],
    },
    {
      text: `SELECT (CASE WHEN EXISTS (
        SELECT 1 FROM employees
        WHERE id=$1 AND updated_at::text=$2
      ) THEN '1' ELSE 'employee_profile_stale' END)::integer`,
      values: [input.employeeId, input.expectedUpdatedAt],
    },
    {
      text: `SELECT (CASE WHEN
        NOT EXISTS (
          SELECT 1
          FROM employees target
          WHERE target.id=$1
            AND target.active=true
            AND target.role='OWNER'
            AND ($2<>'OWNER' OR NOT $3::boolean)
        )
        OR (SELECT count(*) FROM employees WHERE active=true AND role='OWNER') > 1
      THEN '1' ELSE 'employee_profile_last_owner' END)::integer`,
      values: [input.employeeId, input.role, input.active],
    },
    {
      text: "SELECT id FROM locations WHERE id=$1 AND workspace_id=$2 ORDER BY id FOR SHARE",
      values: [input.primaryLocationId, workspace.id],
    },
    {
      text: `SELECT (CASE WHEN EXISTS (
        SELECT 1
        FROM locations l
        JOIN employees target ON target.id=$2
        WHERE l.id=$1
          AND l.workspace_id=$3
          AND (
            l.active=true
            OR (
              NOT $4::boolean
              AND target.active=false
              AND target.primary_location_id=l.id
            )
          )
      ) THEN '1' ELSE 'employee_profile_location_invalid' END)::integer`,
      values: [
        input.primaryLocationId,
        input.employeeId,
        workspace.id,
        input.active,
      ],
    },
    ...managementSessionStatements(input.proof, input.actorEmployeeId),
    // Lifecycle locks and the session SHARE lock pin this authority. Capture its
    // DB expiry before an intentional self-demotion/deactivation changes the
    // actor or deletes the session. A final wall-clock check must still roll back
    // a later blocked write; rechecking the post-edit role would reject valid edits.
    { text: `SELECT set_config('nevora.profile_authority', jsonb_build_object(
        'actor',$2::text,'token',$1::text,'expires',expires_at)::text,true)
        FROM employee_sessions WHERE token_hash=$1 AND employee_id=$2`,
      values: [input.proof.sessionTokenHash, input.actorEmployeeId] },
  ];
  const writes: SqlStatement[] = [
    {
      text: `INSERT INTO employee_location_eligibility(employee_id,location_id)
        VALUES($1,$2)
        ON CONFLICT DO NOTHING`,
      values: [input.employeeId, input.primaryLocationId],
    },
    {
      text: `DELETE FROM employee_sessions
        WHERE employee_id=$1 AND NOT $2::boolean`,
      values: [input.employeeId, input.active],
    },
    {
      text: `UPDATE employees
        SET first_name=$1,
            last_name=$2,
            phone=$3,
            email=$4,
            role=$5,
            primary_location_id=$6,
            active=$7,
            updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond')
        WHERE id=$8
        RETURNING updated_at::text AS "updatedAt"`,
      values: [
        firstName,
        lastName,
        phone,
        email,
        input.role,
        input.primaryLocationId,
        input.active,
        input.employeeId,
      ],
    },
  ];
  const finalAuthority: SqlStatement = {
    text: `SELECT (CASE WHEN authority->>'actor'=$1 AND authority->>'token'=$2
        AND (authority->>'expires')::timestamptz>clock_timestamp()
        THEN '1' ELSE 'management_authorization' END)::integer
      FROM (SELECT NULLIF(current_setting('nevora.profile_authority',true),'')::jsonb AS authority) captured`,
    values: [input.actorEmployeeId, input.proof.sessionTokenHash],
  };
  return { workspace, guards, writes, finalAuthority };
}

export async function updateEmployeeProfile(input: EmployeeCoreMutationInput, executor?: SqlExecutor): Promise<{ updatedAt: string }> {
  const sql = executor ?? neonNotificationExecutor();
  const batch = await prepareEmployeeProfileMutation(input, sql);
  const result = await sql.transaction([...batch.guards, ...batch.writes, batch.finalAuthority]);
  const written = result[batch.guards.length + batch.writes.length - 1]?.[0] as { updatedAt: string } | undefined;
  if (!written) throw new Error('employee_profile_stale');
  return written;
}

export async function saveEmployeeSchedulingProfile(
  input: {
    employeeId: string;
    positionIds: readonly string[];
    eligibleLocationIds: readonly string[];
    actorEmployeeId: string;
    proof: SessionMutationProof;
    expectedUpdatedAt: string;
  },
  executor?: SqlExecutor,
): Promise<{ updatedAt: string }> {
  assertManagementProof(input.proof, input.actorEmployeeId);
  if (!input.expectedUpdatedAt) throw new Error('profile_stale');
  const sql=executor??neonNotificationExecutor();
  const {workspace}=await assertOperationalAccess(input.proof,{kind:'COMPANY'},sql);
  const positions = [...new Set(input.positionIds)].sort();
  const locations = [...new Set(input.eligibleLocationIds)].sort();
  const employeeIds = [
    ...new Set([input.actorEmployeeId, input.employeeId]),
  ].sort();
  try {
    const statements: SqlStatement[] = [
      ...workspaceReadGuard(workspace),
      {
        text: "SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE",
        values: [employeeIds],
      },
      {
        text: "SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees WHERE id=$1 AND active=true AND role IN ('OWNER','MANAGER')) AND EXISTS(SELECT 1 FROM employees WHERE id=$2) THEN '1' ELSE 'profile_permission_denied' END)::integer",
        values: [input.actorEmployeeId, input.employeeId],
      },
      { text: "SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees WHERE id=$1 AND updated_at::text=$2) THEN '1' ELSE 'profile_stale' END)::integer", values: [input.employeeId, input.expectedUpdatedAt] },
      {
        text: "SELECT id FROM locations WHERE id=ANY($1::text[]) OR id=(SELECT primary_location_id FROM employees WHERE id=$2) ORDER BY id FOR SHARE",
        values: [locations, input.employeeId],
      },
      {
        text: `SELECT (CASE WHEN NOT EXISTS(
        SELECT 1 FROM (SELECT unnest($1::text[]) id UNION SELECT primary_location_id FROM employees WHERE id=$3) requested
        LEFT JOIN locations l ON l.id=requested.id WHERE l.id IS NULL OR l.workspace_id<>$2 OR
        (NOT l.active AND NOT EXISTS(SELECT 1 FROM employee_location_eligibility e WHERE e.employee_id=$3 AND e.location_id=l.id) AND l.id<>(SELECT primary_location_id FROM employees WHERE id=$3))
      ) THEN '1' ELSE 'profile_location_invalid' END)::integer`,
        values: [locations, workspace.id, input.employeeId],
      },
      {
        text: "SELECT id FROM positions WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE",
        values: [positions],
      },
      {
        text: `SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM unnest($1::text[]) requested(id) LEFT JOIN positions p ON p.id=requested.id WHERE p.id IS NULL OR p.workspace_id<>$2 OR (NOT p.active AND NOT EXISTS(SELECT 1 FROM employee_positions ep WHERE ep.employee_id=$3 AND ep.position_id=p.id))) THEN '1' ELSE 'profile_position_invalid' END)::integer`,
        values: [positions, workspace.id, input.employeeId],
      },
      ...operationalScopeStatements(input.proof,workspace,{kind:'COMPANY'}),
      ...employeePositionMembershipStatements({
        employeeId: input.employeeId,
        positionIds: positions,
      }),
      {
        text: "DELETE FROM employee_location_eligibility WHERE employee_id=$1 AND NOT(location_id=ANY($2::text[])) AND location_id<>(SELECT primary_location_id FROM employees WHERE id=$1)",
        values: [input.employeeId, locations],
      },
      {
        text: "INSERT INTO employee_location_eligibility(employee_id,location_id) SELECT $1,id FROM (SELECT unnest($2::text[]) id UNION SELECT primary_location_id FROM employees WHERE id=$1) requested ON CONFLICT DO NOTHING",
        values: [input.employeeId, locations],
      },
      { text: "UPDATE employees SET updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=$1 RETURNING updated_at::text AS \"updatedAt\"", values: [input.employeeId] },
    ];
    const result = await sql.transaction([...statements, ...operationalScopeStatements(input.proof,workspace,{kind:'COMPANY'})]);
    const written = result[statements.length - 1]?.[0] as { updatedAt: string } | undefined;
    if (!written) throw new Error('profile_stale');
    return written;
  } catch (error) {
    if (
      error instanceof Error &&
      /profile_(?:location|position)_invalid/.test(error.message)
    )
      throw new Error(
        "Choose active locations and positions; only existing inactive references may be retained.",
      );
    if (
      error instanceof Error &&
      error.message.includes("profile_permission_denied")
    )
      throw new Error(
        "An active Manager or Owner and an existing employee are required.",
      );
    throw error;
  }
}
