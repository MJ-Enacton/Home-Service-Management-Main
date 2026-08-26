import Link from "next/link";
import { Wrench } from "lucide-react";

import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/40">
      <AuthBrandPanel />

      <main className="relative flex flex-1 flex-col">
        {/* Mobile logo */}
        <div className="flex items-center justify-center pt-8 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-1.5">
              <Wrench className="size-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">HandyHub</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
