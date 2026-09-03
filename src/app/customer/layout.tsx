import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  if (session.user.role === "provider" || session.user.role === "admin") {
    // providers/admins should not access customer routes via proxy, but double-guard
    redirect("/");
  }
  return <>{children}</>;
}
