"use client";

export type SignPurpose = "listings" | "avatar";

interface SignResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
}

export interface UploadedImage {
  publicId: string;
  secureUrl: string;
}

async function requestSignature(purpose: SignPurpose): Promise<SignResponse> {
  const res = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Upload not allowed.");
  }
  return (await res.json()) as SignResponse;
}

/**
 * Signed direct upload: browser -> Cloudinary.
 * Server only signed {timestamp, folder, public_id}; bytes never touch Next.
 */
export async function uploadToCloudinary(
  file: File,
  purpose: SignPurpose,
): Promise<UploadedImage> {
  const sign = await requestSignature(purpose);
  // Send EXACTLY the signed params (plus file/api_key) — any extra or
  // missing field makes Cloudinary reject with "Invalid Signature".
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sign.apiKey);
  form.append("timestamp", String(sign.timestamp));
  form.append("signature", sign.signature);
  form.append("folder", sign.folder);
  form.append("public_id", sign.publicId);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
    { method: "POST", body: form },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { error?: { message?: string } }).error?.message ??
      "Upload failed.";
    throw new Error(message);
  }
  const body = (await res.json()) as {
    public_id: string;
    secure_url: string;
  };
  if (!body.public_id || !body.secure_url) throw new Error("Upload failed.");
  return { publicId: body.public_id, secureUrl: body.secure_url };
}
