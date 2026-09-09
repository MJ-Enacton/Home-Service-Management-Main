"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";

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

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const email = new FormData(e.currentTarget).get("email")?.toString().trim();
    if (!email || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setIsLoading(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setIsLoading(false);
    if (error) {
      setError(error.message ?? "Something went wrong. Try again.");
      return;
    }
    // Generic success — never reveal whether the email exists.
    setDone(true);
  }

  return (
    <Card className="w-full rounded-2xl border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-zinc-900 dark:border-zinc-800">
      <CardHeader className="space-y-3 pb-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
          <KeyRound className="size-4" />
        </span>
        <div className="space-y-1.5 pt-1">
          <CardTitle className="text-xl font-semibold tracking-tight">
            Forgot password
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {done
              ? "Check your inbox for a reset link."
              : "Enter your account email and we'll send you a reset link."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If an account exists for that email, a reset link is on its
              way. It expires in 1 hour.
            </p>
            <Link
              href="/sign-in"
              className="block text-center text-sm font-medium underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
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
              {isLoading ? "Sending…" : "Send reset link"}
            </Button>
            <Link
              href="/sign-in"
              className="block text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
