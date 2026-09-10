"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { markPayoutSettled } from "./actions";

/** One-click settle for a paid provider share (project-mode ledger). */
export function SettleButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <span className="text-xs font-medium text-green-700 dark:text-green-400">
        Settled
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await markPayoutSettled(paymentId);
          if (!result.success) {
            toast.add({ title: result.error, type: "error" });
            return;
          }
          setDone(true);
          router.refresh();
        })
      }
    >
      {isPending ? "Settling…" : "Mark settled"}
    </Button>
  );
}
