import Image from "next/image";
import type { ReactNode } from "react";

import fullLogo from "../../public/assets/hrdotnet-logo-full.png";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-svh justify-items-center bg-background px-pms-gutter py-4 sm:items-center sm:py-6">
      <div className="grid w-full min-w-0 max-w-sm content-start gap-5">
        <Image
          src={fullLogo}
          alt="HRDotNet Performance"
          loading="eager"
          fetchPriority="high"
          sizes="10rem"
          className="h-auto w-40"
        />
        {children}
      </div>
    </main>
  );
}
