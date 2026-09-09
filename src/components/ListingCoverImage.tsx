"use client";

import { useEffect, useState } from "react";
import { CldImage } from "next-cloudinary";

interface ListingCoverImageProps {
  publicId: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  width?: number;
  height?: number;
  /** called when there is no image to serve (no publicId or CDN failure) */
  onMissing?: () => void;
}

/**
 * Cloudinary-only cover image (next-cloudinary `CldImage` with automatic
 * f_auto/q_auto + responsive sizing). Without a publicId (or on CDN
 * failure) it renders nothing and reports missing so the caller shows
 * its placeholder.
 */
export function ListingCoverImage({
  publicId,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 400px",
  width = 640,
  height = 360,
  onMissing,
}: ListingCoverImageProps) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const [failed, setFailed] = useState(false);

  const missing = !publicId || !cloudName || failed;
  useEffect(() => {
    if (missing) onMissing?.();
  }, [missing, onMissing]);

  if (missing) return null;

  return (
    <CldImage
      src={publicId}
      width={width}
      height={height}
      alt={alt}
      crop="fill"
      gravity="auto"
      sizes={sizes}
      className={className}
      onError={() => setFailed(true)}
      loading="eager"
    />
  );
}
