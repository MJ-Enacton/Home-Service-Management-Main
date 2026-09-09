"use client";

import { useState } from "react";
import Link from "next/link";
import { Wrench } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { signUpSchema } from "@/lib/validators";
import { authClient } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import SocialSignInButton from "../components/SocialSignInButton";
import { getSafeNext } from "@/lib/auth-redirect";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeNext = getSafeNext(searchParams.get("next"));
  const signInHref = safeNext ? `/sign-in?next=${encodeURIComponent(safeNext)}` : "/sign-in";
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [role, setRole] = useState<"customer" | "provider">("customer");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name")?.toString();
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();
    const contact = formData.get("contact")?.toString();
    const address = formData.get("address")?.toString();

    const result = signUpSchema.safeParse({ name, email, password, contact, address, role });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { data, error } = await authClient.signUp.email({
      email: email!,
      password: password!,
      name: name!,
      contact: contact!,
      address: address!,
      role,
    });
    setIsLoading(false);

    if (error) {
      setErrors({ email: error.message ?? "Failed to create account" });
      return;
    }

    if (data) {
      // Email verification OTP is auto-sent on sign-up (sendVerificationOnSignUp).
      const params = new URLSearchParams({ email: email! });
      if (role === "provider") params.set("role", "provider");
      if (safeNext) params.set("next", safeNext);
      router.push(`/verify-email?${params.toString()}`);
    }
  };

  return (
    <Card className="w-full rounded-2xl border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-zinc-900 dark:border-zinc-800">
      <CardHeader className="space-y-3 pb-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
            <Wrench className="size-3.5" />
          </span>
          <span className="text-sm font-bold tracking-tight">HandyHub</span>
        </Link>
        <div className="space-y-1.5 pt-1">
          <CardTitle className="text-xl font-semibold tracking-tight">Create an account</CardTitle>
          <CardDescription className="text-sm leading-relaxed">Join HandyHub as a customer or provider — same account, different tools.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">Full name</Label>
              <Input id="name" name="name" placeholder="Alex Morgan" autoComplete="name" aria-invalid={Boolean(errors.name)} className="h-9 rounded-xl bg-white" disabled={isLoading} />
              {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact" className="text-xs font-medium">Contact</Label>
              <Input id="contact" name="contact" placeholder="+1 (555) 000-0000" autoComplete="tel" aria-invalid={Boolean(errors.contact)} className="h-9 rounded-xl bg-white" disabled={isLoading} />
              {errors.contact && <p role="alert" className="text-xs text-destructive">{errors.contact}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" aria-invalid={Boolean(errors.email)} className="h-9 rounded-xl bg-white" disabled={isLoading} />
            {errors.email && <p role="alert" className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} className="h-9 rounded-xl bg-white" disabled={isLoading} />
            {errors.password && <p role="alert" className="text-xs text-destructive">{errors.password}</p>}
            <p className="text-xs text-muted-foreground">At least 8 characters</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-medium">Address</Label>
            <Input id="address" name="address" placeholder="123 Main St, City, State" autoComplete="street-address" aria-invalid={Boolean(errors.address)} className="h-9 rounded-xl bg-white" disabled={isLoading} />
            {errors.address && <p role="alert" className="text-xs text-destructive">{errors.address}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-xs font-medium">I want to</Label>
            <Select value={role} onValueChange={(val) => val && setRole(val as "customer" | "provider")} name="role">
              <SelectTrigger className="h-9 rounded-xl bg-white" aria-label="Role">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Book services — I need help at home</SelectItem>
                <SelectItem value="provider">Offer services — I provide help</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p role="alert" className="text-xs text-destructive">{errors.role}</p>}
          </div>

          <Button type="submit" className="h-9 w-full rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900" disabled={isLoading}>
            {isLoading ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            By creating an account you agree to our Terms and Privacy Policy.
          </p>
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
          Already have an account?{" "}
          <Link href={signInHref} className="font-medium text-zinc-900 hover:underline dark:text-white">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
