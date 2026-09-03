"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Search, Wrench, Check, X } from "lucide-react";

import type { ModerationRow } from "./page";
import { setListingStatus, approveListing, rejectListing } from "./actions";
import { formatCents } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

const STATUS_BADGE: Record<ModerationRow["status"], string> = {
  active: "border-green-400 bg-green-100/50 text-green-700",
  inactive: "border-amber-400 bg-amber-100/50 text-amber-700",
  draft: "border-zinc-400 bg-zinc-100/50 text-zinc-600",
  pending: "border-blue-400 bg-blue-100/50 text-blue-700",
  rejected: "border-red-400 bg-red-100/50 text-red-700",
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

  function changeStatus(listing: ModerationRow, status: ModerationRow["status"]) {
    if (listing.status === status) return;
    startTransition(async () => {
      const result = await setListingStatus(listing.id, status);
      if (!result.success) {
        toast.add({ title: result.error, type: "error" });
      }
    });
  }

  function handleApprove(listing: ModerationRow) {
    startTransition(async () => {
      const result = await approveListing(listing.id);
      if (!result.success) {
        toast.add({ title: result.error, type: "error" });
      } else {
        toast.add({ title: "Service approved", type: "success" });
      }
    });
  }

  function handleReject(listing: ModerationRow) {
    startTransition(async () => {
      const result = await rejectListing(listing.id);
      if (!result.success) {
        toast.add({ title: result.error, type: "error" });
      } else {
        toast.add({ title: "Service rejected", type: "success" });
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Listings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review pending services and manage visibility.</p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or provider" className="h-9 rounded-full pl-9 text-sm" />
        </div>
        <Badge variant="secondary" className="rounded-full">{listings.length}</Badge>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white py-12 text-center dark:bg-zinc-900">
          <Wrench className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No listings</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">When providers create services they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((listing) => (
            <div key={listing.id} className="flex flex-col gap-3 rounded-xl border bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between dark:bg-zinc-900 dark:border-zinc-800">
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
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {listing.description || "No description"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {listing.providerName}
                    {listing.categoryName ? ` · ${listing.categoryName}` : ""} · {formatCents(listing.basePriceCents)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {listing.status === "pending" ? (
                    <>
                      <Button size="sm" className="h-7 rounded-full bg-zinc-900 px-3 text-xs text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900" disabled={isPending} onClick={() => handleApprove(listing)}>
                        <Check className="size-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 rounded-full px-3 text-xs" disabled={isPending} onClick={() => handleReject(listing)}>
                        <X className="size-3" /> Reject
                      </Button>
                    </>
                  ) : (
                    <>
                      {listing.status !== "active" && (
                        <Button size="sm" variant="outline" className="h-7 rounded-full px-3 text-xs" disabled={isPending} onClick={() => changeStatus(listing, "active")}>
                          Activate
                        </Button>
                      )}
                      {listing.status !== "inactive" && listing.status !== "rejected" && (
                        <Button size="sm" variant="outline" className="h-7 rounded-full border-zinc-300 px-3 text-xs hover:bg-zinc-50 dark:border-zinc-700" disabled={isPending} onClick={() => changeStatus(listing, "inactive")}>
                          Deactivate
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
          ))}
        </div>
      )}
    </div>
  );
}
