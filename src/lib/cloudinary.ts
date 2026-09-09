import { v2 as cloudinary } from "cloudinary";
import { and, eq, inArray, lt } from "drizzle-orm";

import { db } from "@/lib/db/db";
import { pendingUploads } from "@/lib/db/schema";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env for Cloudinary.`);
  return value;
}

export const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

export type CloudinaryPurpose = "listings" | "avatar";

export const CLOUDINARY_FOLDERS: Record<CloudinaryPurpose, string> = {
  listings: "handyhub/listings",
  avatar: "handyhub/avatars",
};

export const CLOUDINARY_MAX_BYTES = 2 * 1024 * 1024;
export const CLOUDINARY_ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"] as const;

function configured() {
  cloudinary.config({
    cloud_name: required("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"),
    api_key: required("CLOUDINARY_API_KEY"),
    api_secret: required("CLOUDINARY_API_SECRET"),
    secure: true,
  });
}

/**
 * Exact params signed AND sent on every direct browser upload.
 * Keep this set minimal and string-only: Cloudinary recomputes the
 * signature from the params actually received, so anything signed but
 * not sent (or vice versa) fails with "Invalid Signature".
 */
export interface SignedUploadParams {
  timestamp: number;
  folder: string;
  public_id: string;
}

/** Build deterministic params to sign for a direct browser upload. */
export function buildSignParams(
  purpose: CloudinaryPurpose,
  publicId: string,
): SignedUploadParams {
  return {
    timestamp: Math.floor(Date.now() / 1000),
    folder: CLOUDINARY_FOLDERS[purpose],
    public_id: publicId,
  };
}

/**
 * Bare asset id (no folder prefix). Sent as `public_id` alongside the
 * separate `folder` param, so Cloudinary stores `folder/id` exactly once.
 * The upload response returns the full `folder/id` path.
 */
export function newPublicId(): string {
  return crypto.randomUUID();
}

/** HMAC-SHA1 signature over sorted params (valid ~1hr per timestamp). */
export function signUploadParams(params: SignedUploadParams): string {
  configured();
  return cloudinary.utils.api_sign_request(
    params as unknown as Record<string, string | number>,
    required("CLOUDINARY_API_SECRET"),
  );
}

export function getApiKey(): string {
  return required("CLOUDINARY_API_KEY");
}

/** Server-side delete (signed). Best-effort — callers must not fail on error. */
export async function destroyAsset(publicId: string): Promise<void> {
  try {
    configured();
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (err) {
    console.error("[cloudinary] destroy failed:", publicId, err);
  }
}

/** Accept only our own delivery URLs to prevent hotlink injection. */
export function isOwnCloudinaryUrl(url: string, cloudName: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.split("/").filter(Boolean)[0] === cloudName
    );
  } catch {
    return false;
  }
}

export function isOwnedPublicId(
  publicId: string,
  purpose: CloudinaryPurpose,
): boolean {
  return publicId.startsWith(`${CLOUDINARY_FOLDERS[purpose]}/`);
}

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const STALE_PURGE_LIMIT = 50;

/** Record a freshly signed public_id so orphans can be destroyed by owner. */
export async function recordPendingUpload(
  userId: string,
  publicId: string,
  purpose: CloudinaryPurpose,
): Promise<void> {
  try {
    await db
      .insert(pendingUploads)
      .values({ publicId, userId, purpose })
      .onConflictDoNothing({ target: pendingUploads.publicId });
  } catch (err) {
    console.error("[cloudinary] record pending failed:", err);
  }
}

/** Mark public_ids as attached (no longer pending). */
export async function consumePendingUploads(
  userId: string,
  publicIds: string[],
): Promise<void> {
  if (publicIds.length === 0) return;
  try {
    for (const chunk of chunked(publicIds, 50)) {
      await db
        .delete(pendingUploads)
        .where(
          and(
            eq(pendingUploads.userId, userId),
            inArray(pendingUploads.publicId, chunk),
          ),
        );
    }
  } catch (err) {
    console.error("[cloudinary] consume pending failed:", err);
  }
}

/**
 * Destroy an unattached upload owned by this user (uploaded but removed
 * before save). Returns false unless the pending row belongs to the user —
 * live/foreign assets can never be deleted through this path.
 */
export async function destroyPendingUpload(
  userId: string,
  publicId: string,
): Promise<boolean> {
  try {
    const [row] = await db
      .select({ publicId: pendingUploads.publicId })
      .from(pendingUploads)
      .where(
        and(
          eq(pendingUploads.userId, userId),
          eq(pendingUploads.publicId, publicId),
        ),
      );
    if (!row) return false;
    await destroyAsset(publicId);
    await db
      .delete(pendingUploads)
      .where(eq(pendingUploads.publicId, publicId));
    return true;
  } catch (err) {
    console.error("[cloudinary] destroy pending failed:", err);
    return false;
  }
}

/** Destroy the user's uploads abandoned >24h ago (tab closed, never saved). */
export async function purgeStalePendingUploads(userId: string): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - STALE_AFTER_MS);
    const stale = await db
      .select({ publicId: pendingUploads.publicId })
      .from(pendingUploads)
      .where(
        and(
          eq(pendingUploads.userId, userId),
          lt(pendingUploads.createdAt, cutoff),
        ),
      )
      .limit(STALE_PURGE_LIMIT);
    for (const row of stale) {
      await destroyAsset(row.publicId);
      await db
        .delete(pendingUploads)
        .where(eq(pendingUploads.publicId, row.publicId));
    }
  } catch (err) {
    console.error("[cloudinary] purge stale pending failed:", err);
  }
}

function chunked<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
