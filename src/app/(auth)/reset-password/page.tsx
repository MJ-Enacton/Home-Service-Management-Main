"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password")?.toString() ?? "";
    const confirm = formData.get("confirm")?.toString() ?? "";
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setIsLoading(true);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setIsLoading(false);
    if (error) {
      setError(
        error.message ?? "This link is invalid or expired. Request a new one.",
      );
      return;
    }
    router.push("/sign-in");
  }

  if (!token) {
    return (
      <Card className="w-full rounded-2xl border bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            This link is missing its token.{" "}
            <Link href="/forgot-password" className="underline">
              Request a new link
            </Link>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full rounded-2xl border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-zinc-900 dark:border-zinc-800">
      <CardHeader className="space-y-3 pb-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
          <LockKeyhole className="size-4" />
        </span>
        <div className="space-y-1.5 pt-1">
          <CardTitle className="text-xl font-semibold tracking-tight">
            Set a new password
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Choose a new password for your account.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium">
              New password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              className="h-9 rounded-xl bg-white"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-xs font-medium">
              Confirm password
            </Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              className="h-9 rounded-xl bg-white"
              disabled={isLoading}
            />
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="h-9 w-full rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            disabled={isLoading}
          >
            {isLoading ? "Saving…" : "Reset password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
