import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** Image height in px. Width scales automatically to preserve aspect. */
  height?: number;
  /** Wrap the link; defaults to home. Set to null to render without a link. */
  href?: string | null;
  className?: string;
  priority?: boolean;
}

/**
 * Shared HandyHub brand mark.
 * Uses `/HandyHub_logo.png` only (never the tagline variant).
 * The PNG is transparent, so it renders directly with no chip behind it.
 */
export function BrandLogo({
  height = 32,
  href = "/",
  className,
  priority = false,
}: BrandLogoProps) {
  // Source file is ~square-ish lockup (icon + wordmark); keep ratio fluid
  // and let height drive the size.
  const width = Math.round(height * 2.4);

  const logo = (
    <span
      className={cn("inline-flex items-center", className)}
      style={{ height }}
    >
      <Image
        src="/HandyHub_logo.png"
        alt="HandyHub"
        width={width}
        height={height}
        priority={priority}
        style={{ height, width: "auto" }}
      />
    </span>
  );

  if (href === null) return logo;

  return (
    <Link
      href={href}
      className="inline-flex items-center"
      aria-label="HandyHub home"
    >
      {logo}
    </Link>
  );
}
