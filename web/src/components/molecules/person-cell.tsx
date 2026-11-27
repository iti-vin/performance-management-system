import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PersonSummary } from "@/types/person";

/**
 * A link in the name slot: it stays on its line, close to the subtitle, and an invisible
 * area gives it the full touch height.
 */
export const PERSON_LINK_CLASS =
  "relative justify-self-start rounded-pms-control font-medium text-primary after:absolute after:inset-x-0 after:top-1/2 after:h-pms-touch after:-translate-y-1/2 hover:underline focus-visible:underline";

interface PersonCellProps extends Omit<PersonSummary, "id"> {
  size?: "sm" | "default" | "lg";
  /** Shown in place of the plain name, for example a link. The initials still come from the name. */
  nameSlot?: ReactNode;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function PersonCell({
  name,
  subtitle,
  avatarUrl,
  size = "default",
  nameSlot,
}: PersonCellProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar size={size}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
        <AvatarFallback aria-hidden="true">{initialsOf(name)}</AvatarFallback>
      </Avatar>
      <div className="grid min-w-0">
        {/* A given slot is not truncated: that would cut the focus outline of a link. */}
        {nameSlot ?? <span className="truncate text-pms-table font-medium">{name}</span>}
        {subtitle && (
          <span className="truncate text-pms-label text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
