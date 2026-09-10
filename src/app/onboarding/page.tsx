"use client";

import { useState, useEffect } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { sendWelcomeEmailForCurrentUser } from "@/lib/email/welcome";
import { useRouter, useSearchParams } from "next/navigation";
import { getSafeNext } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapLocationPicker,
  type PickedLocation,
} from "@/components/MapLocationPicker";

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeNext = getSafeNext(searchParams.get("next"));
  const { data: session, isPending } = useSession();
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [role, setRole] = useState<"customer" | "provider">("customer");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push(
        safeNext ? `/sign-in?next=${encodeURIComponent(safeNext)}` : "/sign-in",
      );
    } else if (session?.user?.contact && session?.user?.address) {
      if (session.user.role === "provider") router.push("/provider/dashboard");
      else router.push(safeNext ?? "/");
    }
  }, [session, isPending, router, safeNext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) {
      alert("Please enter your contact number.");
      return;
    }
    if (!location) {
      alert("Please pick your address on the map (or search above).");
      return;
    }

    setIsLoading(true);
    const { error } = await authClient.updateUser({
      contact: contact.trim(),
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      role,
    });

    setIsLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    // Role-based welcome email for OAuth signups (best-effort).
    void sendWelcomeEmailForCurrentUser().catch(() => undefined);

    if (role === "provider") {
      router.push("/provider/dashboard");
    } else {
      router.push(safeNext ?? "/");
    }
  };

  if (isPending || !session?.user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg border-none shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Complete your profile
          </CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400">
            Add your contact and pick your address on the map
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number</Label>
              <Input
                id="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="+91 98765 43210"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Home address (map picker)</Label>
              <MapLocationPicker onChange={setLocation} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(val) => val && setRole(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !location}>
              {isLoading ? "Saving..." : "Complete Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
