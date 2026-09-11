"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Plus, Save, X } from "lucide-react";

import type { PricingType } from "@/types";
import type { TierOption } from "@/types";
import { parseCents } from "@/lib/format";
import type { ActionResult } from "@/types";
import { saveListing } from "./actions";
import { uploadToCloudinary } from "@/lib/cloudinary-client";
import { getCldImageUrl } from "next-cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import {
  LISTING_DESCRIPTION_MAX_LENGTH,
  LISTING_TITLE_MAX_LENGTH,
} from "@/lib/validators";

const MAX_IMAGE_MB = 2;

export interface EditorExistingImage {
  id: string;
  publicId: string | null;
  secureUrl: string | null;
  altText: string | null;
}

export interface EditorInitialData {
  id: string;
  title: string;
  description: string;
  categorySlug: string;
  pricingType: PricingType;
  basePriceCents: number;
  location: string;
  estimatedDuration: string;
  tags: string[];
  status: "active" | "inactive" | "draft" | "pending" | "rejected";
  tiers: TierOption[];
  /** images already stored server-side, in display order */
  images: EditorExistingImage[];
}

interface CategoryOptionLite {
  slug: string;
  name: string;
}

interface EditorImage {
  key: string;
  /** DB row id — present only for already-saved images */
  id?: string;
  publicId: string;
  secureUrl: string;
  previewUrl: string;
  uploading: boolean;
}

/** Best-effort delete of an upload discarded before save (stale purge covers failures). */
async function discardPendingUpload(publicId: string): Promise<void> {
  try {
    await fetch("/api/cloudinary/orphan", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId, purpose: "listings" }),
    });
  } catch {
    // The 24h stale purge in the sign route cleans up anything missed.
  }
}

interface TierDraft {
  name: string;
  description: string;
  priceDollars: string;
}

interface ListingEditorProps {
  categories: CategoryOptionLite[];
  initial?: EditorInitialData;
}

const EMPTY_TIER: TierDraft = { name: "", description: "", priceDollars: "" };

export function ListingEditor({ categories, initial }: ListingEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categorySlug, setCategorySlug] = useState(
    initial?.categorySlug ?? categories[0]?.slug ?? "",
  );
  const [pricingType, setPricingType] = useState<PricingType>(
    initial?.pricingType ?? "hourly",
  );
  const [basePriceDollars, setBasePriceDollars] = useState(
    initial ? (initial.basePriceCents / 100).toFixed(2) : "",
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [estimatedDuration, setEstimatedDuration] = useState(
    initial?.estimatedDuration ?? "",
  );
  const [tagsString, setTagsString] = useState(initial?.tags.join(", ") ?? "");
  const [status, setStatus] = useState<"active" | "inactive" | "draft" | "pending" | "rejected">(
    initial?.status ?? "active",
  );

  const [tiers, setTiers] = useState<TierDraft[]>(
    initial
      ? initial.tiers.map((tier) => ({
          name: tier.name,
          description: tier.description ?? "",
          priceDollars: (tier.priceCents / 100).toFixed(2),
        }))
      : [],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelledUploads = useRef(new Set<string>());
  const uploadSeq = useRef(0);
  const [images, setImages] = useState<EditorImage[]>(() => {
    if (!initial) return [];
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    return initial.images.map((img) => {
      let preview = "";
      if (img.secureUrl) {
        preview = img.secureUrl;
      } else if (img.publicId && cloudName) {
        preview = getCldImageUrl({
          src: img.publicId,
          width: 320,
          height: 256,
          crop: "fill",
          gravity: "auto",
        });
      }
      return {
        key: img.id,
        id: img.id,
        publicId: img.publicId ?? "",
        secureUrl: img.secureUrl ?? "",
        previewUrl: preview,
        uploading: false,
      };
    });
  });
  const [imageError, setImageError] = useState("");
  const [uploadingCount, setUploadingCount] = useState(0);
  const isUploading = uploadingCount > 0;
  const usedSlots = images.length + uploadingCount;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setImageError("");
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const room = 6 - usedSlots;
    if (room <= 0) {
      setImageError("Up to 6 images allowed.");
      return;
    }

    for (const file of files.slice(0, room)) {
      if (!file.type.startsWith("image/")) {
        setImageError("Only image files are allowed.");
        continue;
      }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        setImageError(`Each image must be smaller than ${MAX_IMAGE_MB} MB.`);
        continue;
      }
      const localPreview = URL.createObjectURL(file);
      uploadSeq.current += 1;
      const tempKey = `temp-${uploadSeq.current}`;
      // Optimistic placeholder so the grid feels instant while signing+uploading.
      setImages((prev) => [
        ...prev,
        {
          key: tempKey,
          publicId: tempKey,
          secureUrl: "",
          previewUrl: localPreview,
          uploading: true,
        },
      ]);
      setUploadingCount((c) => c + 1);
      try {
        const uploaded = await uploadToCloudinary(file, "listings");
        if (cancelledUploads.current.has(tempKey)) {
          // Removed mid-upload: destroy the orphan right away.
          cancelledUploads.current.delete(tempKey);
          void discardPendingUpload(uploaded.publicId);
          setImages((prev) => prev.filter((img) => img.key !== tempKey));
        } else {
          setImages((prev) =>
            prev.map((img) =>
              img.key === tempKey
                ? {
                    key: uploaded.publicId,
                    publicId: uploaded.publicId,
                    secureUrl: uploaded.secureUrl,
                    previewUrl: uploaded.secureUrl,
                    uploading: false,
                  }
                : img,
            ),
          );
        }
      } catch (err) {
        setImages((prev) => prev.filter((img) => img.key !== tempKey));
        setImageError(
          err instanceof Error ? err.message : "Image upload failed.",
        );
      } finally {
        URL.revokeObjectURL(localPreview);
        setUploadingCount((c) => Math.max(0, c - 1));
      }
    }
  }

  function removeImage(index: number) {
    const target = images[index];
    if (!target) return;
    if (target.uploading) {
      // Upload still in flight — the success handler destroys the orphan.
      cancelledUploads.current.add(target.key);
    } else if (!target.id && target.publicId) {
      // Fresh upload, never saved — destroy now so Cloudinary stays clean.
      void discardPendingUpload(target.publicId);
    }
    // Already-saved images are only destroyed server-side on save (diff),
    // so navigating away without saving never loses data.
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function addTier() {
    if (tiers.length < 5) setTiers((prev) => [...prev, { ...EMPTY_TIER }]);
  }

  function updateTier(index: number, patch: Partial<TierDraft>) {
    setTiers((prev) =>
      prev.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)),
    );
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (isUploading) {
      toast.add({
        title: "Wait for image uploads to finish.",
        type: "error",
      });
      return;
    }    const basePriceCents = parseCents(basePriceDollars);
    if (basePriceCents === null || !title.trim()) {
      toast.add({
        title: "Title and a valid base price are required.",
        type: "error",
      });
      return;
    }
    if (title.trim().length < 5) {
      toast.add({
        title: "Title must be at least 5 characters.",
        type: "error",
      });
      return;
    }
    if (title.trim().length > LISTING_TITLE_MAX_LENGTH) {
      toast.add({
        title: `Title must be at most ${LISTING_TITLE_MAX_LENGTH} characters.`,
        type: "error",
      });
      return;
    }
    if (description.trim().length > LISTING_DESCRIPTION_MAX_LENGTH) {
      toast.add({
        title: `Description must be at most ${LISTING_DESCRIPTION_MAX_LENGTH} characters.`,
        type: "error",
      });
      return;
    }
    if (!location.trim()) {
      toast.add({ title: "Service area is required.", type: "error" });
      return;
    }
    if (!estimatedDuration.trim()) {
      toast.add({ title: "Hours is required.", type: "error" });
      return;
    }
    const tagList = tagsString
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (tagList.length === 0) {
      toast.add({ title: "At least one tag is required.", type: "error" });
      return;
    }
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i]!;
      if (!tier.name.trim()) {
        toast.add({ title: `Tier ${i + 1} needs a name.`, type: "error" });
        return;
      }
      if (parseCents(tier.priceDollars) === null) {
        toast.add({
          title: `Tier "${tier.name}" needs a valid price.`,
          type: "error",
        });
        return;
      }
    }

    startTransition(async () => {
      const result: ActionResult = await saveListing({
        id: initial?.id ?? null,
        status,
        listing: {
          title: title.trim(),
          description: description.trim() || null,
          categorySlug,
          pricingType,
          basePriceCents,
          location: location.trim(),
          estimatedDuration: estimatedDuration.trim(),
          tags: tagList.slice(0, 10),
        },
        tiers: tiers.map((tier, index) => ({
          name: tier.name.trim(),
          description: tier.description.trim() || null,
          priceCents: parseCents(tier.priceDollars)!,
          displayOrder: index,
        })),
        images: images
          .filter((image) => !image.uploading && (image.id || image.secureUrl))
          .map((image) => ({
            id: image.id ?? null,
            publicId: image.publicId || null,
            secureUrl: image.secureUrl || null,
            altText: title.trim(),
          })),
      });

      if (!result.success) {
        toast.add({ title: result.error, type: "error" });
        return;
      }

      toast.add({
        title: initial ? "Listing updated" : "Listing created",
        type: "success",
      });
      router.push("/provider/my-services");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {/* Basics */}
        <Card>
          <CardContent className="space-y-5 p-6">
            <h2 className="font-semibold">Basics</h2>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Deep home cleaning — 3 bedrooms"
                className="bg-background"
                aria-describedby="title-hint"
              />
              <div className="flex items-center justify-between gap-2">
                <p id="title-hint" className="text-xs text-muted-foreground">Max {LISTING_TITLE_MAX_LENGTH} characters</p>
                <span aria-live="polite" className={`text-xs tabular-nums ${title.length > LISTING_TITLE_MAX_LENGTH ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                  {title.length}/{LISTING_TITLE_MAX_LENGTH}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What's included, what customers can expect…"
                rows={4}
                maxLength={LISTING_DESCRIPTION_MAX_LENGTH}
                className="bg-background"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={categorySlug}
                  onValueChange={(value) => value && setCategorySlug(value)}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Pick a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.slug} value={category.slug}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Hours / Estimated duration *</Label>
                <Input
                  id="duration"
                  value={estimatedDuration}
                  onChange={(event) => setEstimatedDuration(event.target.value)}
                  placeholder='e.g. "2-4 hours"'
                  maxLength={60}
                  className="bg-background"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Service area *</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="e.g. Downtown & suburbs"
                  maxLength={120}
                  className="bg-background"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated) *</Label>
                <Input
                  id="tags"
                  value={tagsString}
                  onChange={(event) => setTagsString(event.target.value)}
                  placeholder="eco-friendly, same-day"
                  className="bg-background"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardContent className="space-y-5 p-6">
            <h2 className="font-semibold">Pricing</h2>

            {tiers.length === 0 ? (
              <>
                <div className="space-y-2">
                  <Label>Pricing type *</Label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { value: "hourly", label: "Hourly rate" },
                        { value: "fixed", label: "Fixed price" },
                        { value: "visit", label: "Per visit" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPricingType(option.value)}
                        className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                          pricingType === option.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "hover:border-primary/50"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-w-xs space-y-2">
                  <Label htmlFor="basePrice">Base price (₹) *</Label>
                  <div className="relative">
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      id="basePrice"
                      type="number"
                      min={0}
                      step="0.01"
                      value={basePriceDollars}
                      onChange={(event) =>
                        setBasePriceDollars(event.target.value)
                      }
                      className="pl-7 bg-background"
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tiers define the pricing. Base price and pricing type are not
                required when tiers are set.
              </p>
            )}

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Pricing tiers (optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTier}
                  disabled={tiers.length >= 5}
                >
                  <Plus className="size-3.5" />
                  Add tier
                </Button>
              </div>
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_120px_auto]"
                >
                  <div className="space-y-1.5">
                    <Input
                      value={tier.name}
                      onChange={(event) =>
                        updateTier(index, { name: event.target.value })
                      }
                      placeholder="Tier name e.g. Standard"
                      className="bg-background"
                      maxLength={80}
                    />
                    <Input
                      value={tier.description}
                      onChange={(event) =>
                        updateTier(index, { description: event.target.value })
                      }
                      placeholder="Short description (optional)"
                      className="bg-background"
                      maxLength={300}
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute top-1.5 left-3 text-sm text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={tier.priceDollars}
                      onChange={(event) =>
                        updateTier(index, { priceDollars: event.target.value })
                      }
                      className="pl-7 bg-background"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove tier ${index + 1}`}
                    onClick={() => removeTier(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Photos</h2>
              <span className="text-xs text-muted-foreground">
                Up to 6 · max {MAX_IMAGE_MB} MB each
              </span>
            </div>

            {images.length > 0 && (
              <p className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
                {initial
                  ? "Removing a photo deletes it when you save. The first photo is the cover image."
                  : "The first photo is used as the cover image."}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {images.map((image, index) => (
                <div
                  key={image.key}
                  className="relative h-24 w-32 overflow-hidden rounded-lg ring-1 ring-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.previewUrl}
                    alt={image.id ? `Photo ${index + 1}` : `Upload ${index + 1}`}
                    className={`h-full w-full object-cover ${image.uploading ? "opacity-50" : ""}`}
                  />
                  {image.uploading && (
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] font-medium text-white">
                      Uploading…
                    </span>
                  )}
                  {!image.uploading && !image.id && (
                    <span className="absolute top-1 left-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      New
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 rounded-full bg-white/95 p-1 shadow hover:bg-white dark:bg-zinc-900/95"
                  >
                    <X className="size-3 text-red-500" />
                  </button>
                </div>
              ))}

              {usedSlots < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-24 w-32 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  <ImagePlus className="size-5" />
                  Add photo
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            {imageError && <p className="text-sm text-red-600">{imageError}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <aside>
        <div className="sticky top-24 space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as "active" | "inactive" | "draft" | "pending" | "rejected")
                  }
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active — bookable</SelectItem>
                    <SelectItem value="inactive">Inactive — hidden</SelectItem>
                    <SelectItem value="draft">
                      Draft — work in progress
                    </SelectItem>
                    <SelectItem value="pending" disabled>Pending Approval</SelectItem>
                    <SelectItem value="rejected" disabled>Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={isPending || isUploading}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : isUploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    {initial ? "Save changes" : "Create listing"}
                  </>
                )}
              </Button>

              <Link href="/provider/my-services" className="block">
                <Button variant="ghost" className="w-full">
                  Cancel
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-muted/40">
            <CardContent className="p-4 text-xs leading-relaxed text-muted-foreground">
              Listings are reviewed by admins. Active listings are visible to
              customers and can be booked.
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}
