import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { providerProfiles } from "@/lib/db/schema";

/** Serves the signed-in provider's own profile photo. */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [profile] = await db
    .select({
      avatarData: providerProfiles.avatarData,
      avatarMime: providerProfiles.avatarMime,
    })
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, session.user.id));

  if (!profile?.avatarData) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = Buffer.from(profile.avatarData, "base64");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": profile.avatarMime ?? "image/jpeg",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "private, max-age=300",
    },
  });
}
