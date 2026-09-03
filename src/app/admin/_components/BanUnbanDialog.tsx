"use client";

import { useState, useTransition } from "react";
import { Ban, Loader2, ShieldCheck } from "lucide-react";

import type { AdminUser } from "@/types";
import { banUser, unbanUser } from "@/app/admin/customers/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

interface BanUnbanDialogProps {
  target: Pick<AdminUser, "id" | "name" | "banned">;
}

export function BanUnbanDialog({ target }: BanUnbanDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const banning = !target.banned;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setReason("");
      setError("");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (reason.trim().length < 5) {
      setError("Please provide a reason of at least 5 characters.");
      return;
    }

    startTransition(async () => {
      const result = banning
        ? await banUser(target.id, reason)
        : await unbanUser(target.id, reason);

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast.add({
        title: banning ? "User banned" : "User unbanned",
        description: `${target.name} has been ${banning ? "banned" : "unbanned"}.`,
        type: "success",
      });
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant={banning ? "outline" : "secondary"}
            size="sm"
            className={cn(
              banning &&
                "text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30",
            )}
          />
        }
      >
        {banning ? (
          <>
            <Ban className="size-3.5" />
            Ban
          </>
        ) : (
          <>
            <ShieldCheck className="size-3.5" />
            Unban
          </>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {banning ? "Ban" : "Unban"} {target.name}
          </DialogTitle>
          <DialogDescription>
            {banning
              ? "The user will be immediately blocked from using the platform."
              : "The user will regain full access to the platform."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`ban-reason-${target.id}`}>
              Reason for {banning ? "banning" : "unbanning"}
            </Label>
            <Textarea
              id={`ban-reason-${target.id}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                banning
                  ? "Why is this user being banned?"
                  : "Why is this ban being lifted?"
              }
              minLength={5}
              maxLength={500}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {banning ? "Ban user" : "Unban user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
