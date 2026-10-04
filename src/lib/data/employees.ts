import { getDb, queryRows } from "@/lib/db";
import type { Employee, UserRole } from "@/lib/domain";
import type { SqlExecutor, SqlStatement } from "../notifications/types";
import { neonNotificationExecutor } from "./notification-transactions";
import { getWorkspace, workspaceReadGuard } from "./workspaces";
import { employeePositionMembershipStatements } from "./positions";

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
         c.must_change_password
       FROM employees e
       JOIN employee_credentials c ON c.employee_id = e.id
       WHERE upper(e.id) = upper($1)
       LIMIT 1`,
      [employeeId],
    ),
  );

  return rows[0];
}

export async function insertEmployee(input: {
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
}, executor?: SqlExecutor) {
  const sql = executor ?? neonNotificationExecutor();
  const workspace = await getWorkspace(sql);
  const eligible = [...new Set([input.primaryLocationId, ...input.eligibleLocationIds])].sort();
  const positions = [...new Set(input.positionIds ?? [])].sort();
  if (!["OWNER", "MANAGER", "LEAD", "EMPLOYEE"].includes(input.role)) throw new Error('Choose an access role.');
  const statements: SqlStatement[] = [
    ...workspaceReadGuard(workspace),
    { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR UPDATE', values: [input.actorEmployeeId] },
    { text: `SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees WHERE id=$1 AND active=true AND role IN ('OWNER','MANAGER') AND ($2<>'OWNER' OR role='OWNER')) THEN '1' ELSE 'employee_creation_permission_denied' END)::integer`, values: [input.actorEmployeeId, input.role] },
    { text: 'SELECT id FROM locations WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', values: [eligible] },
    { text: `SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM unnest($1::text[]) requested(id) LEFT JOIN locations l ON l.id=requested.id WHERE l.id IS NULL OR NOT l.active OR l.workspace_id<>$2) THEN '1' ELSE 'employee_location_invalid' END)::integer`, values: [eligible, workspace.id] },
    { text: 'SELECT id FROM positions WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', values: [positions] },
    { text: `SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM unnest($1::text[]) requested(id) LEFT JOIN positions p ON p.id=requested.id WHERE p.id IS NULL OR NOT p.active OR p.workspace_id<>$2) THEN '1' ELSE 'employee_position_invalid' END)::integer`, values: [positions, workspace.id] },
    { text: 'INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES($1,$2,$3,$4,$5,$6,$7)', values: [input.id, input.firstName, input.lastName, input.phone, input.email ?? null, input.role, input.primaryLocationId] },
    ...eligible.map(locationId => ({ text: 'INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES($1,$2)', values: [input.id, locationId] })),
    ...employeePositionMembershipStatements({ employeeId: input.id, positionIds: positions }),
  ];
  if (input.passwordHash) statements.push({ text: 'INSERT INTO employee_credentials(employee_id,password_hash) VALUES($1,$2)', values: [input.id, input.passwordHash] });
  await sql.transaction(statements);
}

export async function activateEmployeeCredential(input: {
  employeeId: string;
  phone: string;
  passwordHash: string;
}) {
  const sql = getDb();
  const phoneDigits = input.phone.replace(/\D/g, "");

  const rows = queryRows<{ employee_id: string }>(
    await sql.query(
      `INSERT INTO employee_credentials (
         employee_id,
         password_hash,
         must_change_password
       )
       SELECT
         e.id,
         $3,
         false
       FROM employees e
       LEFT JOIN employee_credentials c
         ON c.employee_id = e.id
       WHERE upper(e.id) = upper($1)
         AND regexp_replace(e.phone, '[^0-9]', '', 'g') = $2
         AND e.active = true
         AND c.employee_id IS NULL
       RETURNING employee_id`,
      [input.employeeId, phoneDigits, input.passwordHash],
    ),
  );

  return rows[0]?.employee_id ?? null;
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

export async function saveEmployeeSchedulingProfile(
  input: {
    employeeId: string;
    positionIds: readonly string[];
    eligibleLocationIds: readonly string[];
    actorEmployeeId: string;
  },
  executor?: SqlExecutor,
): Promise<void> {
  const sql = executor ?? neonNotificationExecutor(),
    workspace = await getWorkspace(sql);
  const positions = [...new Set(input.positionIds)].sort();
  const locations = [...new Set(input.eligibleLocationIds)].sort();
  const employeeIds = [
    ...new Set([input.actorEmployeeId, input.employeeId]),
  ].sort();
  try {
    await sql.transaction([
      ...workspaceReadGuard(workspace),
      {
        text: "SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE",
        values: [employeeIds],
      },
      {
        text: "SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees WHERE id=$1 AND active=true AND role IN ('OWNER','MANAGER')) AND EXISTS(SELECT 1 FROM employees WHERE id=$2) THEN '1' ELSE 'profile_permission_denied' END)::integer",
        values: [input.actorEmployeeId, input.employeeId],
      },
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
    ]);
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
