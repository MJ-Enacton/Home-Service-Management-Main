import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveRole } from "@/lib/roles";

export default async function NotificationsLegacyPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  const role = resolveRole(session.user.role);
  redirect(role === "provider" ? "/provider/notifications" : "/customer/notifications");
}
