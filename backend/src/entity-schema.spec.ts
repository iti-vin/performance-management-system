import { readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getMetadataArgsStorage } from "typeorm";
import { describe, expect, it } from "vitest";

const MODULES_DIR = join(import.meta.dirname, "modules");

/** Every `*.entity.ts` file under src/modules. */
function listEntityFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".entity.ts"))
    .map((entry) => join(entry.parentPath, entry.name));
}

describe("entity schemas", () => {
  // It imports every entity file, which takes several seconds while other suites run.
  it("maps every entity table to the pms schema, never to public", { timeout: 30_000 }, async () => {
    const files = listEntityFiles(MODULES_DIR);
    expect(files.length).toBeGreaterThan(0);

    const classes = new Set<unknown>();
    for (const file of files) {
      const exports: Record<string, unknown> = await import(pathToFileURL(file).href);
      for (const value of Object.values(exports)) classes.add(value);
    }

    const tables = getMetadataArgsStorage().tables.filter((table) => classes.has(table.target));
    expect(tables.length).toBe(files.length);

    const notInPms = tables
      .filter((table) => table.schema !== "pms")
      .map((table) => `${(table.target as { name: string }).name} (${table.name})`);
    expect(notInPms).toEqual([]);
  });
});
