import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listBookingsForCustomer } from "@/lib/db/queries/bookings";
import { MyBookingsClient } from "@/components/bookings/MyBookingsClient";

export default async function CustomerMyBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ review?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  if (session.user.role !== "customer") redirect("/");
  const bookings = await listBookingsForCustomer(session.user.id);
  const reviewId = (await searchParams)?.review ?? null;
  return (
    <MyBookingsClient
      role="customer"
      bookings={bookings}
      initialReviewBookingId={reviewId}
    />
  );
}
