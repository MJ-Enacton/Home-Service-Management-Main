import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listBookingsForProvider } from "@/lib/db/queries/bookings";
import { MyBookingsClient } from "@/components/bookings/MyBookingsClient";

export default async function ProviderMyBookingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  if (session.user.role !== "provider") redirect("/");
  const bookings = await listBookingsForProvider(session.user.id);
  return <MyBookingsClient role="provider" bookings={bookings} />;
}
