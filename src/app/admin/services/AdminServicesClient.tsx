"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BadgeCheck, Search, ShieldOff, Wrench } from "lucide-react";

import type { ModerationRow } from "./page";
import { setListingStatus, setListingVerified } from "./actions";
import { formatCents } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

const STATUS_BADGE: Record<ModerationRow["status"], string> = {
  active: "border-green-400 bg-green-100/50 text-green-700",
  inactive: "border-amber-400 bg-amber-100/50 text-amber-700",
  draft: "border-zinc-400 bg-zinc-100/50 text-zinc-600",
};

export function AdminServicesClient({ listings }: { listings: ModerationRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const filtered = listings.filter((listing) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      listing.title.toLowerCase().includes(query) ||
      listing.providerName.toLowerCase().includes(query)
    );
  });

  function toggleVerified(listing: ModerationRow) {
    startTransition(async () => {
      const result = await setListingVerified(listing.id, !listing.isVerified);
      toast.add({
        title: result.success
          ? listing.isVerified
            ? "Verification removed"
            : "Listing verified"
          : result.error,
        type: result.success ? "success" : "error",
      });
    });
  }

  function changeStatus(listing: ModerationRow, status: ModerationRow["status"]) {
    if (listing.status === status) return;
    startTransition(async () => {
      const result = await setListingStatus(listing.id, status);
      if (!result.success) {
        toast.add({ title: result.error, type: "error" });
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Service Listings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Moderate provider listings — verify trustworthy providers and take
          unavailable services offline.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title or provider..."
            className="pl-8"
          />
        </div>
        <Badge variant="secondary">{listings.length} total</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Wrench className="size-8 text-muted-foreground" />
            <p className="font-medium">No listings found</p>
            <p className="text-sm text-muted-foreground">
              Provider listings will appear here once created.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((listing) => (
            <Card key={listing.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/services/${listing.id}`}
                      className="truncate font-semibold hover:underline"
                    >
                      {listing.title}
                    </Link>
                    <Badge variant="outline" className={STATUS_BADGE[listing.status]}>
                      {listing.status}
                    </Badge>
                    {listing.isVerified && (
                      <Badge variant="success">
                        <BadgeCheck className="size-3.5" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {listing.description || "No description"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    by {listing.providerName}
                    {listing.categoryName ? ` · ${listing.categoryName}` : ""} ·{" "}
                    {formatCents(listing.basePriceCents)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={listing.isVerified ? "outline" : "default"}
                    disabled={isPending}
                    onClick={() => toggleVerified(listing)}
                  >
                    {listing.isVerified ? (
                      <>
                        <ShieldOff className="size-3.5" />
                        Unverify
                      </>
                    ) : (
                      <>
                        <BadgeCheck className="size-3.5" />
                        Verify
                      </>
                    )}
                  </Button>
                  {listing.status !== "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => changeStatus(listing, "active")}
                    >
                      Activate
                    </Button>
                  )}
                  {listing.status !== "inactive" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => changeStatus(listing, "inactive")}
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
