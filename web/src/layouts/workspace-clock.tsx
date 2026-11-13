"use client";

import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export const WORKSPACE_TIME_ZONE = "Asia/Manila";
const MINUTE_MS = 60_000;

export function WorkspaceClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timer: number;

    function tick() {
      const current = new Date();
      setNow(current);
      timer = window.setTimeout(
        tick,
        MINUTE_MS - (current.getTime() % MINUTE_MS),
      );
    }

    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="col-start-2 row-start-1 hidden min-h-lh text-center text-pms-label tabular-nums text-muted-foreground lg:block">
      {now ? (
        <time dateTime={now.toISOString()}>
          {format(
            new TZDate(now.getTime(), WORKSPACE_TIME_ZONE),
            "EEEE, MMMM dd, yyyy '|' h:mm a",
          )}
        </time>
      ) : (
        <Skeleton aria-hidden="true" className="mx-auto h-[1lh] w-[38ch]" />
      )}
    </div>
  );
}
