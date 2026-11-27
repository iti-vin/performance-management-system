import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const FEATURES = join(__dirname, "../../src/features");
const REVIEW_FEATURES = ["evaluations", "position-goals", "review-cycles", "review-templates"];

const sources = REVIEW_FEATURES.flatMap((feature) =>
  readdirSync(join(FEATURES, feature), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
    .map((entry) => join(entry.parentPath, entry.name)),
);

/** Muted text on the full muted surface measures 4.35 to 1 in the light theme, below the 4.5 of DESIGN.md. */
const FULL_MUTED_UNDER_MUTED_TEXT = /bg-muted(?![/\w-]).*text-muted-foreground|text-muted-foreground.*(?<![:\w-])bg-muted(?![/\w-])|\[&_thead\]:bg-muted(?![/\w-])/;

describe("muted text of the review screens", () => {
  it("never sits on the full muted surface", () => {
    expect(sources.length).toBeGreaterThan(20);

    const found = sources.flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, index) => (FULL_MUTED_UNDER_MUTED_TEXT.test(line) ? [`${relative(FEATURES, file).replaceAll("\\", "/")}:${index + 1}`] : [])),
    );

    expect(found).toEqual([]);
  });
});
