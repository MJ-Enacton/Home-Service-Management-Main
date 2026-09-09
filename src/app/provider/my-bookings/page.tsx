import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  listBookingsForCustomer,
  listBookingsForProvider,
} from "@/lib/db/queries/bookings";
import { MyBookingsClient } from "@/components/bookings/MyBookingsClient";

export default async function ProviderMyBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ review?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  if (session.user.role !== "provider") redirect("/");
  const [bookings, customerBookings] = await Promise.all([
    listBookingsForProvider(session.user.id),
    listBookingsForCustomer(session.user.id),
  ]);
  const reviewId = (await searchParams)?.review ?? null;
  return (
    <MyBookingsClient
      role="provider"
      bookings={bookings}
      customerBookings={customerBookings}
      initialReviewBookingId={reviewId}
    />
  );
}
