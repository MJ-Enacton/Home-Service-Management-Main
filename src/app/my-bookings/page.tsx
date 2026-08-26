import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { resolveRole } from "@/lib/roles";
import {
  listBookingsForCustomer,
  listBookingsForProvider,
} from "@/lib/db/queries/bookings";
import { MyBookingsClient } from "./MyBookingsClient";

export default async function MyBookingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in");
  }

  const role = resolveRole(session.user.role);

  const bookings =
    role === "provider"
      ? await listBookingsForProvider(session.user.id)
      : await listBookingsForCustomer(session.user.id);

  return <MyBookingsClient role={role} bookings={bookings} />;
}
