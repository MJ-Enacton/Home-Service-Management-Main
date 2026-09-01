import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getListingDetail } from "@/lib/db/queries/listings";
import { ServiceDetailClient } from "./ServiceDetailClient";

interface ServiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceDetailPage({
  params,
}: ServiceDetailPageProps) {
  const { id } = await params;

  const [detail, session] = await Promise.all([
    getListingDetail(id),
    auth.api.getSession({ headers: await headers() }),
  ]);

  if (!detail || detail.status !== "active") {
    notFound();
  }

  const isOwner = session?.user.id === detail.card.provider.id;

  return (
    <ServiceDetailClient
      listing={detail.card}
      tiers={detail.tiers}
      imageCount={detail.images.length}
      providerBio={detail.providerBio}
      reviews={detail.reviews}
      viewerAddress={session?.user.address ?? null}
      viewerUser={session?.user ?? null}
      isOwner={isOwner}
      isAuthenticated={Boolean(session?.user)}
    />
  );
}
