import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

// The tests run from the web folder.
const APP = resolve(process.cwd(), "src/app");
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The name inside the marks of a route group, a dynamic segment, a slot, or a private folder. */
function bareName(folder: string): string {
  return folder.replace(/^(\(|\[{1,2}(\.\.\.)?|@|_)/, "").replace(/(\)|\]{1,2})$/, "");
}

describe("route folders", () => {
  it("use kebab-case names, the name of a dynamic segment too", () => {
    const folders = readdirSync(APP, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => relative(APP, join(entry.parentPath, entry.name)));

    expect(folders.length).toBeGreaterThan(0);
    expect(folders.filter((folder) => !KEBAB_CASE.test(bareName(folder.split(sep).at(-1) ?? "")))).toEqual([]);
  });
});

// TypeScript does not compare these names with the folders, so a page could read a param that does not exist.
describe("route params", () => {
  it("are declared under the name of their dynamic folder", () => {
    const declared = readdirSync(APP, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
      .flatMap((entry) => {
        const file = join(entry.parentPath, entry.name);
        const segments = Array.from(file.matchAll(/\[(?:\.\.\.)?([^\]]+)\]/g), (match) => match[1]);
        return Array.from(readFileSync(file, "utf8").matchAll(/\bparams: Promise<\{([^}]*)\}>/g))
          .flatMap((match) => Array.from(match[1].matchAll(/"?([\w-]+)"?\??:/g), (key) => key[1]))
          .map((key) => ({ file: relative(APP, file), key, hasFolder: segments.includes(key) }));
      });

    expect(declared.length).toBeGreaterThan(0);
    expect(declared.filter((param) => !param.hasFolder)).toEqual([]);
  });
});
