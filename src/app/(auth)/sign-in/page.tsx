"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInSchema } from "@/lib/validators";
import { authClient } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import SocialSignInButton from "../components/SocialSignInButton";
import { getSafeNext } from "@/lib/auth-redirect";

export default function SignInPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeNext = getSafeNext(searchParams.get("next"));
  const signUpHref = safeNext ? `/sign-up?next=${encodeURIComponent(safeNext)}` : "/sign-up";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();
    const result = signInSchema.safeParse({ email, password });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { data, error } = await authClient.signIn.email({
      email: email!,
      password: password!,
    });
    setIsLoading(false);

    if (error) {
      // Unverified accounts must complete the OTP step first.
      if (
        error.status === 403 ||
        /verif/i.test(error.message ?? "")
      ) {
        const params = new URLSearchParams({ email: email! });
        if (safeNext) params.set("next", safeNext);
        // The verify-email page auto-sends a fresh code on mount — don't
        // pre-send here, or the user gets two codes and only the latest
        // is valid.
        router.push(`/verify-email?${params.toString()}`);
        return;
      }
      setErrors({ email: error.message! });
      return;
    }

    if (data?.user) {
      const userRole = (data.user as { role?: string }).role || "customer";
      if (userRole === "provider") router.push("/provider/dashboard");
      else router.push(safeNext ?? "/");
    }
  };

  return (
    <Card className="w-full rounded-2xl border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-zinc-900 dark:border-zinc-800">
      <CardHeader className="space-y-3 pb-4">
        <BrandLogo height={32} />
        <div className="space-y-1.5 pt-1">
          <CardTitle className="text-xl font-semibold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-sm leading-relaxed">Sign in to manage bookings and services</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className="h-9 rounded-xl bg-white"
              disabled={isLoading}
            />
            {errors.email && (
              <p id="email-error" role="alert" className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-medium">Password</Label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot?</Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="h-9 rounded-xl bg-white"
              disabled={isLoading}
            />
            {errors.password && (
              <p id="password-error" role="alert" className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>
          <Button
            type="submit"
            className="h-9 w-full rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            disabled={isLoading}
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-muted-foreground dark:bg-zinc-900">or</span>
          </div>
        </div>

        <SocialSignInButton callbackURL={safeNext ? `/onboarding?next=${encodeURIComponent(safeNext)}` : "/onboarding"} />
      </CardContent>
      <CardFooter className="justify-center rounded-b-2xl border-t bg-zinc-50/50 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href={signUpHref} className="font-medium text-zinc-900 hover:underline dark:text-white">
            Create account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
