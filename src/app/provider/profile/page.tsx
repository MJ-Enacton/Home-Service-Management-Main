import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { providerAvailability, providerProfiles } from "@/lib/db/schema";
import type { AvailabilityWindow } from "@/lib/availability";
import { hasPassword } from "@/lib/auth/passwordConfigured";
import { ChangePasswordDialog } from "@/components/profile/change-password-dialog";
import { SignOutCard } from "@/components/auth/SignOutDialog";
import { ProviderProfileEditor } from "@/components/profile/ProviderProfileEditor";
import { AvailabilityEditor } from "@/components/profile/AvailabilityEditor";
import { SharedProfileHeader } from "@/components/profile/SharedProfileHeader";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, MapPin, Phone, UserRound } from "lucide-react";

export default async function ProviderProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  if (session.user.role !== "provider") redirect("/");
  const user = session.user;
  const passwordConfigured = await hasPassword(user.id);

  let providerProfile: typeof providerProfiles.$inferSelect | null = null;
  let availability: AvailabilityWindow[] = [];
  const [profileRow, availabilityRows] = await Promise.all([
    db.select().from(providerProfiles).where(eq(providerProfiles.userId, user.id)).limit(1),
    db.select({ dayOfWeek: providerAvailability.dayOfWeek, startTime: providerAvailability.startTime, endTime: providerAvailability.endTime, isActive: providerAvailability.isActive }).from(providerAvailability).where(eq(providerAvailability.providerId, user.id)),
  ]);
  providerProfile = profileRow[0] ?? null;
  availability = availabilityRows;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-12 md:px-6 md:pt-8">
      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4 sm:px-6">
          <BackButton className="mb-3 -ml-1" href="/provider/dashboard" />
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Personal info, address and availability.
          </p>
        </div>
        <div className="space-y-6 p-4 sm:p-6">
          <SharedProfileHeader name={user.name} email={user.email} image={user.image} role={user.role} contact={user.contact} />

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Personal information</CardTitle><CardDescription>Your basic contact information.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <ProfileItem icon={<UserRound className="size-4" />} label="Full name" value={user.name || "Not provided"} />
                <Separator />
                <ProfileItem icon={<Mail className="size-4" />} label="Email" value={user.email} />
                <Separator />
                <ProfileItem icon={<Phone className="size-4" />} label="Contact" value={user.contact || "Not provided"} />
              </CardContent>
            </Card>
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader><CardTitle>Service address</CardTitle><CardDescription>Your address for home service requests.</CardDescription></CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary"><MapPin className="size-4" /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Address</p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">{user.address || "No address added yet"}</p>
                      {typeof user.latitude === "number" && typeof user.longitude === "number" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Pinned at {user.latitude.toFixed(4)}, {user.longitude.toFixed(4)} ·{" "}
                          <a
                            className="underline underline-offset-2"
                            target="_blank"
                            rel="noreferrer"
                            href={`https://www.openstreetmap.org/?mlat=${user.latitude}&mlon=${user.longitude}#map=15/${user.latitude}/${user.longitude}`}
                          >
                            View on map
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              {passwordConfigured && (
                <Card>
                  <CardHeader><CardTitle>Security</CardTitle><CardDescription>Manage your account password.</CardDescription></CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex-1"><p className="text-sm font-medium">Password</p><p className="mt-1 text-sm text-muted-foreground">Change your password to keep your account secure.</p></div>
                      <ChangePasswordDialog />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <ProviderProfileEditor
            initial={{
              bio: providerProfile?.bio ?? "",
              yearsExperience: providerProfile?.yearsExperience ?? 0,
              serviceAreas: Array.isArray(providerProfile?.serviceAreas) ? providerProfile.serviceAreas : [],
              hasAvatar: Boolean(providerProfile?.avatarUrl),
              avatarPublicId: providerProfile?.avatarPublicId ?? null,
              avatarUrl: providerProfile?.avatarUrl ?? null,
            }}
          />
        <AvailabilityEditor initial={availability} />
        <SignOutCard />
        </div>
      </Card>
    </main>
  );
}

function ProfileItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 wrap-break-word text-sm text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
