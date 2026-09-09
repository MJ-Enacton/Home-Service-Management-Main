import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  buildSignParams,
  getApiKey,
  newPublicId,
  purgeStalePendingUploads,
  recordPendingUpload,
  signUploadParams,
  CLOUDINARY_CLOUD_NAME,
  type CloudinaryPurpose,
} from "@/lib/cloudinary";

const bodySchema = z.object({
  purpose: z.enum(["listings", "avatar"]),
});

/**
 * Signed direct-upload params for browser -> Cloudinary.
 * Image bytes never touch the Next server; we only HMAC-sign
 * {timestamp, folder, public_id}.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "provider") {
    return NextResponse.json(
      { error: "Only providers can upload images." },
      { status: 403 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid purpose." }, { status: 400 });
  }
  const purpose: CloudinaryPurpose = parsed.data.purpose;

  if (!CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json(
      { error: "Cloudinary is not configured." },
      { status: 500 },
    );
  }

  const publicId = newPublicId();
  const params = buildSignParams(purpose, publicId);
  const signature = signUploadParams(params);

  // Track so uploads discarded before save can be destroyed by owner;
  // opportunistically purge this user's uploads abandoned >24h ago.
  await recordPendingUpload(session.user.id, publicId, purpose);
  void purgeStalePendingUploads(session.user.id);

  // Response mirrors the signed set exactly — the client must send
  // these same params (plus file/api_key) or the signature won't verify.
  return NextResponse.json({
    signature,
    timestamp: params.timestamp,
    apiKey: getApiKey(),
    cloudName: CLOUDINARY_CLOUD_NAME,
    folder: params.folder,
    publicId,
  });
}
