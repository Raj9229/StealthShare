import dotenv from "dotenv";
import path from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "@stealthshare/shared";

// Prefer the monorepo root .env when running from the server folder.
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Set it in the root .env file.");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export async function runMigrations() {
  try {
    await migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
  } catch (err: unknown) {
    // Postgres error code 42P07 = "relation already exists"
    // This happens when the DB already has the tables but the Drizzle
    // migrations tracking table is out of sync.  It is safe to skip.
    const pgCode =
      err &&
      typeof err === "object" &&
      "cause" in err &&
      err.cause &&
      typeof err.cause === "object" &&
      "code" in err.cause
        ? (err.cause as { code: string }).code
        : (err as { code?: string }).code;

    if (pgCode === "42P07") {
      console.warn(
        "⚠️  Migration skipped: tables already exist in the database. Continuing startup..."
      );
    } else {
      throw err; // re-throw any other unexpected errors
    }
  }
}
