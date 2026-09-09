"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SignOutDialogProps {
  trigger: React.ReactElement;
  onSignedOut?: () => void;
}

export function SignOutDialog({ trigger, onSignedOut }: SignOutDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function handleConfirm() {
    setLoading(true);
    try {
      await authClient.signOut();
      onSignedOut?.();
      setOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign out?</DialogTitle>
          <DialogDescription>
            You&apos;ll be signed out of HandyHub on this device. You can sign
            back in anytime.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            <LogOut className="size-4" />
            Sign out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SignOutCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign out</CardTitle>
        <CardDescription>
          Sign out of HandyHub on this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm font-medium">Session</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ll need to sign back in to manage bookings and services.
            </p>
          </div>
          <SignOutDialog
            trigger={
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/30"
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
