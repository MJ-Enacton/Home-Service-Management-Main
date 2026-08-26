"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import type { MyListingRow } from "./page";
import { deleteListing } from "./actions";
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
};

export function MyServicesClient({ listings }: { listings: MyListingRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<MyListingRow | null>(null);

  function handleDelete() {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await deleteListing(target.id);
      if (!result.success) {
        toast.add({ title: result.error, type: "error" });
      } else {
        toast.add({ title: "Listing deleted", type: "success" });
      }
      setDeleting(null);
    });
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6">
      <div className="mb-8 border-b bg-muted/40 -mx-4 px-4 py-8 md:-mx-6 md:px-6">
        <BackButton className="mb-4" />
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            Account <span className="mx-1 text-border">/</span>{" "}
            <span className="font-medium text-foreground">My Services</span>
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            My Services
          </h1>
          <p className="text-muted-foreground">
            The listings customers can book with you.
          </p>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <Badge variant="secondary">{listings.length} listings</Badge>
        <Link href="/my-services/new">
          <Button size="sm">
            <Plus className="size-4" />
            New Service
          </Button>
        </Link>
      </div>

      {listings.length === 0 ? (
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
            <Link href="/my-services/new" className="mt-2">
              <Button>Create Your First Service</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Card key={listing.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={`capitalize ${STATUS_BADGE[listing.status]}`}
                  >
                    {listing.status}
                  </Badge>
                  {listing.isVerified && (
                    <Badge variant="success">
                      <BadgeCheck className="size-3.5" />
                      Verified
                    </Badge>
                  )}
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
                  <Link href={`/my-services/${listing.id}/edit`} className="flex-1">
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
