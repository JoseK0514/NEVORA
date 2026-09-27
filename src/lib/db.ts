import { neon } from "@neondatabase/serverless";

let database: ReturnType<typeof neon> | null = null;

export function getDb() {
  if (database) return database;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  database = neon(connectionString);
  return database;
}
