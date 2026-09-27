import { getDb } from "@/lib/db";
import type { Employee, Location, UserRole } from "@/lib/domain";

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
};

export async function listEmployees(): Promise<Employee[]> {
  const sql = getDb();
  const rows = (await sql.query(
    `SELECT
       e.id,
       e.first_name,
       e.last_name,
       e.phone,
       e.email,
       e.role,
       e.primary_location_id,
       e.active,
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
     ORDER BY e.active DESC, e.first_name, e.last_name`,
  )) as EmployeeRow[];

  return rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email ?? undefined,
    role: row.role,
    primaryLocationId: row.primary_location_id,
    eligibleLocationIds: row.eligible_location_ids ?? [],
    active: row.active,
  }));
}

export async function listLocations(): Promise<Location[]> {
  const sql = getDb();
  const rows = (await sql.query(
    `SELECT id, name, short_name, active
     FROM locations
     WHERE active = true
     ORDER BY id`,
  )) as Array<{
    id: string;
    name: string;
    short_name: string;
    active: boolean;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    active: row.active,
  }));
}

export async function findEmployeeCredential(employeeId: string) {
  const sql = getDb();
  const rows = await sql.query(
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
  );

  return rows[0] as
    | {
        id: string;
        first_name: string;
        last_name: string;
        role: UserRole;
        primary_location_id: string;
        active: boolean;
        password_hash: string;
        must_change_password: boolean;
      }
    | undefined;
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
  passwordHash: string;
}) {
  const sql = getDb();
  const eligible = Array.from(
    new Set([input.primaryLocationId, ...input.eligibleLocationIds]),
  );

  const queries = [
    sql`INSERT INTO employees (
      id, first_name, last_name, phone, email, role, primary_location_id
    ) VALUES (
      ${input.id},
      ${input.firstName},
      ${input.lastName},
      ${input.phone},
      ${input.email ?? null},
      ${input.role},
      ${input.primaryLocationId}
    )`,
    sql`INSERT INTO employee_credentials (employee_id, password_hash)
        VALUES (${input.id}, ${input.passwordHash})`,
    ...eligible.map(
      (locationId) =>
        sql`INSERT INTO employee_location_eligibility (employee_id, location_id)
            VALUES (${input.id}, ${locationId})`,
    ),
  ];

  await sql.transaction(queries);
}
