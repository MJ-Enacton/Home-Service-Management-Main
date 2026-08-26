"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function ProfileCheck() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isPending && session?.user) {
      const { contact, address } = session.user;
      if (!contact || !address) {
        if (pathname !== "/onboarding") {
          router.push("/onboarding");
        }
      }
    }
  }, [session, isPending, router, pathname]);

  return null;
}
