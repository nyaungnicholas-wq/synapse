import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";

/** Creates the test database if needed and applies migrations to it. Never touches the dev database. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !/_test(_[a-z0-9]+)?$/.test(new URL(url).pathname)) throw new Error("TEST_DATABASE_URL must point at a *_test database");
  const dbName = new URL(url).pathname.slice(1);
  const admin = new Client({ connectionString: url.replace(`/${dbName}`, "/postgres") });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
