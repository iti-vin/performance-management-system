import type { TemplateVersionDto } from "@pms/shared-types";
import Link from "next/link";

import { formatWorkspaceDate } from "@/utils/workspace-date";

/** The version that the address asks for, or none: a whole number from 1. */
export function parseTemplateVersion(raw: string | string[] | undefined): number | undefined {
  return typeof raw === "string" && /^[1-9]\d{0,5}$/.test(raw) ? Number(raw) : undefined;
}

interface TemplateVersionHistoryProps {
  versions: readonly TemplateVersionDto[];
  /** The details page of the template. */
  href: string;
  shownVersion?: number;
}

/** The published versions of a template, each open to read (PRD 4.9 and 5.9). */
export function TemplateVersionHistory({ versions, href, shownVersion }: TemplateVersionHistoryProps) {
  if (versions.length === 0) return null;
  return (
    <section aria-label="Version history" className="mx-auto grid w-full max-w-pms-form gap-2 rounded-pms-card border border-border bg-card p-4">
      <h2 className="text-pms-section-title">Version history</h2>
      <ul className="grid gap-1">
        {versions.map(({ version, publishedAt, publishedByName, isCurrent }) => (
          <li key={version} className="flex flex-wrap items-center gap-x-3">
            <Link
              href={isCurrent ? href : `${href}?version=${version}`}
              aria-current={(shownVersion === undefined ? isCurrent : shownVersion === version) ? "page" : undefined}
              className="min-h-pms-touch content-center rounded-pms-control text-pms-label underline"
            >
              {`Version ${version}${isCurrent ? " (current)" : ""}`}
            </Link>
            <span className="text-pms-body text-muted-foreground">
              {`Published ${formatWorkspaceDate(publishedAt)} by ${publishedByName ?? "Not recorded"}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
