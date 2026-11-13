import { readFileSync } from "node:fs";

// Expand the same package-owned include lists that psql reads. Never resolve
// includes from request input or from the caller's working directory.
function readSql(entry) {
  const file = new URL(entry, import.meta.url);
  return readFileSync(file, "utf8").replace(
    /^\\ir ((?:schema|seeds)\/[a-z0-9-]+\.sql)\r?$/gm,
    (_, module) => readFileSync(new URL(module, file), "utf8"),
  );
}

export const readSchema = () => readSql("schema.sql");
export const readSeed = () => readSql("seed.sql");
