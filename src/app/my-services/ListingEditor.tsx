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

const MAX_IMAGE_MB = 2;

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
  status: "active" | "inactive" | "draft";
  tiers: TierOption[];
  /** how many images are already stored server-side */
  imageCount: number;
}

interface CategoryOptionLite {
  slug: string;
  name: string;
}

interface PendingImage {
  previewUrl: string;
  base64: string;
  mimeType: string;
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
  const [status, setStatus] = useState<"active" | "inactive" | "draft">(
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
  const [images, setImages] = useState<PendingImage[]>([]);
  const [imageError, setImageError] = useState("");
  // When editing, existing stored images are replaced wholesale on save.
  const hadExistingImages = (initial?.imageCount ?? 0) > 0;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setImageError("");
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const room = 6 - images.length;
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
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1] ?? "";
        if (base64) {
          setImages((prev) =>
            prev.length < 6
              ? [...prev, { previewUrl: dataUrl, base64, mimeType: file.type }]
              : prev,
          );
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function removeImage(index: number) {
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
    const basePriceCents = parseCents(basePriceDollars);
    if (basePriceCents === null || !title.trim()) {
      toast.add({
        title: "Title and a valid base price are required.",
        type: "error",
      });
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
          location: location.trim() || null,
          estimatedDuration: estimatedDuration.trim() || null,
          tags: tagsString
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .slice(0, 10),
        },
        tiers: tiers.map((tier, index) => ({
          name: tier.name.trim(),
          description: tier.description.trim() || null,
          priceCents: parseCents(tier.priceDollars)!,
          displayOrder: index,
        })),
        images: images.map((image) => ({
          base64: image.base64,
          mimeType: image.mimeType,
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
      router.push("/my-services");
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
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What's included, what customers can expect…"
                rows={4}
                maxLength={2000}
                className="bg-background"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={categorySlug}
                  onValueChange={() => setCategorySlug}
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
                <Label htmlFor="duration">Estimated duration</Label>
                <Input
                  id="duration"
                  value={estimatedDuration}
                  onChange={(event) => setEstimatedDuration(event.target.value)}
                  placeholder='e.g. "2-4 hours"'
                  maxLength={60}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Service area</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="e.g. Downtown & suburbs"
                  maxLength={120}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={tagsString}
                  onChange={(event) => setTagsString(event.target.value)}
                  placeholder="eco-friendly, same-day"
                  className="bg-background"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardContent className="space-y-5 p-6">
            <h2 className="font-semibold">Pricing</h2>

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
              <Label htmlFor="basePrice">Base price ($) *</Label>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="basePrice"
                  type="number"
                  min={0}
                  step="0.01"
                  value={basePriceDollars}
                  onChange={(event) => setBasePriceDollars(event.target.value)}
                  className="pl-7 bg-background"
                />
              </div>
            </div>

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
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                      $
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

            {(hadExistingImages || images.length > 0) && (
              <p className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
                {initial
                  ? `Saving replaces the ${initial.imageCount} existing photo(s).`
                  : "The first photo is used as the cover image."}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {images.map((image, index) => (
                <div
                  key={`${image.previewUrl.slice(-16)}-${index}`}
                  className="relative h-24 w-32 overflow-hidden rounded-lg ring-1 ring-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.previewUrl}
                    alt={`Upload ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
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

              {images.length < 6 && (
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
                    setStatus(value as "active" | "inactive" | "draft")
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
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    {initial ? "Save changes" : "Create listing"}
                  </>
                )}
              </Button>

              <Link href="/my-services" className="block">
                <Button variant="ghost" className="w-full">
                  Cancel
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-muted/40">
            <CardContent className="p-4 text-xs leading-relaxed text-muted-foreground">
              Listings start unverified. Admins review and verify high-quality
              listings — verified ones get a badge and rank higher in search.
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}
