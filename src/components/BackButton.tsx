"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  label?: string;
  className?: string;
  /** visual style for light or dark backgrounds */
  variant?: "default" | "on-dark";
}

export function BackButton({
  label = "Back",
  className,
  variant = "default",
}: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className={cn(
        variant === "on-dark"
          ? "-ml-2 text-white/90 hover:bg-white/15 hover:text-white"
          : "-ml-2 text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="size-4" />
      {label}
    </Button>
  );
}
