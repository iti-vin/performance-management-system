import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

/** A secondary route out of an auth page: a title, and what it is for. */
export function AuthOptionLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-pms-touch items-center justify-between gap-3 rounded-pms-control py-1.5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="grid">
        <span className="text-pms-table font-semibold underline-offset-4 group-hover:underline">
          {title}
        </span>
        <span className="text-pms-label font-normal text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-pms-icon-inline shrink-0 text-muted-foreground"
      />
    </Link>
  );
}

export function BackToLoginLink() {
  return (
    <Link
      href="/login"
      className="inline-flex min-h-pms-touch w-fit items-center gap-2 rounded-pms-control text-pms-table font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <ArrowLeft aria-hidden="true" className="size-pms-icon-inline" />
      Back to log in
    </Link>
  );
}
