import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listAdminBookings } from "@/lib/db/queries/admin-bookings";
import { AdminBookingsClient } from "./AdminBookingsClient";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  if (session.user.role !== "admin") redirect("/");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params?.page ?? "1", 10));
  const search = params?.search ?? "";
  const status = params?.status ?? "";

  const { items, total } = await listAdminBookings({
    search,
    status,
    page,
    pageSize: 15,
  });

  return (
    <AdminBookingsClient
      bookings={items}
      total={total}
      page={page}
      search={search}
      status={status}
    />
  );
}