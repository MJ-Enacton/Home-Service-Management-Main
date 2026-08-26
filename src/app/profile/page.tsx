import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import {
  providerAvailability,
  providerProfiles,
} from "@/lib/db/schema";
import type { AvailabilityWindow } from "@/lib/availability";
import { hasPassword } from "./_actions/passwordConfigured";
import { ChangePasswordDialog } from "@/components/profile/change-password-dialog";
import { ProviderProfileEditor } from "@/components/profile/ProviderProfileEditor";
import { AvailabilityEditor } from "@/components/profile/AvailabilityEditor";
import { BackButton } from "@/components/BackButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { Mail, MapPin, Phone, UserRound } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  const passwordConfigured = await hasPassword(user.id);

  // Provider-only data: professional profile + weekly availability.
  const isProvider = user.role === "provider";
  let providerProfile: typeof providerProfiles.$inferSelect | null = null;
  let availability: AvailabilityWindow[] = [];
  if (isProvider) {
    const [profileRow, availabilityRows] = await Promise.all([
      db
        .select()
        .from(providerProfiles)
        .where(eq(providerProfiles.userId, user.id))
        .limit(1),
      db
        .select({
          dayOfWeek: providerAvailability.dayOfWeek,
          startTime: providerAvailability.startTime,
          endTime: providerAvailability.endTime,
          isActive: providerAvailability.isActive,
        })
        .from(providerAvailability)
        .where(eq(providerAvailability.providerId, user.id)),
    ]);
    providerProfile = profileRow[0] ?? null;
    availability = availabilityRows;
  }

  const initials =
    user.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      {/* Page heading */}
      <BackButton className="mb-2" />
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">
          Account <span className="mx-1 text-border">/</span>{" "}
          <span className="font-medium text-foreground">Profile</span>
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Account Settings
        </h1>

        <p className="mt-2 text-muted-foreground">
          Manage your personal information, security, and preferences.
        </p>
      </div>

      {/* Profile header */}
      <Card className="mb-6 gap-0 overflow-hidden py-0">
        <div className="relative h-28 bg-primary">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-12 -left-8 size-40 rounded-full bg-white/10 blur-2xl"
          />
        </div>

        <CardContent className="flex flex-col gap-4 pt-0 sm:flex-row sm:items-end">
          <Avatar className="-mt-12 size-24 ring-4 ring-card">
            <AvatarImage src={user.image ?? undefined} alt={user.name} />

            <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 sm:pb-1">
            <h2 className="text-xl font-semibold">{user.name}</h2>

            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

            {user.role && (
              <Badge className="mt-3 capitalize">{user.role}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>Your basic contact information.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <ProfileItem
              icon={<UserRound className="size-4" />}
              label="Full name"
              value={user.name || "Not provided"}
            />

            <Separator />

            <ProfileItem
              icon={<Mail className="size-4" />}
              label="Email"
              value={user.email}
            />

            <Separator />

            <ProfileItem
              icon={<Phone className="size-4" />}
              label="Contact"
              value={user.contact || "Not provided"}
            />
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Service address */}
          <Card>
            <CardHeader>
              <CardTitle>Service address</CardTitle>
              <CardDescription>
                Your address for home service requests.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <MapPin className="size-4" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium">Address</p>

                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {user.address || "No address added yet"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          {passwordConfigured && (
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account password.</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Password</p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Change your password to keep your account secure.
                    </p>
                  </div>

                  <ChangePasswordDialog />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Provider-only sections */}
      {isProvider && (
        <div className="mt-6 grid gap-6">
          <ProviderProfileEditor
            initial={{
              bio: providerProfile?.bio ?? "",
              yearsExperience: providerProfile?.yearsExperience ?? 0,
              serviceAreas: Array.isArray(providerProfile?.serviceAreas)
                ? providerProfile.serviceAreas
                : [],
              hasAvatar: Boolean(providerProfile?.avatarData),
              avatarVersion: Math.floor(
                (providerProfile?.updatedAt?.getTime() ?? 0) / 1000,
              ),
            }}
          />

          <AvailabilityEditor initial={availability} />
        </div>
      )}
    </main>
  );
}

function ProfileItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-md bg-primary/10 p-2 text-primary">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>

        <p className="mt-1 wrap-break-word text-sm text-muted-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}
