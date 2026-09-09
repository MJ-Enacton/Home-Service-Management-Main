import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  destroyPendingUpload,
  isOwnedPublicId,
  type CloudinaryPurpose,
} from "@/lib/cloudinary";

const bodySchema = z.object({
  public_id: z.string().min(1).max(300),
  purpose: z.enum(["listings", "avatar"]),
});

/**
 * Destroy an upload this provider made but discarded before saving.
 * Only succeeds for the caller's own still-pending public_ids — live or
 * foreign assets always get 404, so ids can't be probed or abused.
 */
export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "provider") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const purpose: CloudinaryPurpose = parsed.data.purpose;
  if (!isOwnedPublicId(parsed.data.public_id, purpose)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const deleted = await destroyPendingUpload(
    session.user.id,
    parsed.data.public_id,
  );
  if (!deleted) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
