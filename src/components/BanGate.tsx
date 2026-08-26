import type { ReactNode } from "react";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { ShieldBan } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";

export async function BanGate({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return <>{children}</>;
  }

  const [row] = await db
    .select({
      banned: user.banned,
      banReason: user.banReason,
    })
    .from(user)
    .where(eq(user.id, session.user.id));

  if (!row?.banned) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="rounded-full bg-red-50 p-4 dark:bg-red-900/20">
        <ShieldBan className="size-10 text-red-600 dark:text-red-400" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Account suspended
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Your account has been suspended by an administrator and you no longer
        have access to the platform.
      </p>

      {row.banReason && (
        <div className="mt-6 w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-left dark:border-red-900/50 dark:bg-red-900/20">
          <p className="text-xs font-semibold text-red-700 uppercase dark:text-red-300">
            Reason
          </p>
          <p className="mt-1 text-sm text-red-600 dark:text-red-300">
            {row.banReason}
          </p>
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        If you believe this is a mistake, please contact support.
      </p>
    </div>
  );
}
