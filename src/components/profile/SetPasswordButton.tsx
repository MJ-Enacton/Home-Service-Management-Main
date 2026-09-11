"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

/**
 * For OAuth-only accounts (no credential row): emails a setup link via the
 * standard reset flow — using it creates the password on first use.
 */
export function SetPasswordButton({ email }: { email: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setIsLoading(false);
    if (error) {
      setError(error.message ?? "Could not send the link. Try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Check your inbox for a link to set your password. It expires in 1
        hour.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? "Sending…" : "Email me a setup link"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
