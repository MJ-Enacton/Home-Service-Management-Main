"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BriefcaseBusiness, Pencil, Plus, Trash2 } from "lucide-react";

import type { MyListingRow } from "./page";
import { deleteListing } from "./actions";
import { getSocket } from "@/lib/socket/client";
import {
  enumLabel,
  formatCents,
  pricingUnitLabel,
} from "@/lib/format";
import { BackButton } from "@/components/BackButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

const STATUS_BADGE: Record<MyListingRow["status"], string> = {
  active: "border-green-400 bg-green-100/50 text-green-700",
  inactive: "border-amber-400 bg-amber-100/50 text-amber-700",
  draft: "border-zinc-400 bg-zinc-100/50 text-zinc-600",
  pending: "border-blue-400 bg-blue-100/50 text-blue-700",
  rejected: "border-red-400 bg-red-100/50 text-red-700",
};

export function MyServicesClient({ listings }: { listings: MyListingRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<MyListingRow | null>(null);
  const [items, setItems] = useState<MyListingRow[]>(listings);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Keep local state in sync when server revalidates / navigates
  const [prevListings, setPrevListings] = useState(listings);
  if (prevListings !== listings) {
    setPrevListings(listings);
    setItems(listings);
  }

  // Real-time: admin approve/reject/activate/deactivate pushes listing:updated + notification:new
  useEffect(() => {
    const socket = getSocket();

    type ListingUpdatedPayload = {
      listingId: string;
      status: MyListingRow["status"];
      title?: string;
    };

    const handleListingUpdated = (payload: ListingUpdatedPayload) => {
      if (!payload?.listingId || !payload?.status) return;
      const current = itemsRef.current;
      const existing = current.find((l) => l.id === payload.listingId);
      if (!existing || existing.status === payload.status) return;
      setItems((prev) => {
        const idx = prev.findIndex((l) => l.id === payload.listingId);
        if (idx === -1 || prev[idx].status === payload.status) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], status: payload.status };
        return next;
      });
      const label: Record<string, string> = {
        active: "activated",
        inactive: "deactivated",
        rejected: "rejected",
        pending: "pending review",
        draft: "moved to draft",
      };
      const verb = label[payload.status] ?? payload.status;
      toast.add({
        title: payload.title ? `"${payload.title}" ${verb}` : `Service ${verb}`,
        type:
          payload.status === "rejected" || payload.status === "inactive"
            ? "error"
            : "success",
      });
    };

    socket.on("listing:updated", handleListingUpdated);

    return () => {
      socket.off("listing:updated", handleListingUpdated);
    };
  }, []);

  function handleDelete() {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await deleteListing(target.id);
      if (!result.success) {
        toast.add({ title: result.error, type: "error" });
      } else {
        toast.add({ title: "Listing deleted", type: "success" });
        setItems((prev) => prev.filter((l) => l.id !== target.id));
      }
      setDeleting(null);
    });
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 md:px-6">
      <div className="mb-6">
        <BackButton className="mb-3" />
        <h1 className="text-xl font-semibold tracking-tight">My services</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage what customers can book — you can have up to 5 active.</p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 dark:bg-zinc-900">
        <Badge variant="secondary">{items.length} listings</Badge>
        <Link href="/provider/my-services/new">
          <Button size="sm">
            <Plus className="size-4" />
            New Service
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <Card className="overflow-hidden border-dashed bg-muted/40">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <BriefcaseBusiness className="size-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">No services yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create your first service listing so customers can find and
                book you.
              </p>
            </div>
            <Link href="/provider/my-services/new" className="mt-2">
              <Button>Create Your First Service</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((listing) => (
            <Card key={listing.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={`capitalize ${STATUS_BADGE[listing.status]}`}
                  >
                    {listing.status}
                  </Badge>
                </div>

                <div className="min-w-0">
                  <h3 className="line-clamp-2 font-semibold leading-snug">
                    {listing.title}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                    {listing.description || "No description yet."}
                  </p>
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {listing.categoryName && <p>{listing.categoryName}</p>}
                  <p>
                    {formatCents(listing.basePrice, { withCents: false })}
                    <span className="text-xs">
                      /{pricingUnitLabel(listing.pricingType)}
                    </span>
                    {listing.pricingType !== "fixed" && (
                      <span className="ml-1.5 text-xs">
                        ({enumLabel(listing.pricingType)})
                      </span>
                    )}
                  </p>
                </div>

                <div className="mt-auto flex gap-2 pt-2">
                  <Link href={`/provider/my-services/${listing.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setDeleting(listing)}
                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{deleting?.title}”?</DialogTitle>
            <DialogDescription>
              Listings with existing bookings cannot be deleted — deactivate
              them instead. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="size-4" />
              Delete listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
