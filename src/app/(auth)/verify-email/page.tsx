"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";

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
import { getSafeNext } from "@/lib/auth-redirect";
import { sendWelcomeEmailForCurrentUser } from "@/lib/email/welcome";

const RESEND_COOLDOWN = 30;

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const role =
    searchParams.get("role") === "provider" ? "provider" : "customer";
  const safeNext = getSafeNext(searchParams.get("next"));

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // Landing here directly (stale link, expired code, seeded account) sends
  // nothing by itself — request a fresh code once on mount so the "we sent
  // a code" copy is actually true.
  const autoSent = useRef(false);

  useEffect(() => {
    if (!email || autoSent.current) return;
    autoSent.current = true;
    (async () => {
      setIsResending(true);
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      setIsResending(false);
      if (error) {
        autoSent.current = false;
        setError(
          error.message ??
            "Couldn't send a code. Check the address or try Resend below.",
        );
        return;
      }
      setCooldown(RESEND_COOLDOWN);
      setInfo("A new code was sent to your email.");
    })();
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const code = otp.trim();
    if (code.length < 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setIsVerifying(true);
    const { error } = await authClient.emailOtp.verifyEmail({
      email,
      otp: code,
    });
    setIsVerifying(false);
    if (error) {
      setError(error.message ?? "Invalid code. Try again or resend.");
      return;
    }
    // Welcome email by role (best-effort, never blocks navigation).
    await sendWelcomeEmailForCurrentUser({ email, role });
    if (role === "provider") router.push("/provider/dashboard");
    else router.push(safeNext ?? "/");
  }

  async function handleResend() {
    if (!email || cooldown > 0) return;
    setError(null);
    setInfo(null);
    setIsResending(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });
    setIsResending(false);
    if (error) {
      setError(error.message ?? "Couldn't resend the code. Try again.");
      return;
    }
    setCooldown(RESEND_COOLDOWN);
    setInfo("A new code was sent to your email.");
  }

  if (!email) {
    return (
      <Card className="w-full rounded-2xl border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-zinc-900 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            Missing email address.{" "}
            <Link href="/sign-up" className="underline">
              Create an account
            </Link>{" "}
            first.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full rounded-2xl border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-zinc-900 dark:border-zinc-800">
      <CardHeader className="space-y-3 pb-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
          <MailCheck className="size-4" />
        </span>
        <div className="space-y-1.5 pt-1">
          <CardTitle className="text-xl font-semibold tracking-tight">
            Check your inbox
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            We sent a 6-digit code to <strong>{email}</strong>. It expires in 5
            minutes.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="otp" className="text-xs font-medium">
              Verification code
            </Label>
            <Input
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={6}
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="h-11 rounded-xl bg-white text-center text-lg tracking-[0.5em]"
              disabled={isVerifying}
            />
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          {info && (
            <p role="status" className="text-xs text-green-600">
              {info}
            </p>
          )}
          <Button
            type="submit"
            className="h-9 w-full rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            disabled={isVerifying}
          >
            {isVerifying ? "Verifying…" : "Verify email"}
          </Button>
        </form>
        <div className="mt-4 text-center text-xs text-muted-foreground">
          Didn&apos;t get the code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
            className="font-medium text-zinc-900 underline disabled:opacity-50 dark:text-white"
          >
            {isResending
              ? "Sending…"
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend code"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
