/**
 * packages/database/init-db.mjs
 *
 * Creates the PostgreSQL database if it does not exist,
 * applies schema.sql (CREATE SCHEMA IF NOT EXISTS pms ...),
 * then runs seed.sql. Safe to run repeatedly.
 *
 * Usage (from repo root):
 *   pnpm --filter @pms/database db:init
 *
 * Env vars (same as app):
 *   POSTGRES_HOST   default: localhost
 *   POSTGRES_PORT   default: 5433
 *   POSTGRES_DB     default: postgres
 *   POSTGRES_USER   default: postgres
 *   POSTGRES_PASSWORD default: empty
 */

import { Client } from "pg";
import { readSchema, readSeed } from "./sql-files.mjs";

const host = process.env.POSTGRES_HOST ?? "localhost";
const port = Number(process.env.POSTGRES_PORT ?? 5433);
const dbName = process.env.POSTGRES_DB ?? "postgres";
const user = process.env.POSTGRES_USER ?? "postgres";
const password = process.env.POSTGRES_PASSWORD ?? "";

function connect(db = dbName) {
  return new Client({ host, port, user, password, database: db });
}

async function ensureDatabase() {
  const admin = connect("postgres");
  await admin.connect();
  const res = await admin.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [dbName],
  );
  if (res.rowCount === 0) {
    // CREATE DATABASE cannot run inside a transaction
    await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`[init-db] created database "${dbName}"`);
  } else {
    console.log(`[init-db] database "${dbName}" already exists`);
  }
  await admin.end();
}

async function applySql(name, sql) {
  const client = connect();
  await client.connect();
  try {
    await client.query(sql);
    console.log(`[init-db] applied ${name}`);
  } finally {
    await client.end();
  }
}

async function main() {
  console.log(`[init-db] connecting to ${user}@${host}:${port}/${dbName}`);
  await ensureDatabase();

  await applySql("schema.sql", readSchema());
  await applySql("seed.sql", readSeed());

  console.log("[init-db] done");
}

main().catch((err) => {
  console.error("[init-db] failed:", err.message);
  process.exitCode = 1;
});
