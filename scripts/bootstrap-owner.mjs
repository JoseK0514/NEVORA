import { neon } from "@neondatabase/serverless";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const required = [
  "DATABASE_URL",
  "BOOTSTRAP_EMPLOYEE_ID",
  "BOOTSTRAP_FIRST_NAME",
  "BOOTSTRAP_LAST_NAME",
  "BOOTSTRAP_PHONE",
  "BOOTSTRAP_PASSWORD",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`${key} is required.`);
  }
}

if (process.env.BOOTSTRAP_PASSWORD.length < 8) {
  throw new Error("BOOTSTRAP_PASSWORD must contain at least 8 characters.");
}

const sql = neon(process.env.DATABASE_URL);
const employeeId = process.env.BOOTSTRAP_EMPLOYEE_ID.trim().toUpperCase();
const salt = randomBytes(16);
const passwordHashBuffer = await scryptAsync(
  process.env.BOOTSTRAP_PASSWORD,
  salt,
  64,
);
const passwordHash = `scrypt$${salt.toString("hex")}$${passwordHashBuffer.toString("hex")}`;

const existing = await sql.query(
  "SELECT id FROM employees WHERE upper(id) = upper($1) LIMIT 1",
  [employeeId],
);

if (existing.length) {
  throw new Error(`Employee ${employeeId} already exists.`);
}

await sql.transaction([
  sql`INSERT INTO employees (
    id, first_name, last_name, phone, email, role, primary_location_id
  ) VALUES (
    ${employeeId},
    ${process.env.BOOTSTRAP_FIRST_NAME},
    ${process.env.BOOTSTRAP_LAST_NAME},
    ${process.env.BOOTSTRAP_PHONE},
    ${process.env.BOOTSTRAP_EMAIL || null},
    'OWNER',
    'loc-1'
  )`,
  sql`INSERT INTO employee_location_eligibility (employee_id, location_id)
      VALUES (${employeeId}, 'loc-1')`,
  sql`INSERT INTO employee_location_eligibility (employee_id, location_id)
      VALUES (${employeeId}, 'loc-2')`,
  sql`INSERT INTO employee_credentials (employee_id, password_hash, must_change_password)
      VALUES (${employeeId}, ${passwordHash}, false)`,
]);

console.log(`Created owner ${employeeId}.`);
