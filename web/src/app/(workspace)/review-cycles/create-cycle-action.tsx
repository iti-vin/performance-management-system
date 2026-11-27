import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/features/auth/services/current-user";

/** Only an HR administrator creates a cycle. The API refuses everyone else. */
export async function CreateCycleAction() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return null;

  return (
    <Link href="/review-cycles/new" className={buttonVariants({ className: "min-h-pms-touch rounded-pms-control" })}>
      <PlusIcon aria-hidden="true" />
      Create Cycle
    </Link>
  );
}
