"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  Smartphone,
  Star,
} from "lucide-react";

import type { ServiceListingCard, TierOption } from "@/types/service";
import type {
  ListingImageSummary,
  ListingReviewSummary,
  RatingBreakdownRow,
} from "@/lib/db/queries/listings";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import type { Slot } from "@/lib/availability";
import {
  enumLabel,
  formatCents,
  pricingUnitLabel,
} from "@/lib/format";
import { computePriceBreakdown } from "@/lib/pricing";
import { getBookingWindow, isDateWithinBookingWindow } from "@/lib/booking-window";
import {
  bookService,
  getScheduleOptions,
  retryBookingPayment,
  verifyBookingPayment,
} from "./actions";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import dynamic from "next/dynamic";
import { CldImage } from "next-cloudinary";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface ServiceDetailClientProps {
  listing: ServiceListingCard;
  tiers: TierOption[];
  images: ListingImageSummary[];
  providerBio: string | null;
  reviews: ListingReviewSummary[];
  ratingBreakdown: RatingBreakdownRow[];
  viewerAddress: string | null;
  viewerLatitude?: number | null;
  viewerLongitude?: number | null;
  viewerUser: {
    id: string;
    name: string;
    email: string;
    contact?: string | null;
    role?: string | null;
  } | null;
  isOwner: boolean;
  isAuthenticated: boolean;
}

type PaymentMethod = "card" | "upi";

const STEPS = ["Job Details", "Schedule", "Payment"] as const;

const EMPTY_DETAILS = {
  streetAddress: "",
  latitude: null as number | null,
  longitude: null as number | null,
  addressSource: "custom" as "saved" | "custom",
  jobNotes: "",
  contactFullName: "",
  contactEmail: "",
  contactPhone: "",
};

const MapLocationPicker = dynamic(
  () => import("@/components/MapLocationPicker").then((m) => m.MapLocationPicker),
  { ssr: false, loading: () => <p className="text-sm text-muted-foreground">Loading map…</p> },
);

/** Single gallery photo (Cloudinary-only; renders nothing without a publicId). */
function GalleryImage({
  image,
  index,
  title,
  className,
  sizes,
  width,
  height,
}: {
  image: ListingImageSummary;
  index: number;
  title: string;
  className?: string;
  sizes?: string;
  width: number;
  height: number;
}) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const alt = image.altText ?? `${title} photo ${index + 1}`;

  if (!image.publicId || !cloudName) return null;

  return (
    <CldImage
      src={image.publicId}
      width={width}
      height={height}
      alt={alt}
      crop="fill"
      gravity="auto"
      sizes={sizes}
      className={className}
    />
  );
}

export function ServiceDetailClient({
  listing,
  tiers,
  images,
  providerBio,
  reviews,
  ratingBreakdown,
  viewerAddress,
  viewerLatitude,
  viewerLongitude,
  viewerUser,
  isOwner,
  isAuthenticated,
}: ServiceDetailClientProps) {
  const [step, setStep] = useState(1);
  const hasSavedAddress = Boolean(viewerAddress?.trim());
  const [addressMode, setAddressMode] = useState<"saved" | "custom">(
    hasSavedAddress ? "saved" : "custom",
  );
  const [details, setDetails] = useState({
    ...EMPTY_DETAILS,
    streetAddress: "",
    contactFullName: viewerUser?.name ?? "",
    contactEmail: viewerUser?.email ?? "",
    contactPhone: viewerUser?.contact ?? "",
  });
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotTime, setSlotTime] = useState("");
  const [tierId, setTierId] = useState<string | null>(tiers[0]?.id ?? null);
  const [isContactless, setIsContactless] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [authorizing, setAuthorizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bookingNumber, setBookingNumber] = useState("");
  const [pendingPayment, setPendingPayment] = useState<{
    bookingId: string;
    bookingNumber: string;
  } | null>(null);

  const selectedTier = tiers.find((tier) => tier.id === tierId) ?? null;
  const baseCents = selectedTier
    ? selectedTier.priceCents
    : listing.startingPriceCents;
  const pricing = computePriceBreakdown(baseCents);

  const bookingWindow = getBookingWindow();

  /** Reset schedule-dependent state and kick off slot loading on date change. */
  function handleDateChange(value: string) {
    setError("");
    if (value && !isDateWithinBookingWindow(value)) {
      setError("Bookings are allowed only within the next 7 days (today included).");
      setDate("");
      setSlotTime("");
      setSlots(null);
      setLoadingSlots(false);
      return;
    }
    setDate(value);
    setSlotTime("");
    if (!value) {
      setSlots(null);
      setLoadingSlots(false);
      return;
    }
    setLoadingSlots(true);
  }

  // Fetch slots for the chosen date; results are applied in async callbacks.
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    getScheduleOptions(listing.id, date)
      .then((result) => {
        if (!cancelled) setSlots(result.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, listing.id]);

  function goNext() {
    setError("");
    if (step === 1) {
      const activeAddress =
        addressMode === "saved" ? (viewerAddress ?? "") : details.streetAddress;
      if (!activeAddress.trim()) {
        setError(
          addressMode === "saved"
            ? "No saved address found — pick a location on the map instead."
            : "Please drop a pin on the map to set the service location.",
        );
        return;
      }
      if (!details.contactEmail?.trim() || !details.contactPhone?.trim()) {
        setError("Email and phone number are required.");
        return;
      }
    }
    if (step === 2 && !isUrgent && (!date || !slotTime)) {
      setError("Please pick a date and an available time slot.");
      return;
    }
    if (step === 2 && !isUrgent && date && !isDateWithinBookingWindow(date)) {
      setError("Bookings are allowed only within the next 7 days (today included).");
      return;
    }
    setStep((prev) => Math.min(3, prev + 1));
  }

  /** Open Razorpay Checkout for a server-created order, then verify. */
  async function payOnline(
    bookingId: string,
    bookingNum: string,
    payment: { orderId: string; amount: number; keyId: string },
  ) {
    setAuthorizing(true);
    try {
      await openRazorpayCheckout({
        keyId: payment.keyId,
        orderId: payment.orderId,
        amount: payment.amount,
        prefill: {
          name: details.contactFullName || undefined,
          email: details.contactEmail || undefined,
          contact: details.contactPhone || undefined,
        },
        onSuccess: async (creds) => {
          const verified = await verifyBookingPayment({
            bookingId,
            ...creds,
          });
          if (!verified.success) {
            setError(verified.error);
            setPendingPayment({ bookingId, bookingNumber: bookingNum });
            return;
          }
          setPendingPayment(null);
          setBookingNumber(bookingNum);
        },
        onDismiss: () => {
          // Booking exists with a pending payment — retry from the panel.
          setPendingPayment({ bookingId, bookingNumber: bookingNum });
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Payment failed to start.",
      );
      setPendingPayment({ bookingId, bookingNumber: bookingNum });
    } finally {
      setAuthorizing(false);
    }
  }

  /** Create the booking (+ pending payment + Razorpay order for online). */
  async function createBooking() {
    setError("");
    setSubmitting(true);
    try {
      const resolvedDetails =
        addressMode === "saved"
          ? {
              ...details,
              streetAddress: viewerAddress ?? "",
              latitude: viewerLatitude ?? null,
              longitude: viewerLongitude ?? null,
              addressSource: "saved" as const,
            }
          : { ...details, addressSource: "custom" as const };
      const result = await bookService({
        listingId: listing.id,
        details: resolvedDetails,
        schedule: {
          scheduledDate: date,
          scheduledTimeSlot: slotTime,
          isContactless,
          isUrgent,
          tierId,
        },
        paymentMethod: method,
      });
      if (!result.success) {
        setError(result.error);
        // A stale slot sends the customer back to the schedule step.
        if (result.error?.includes("no longer available")) {
          setStep(2);
          setSlots((prev) =>
            prev
              ? prev.map((slot) =>
                  slot.time === slotTime
                    ? { ...slot, status: "booked" as const }
                    : slot,
                )
              : prev,
          );
        }
        return null;
      }
      return result;
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay() {
    setError("");
    setPendingPayment(null);

    // Online only (card/UPI): card details are collected securely inside
    // Razorpay Checkout — create the booking first, then pay.
    const result = await createBooking();
    if (!result || !result.bookingId || !result.bookingNumber) return;
    if (!result.payment) {
      setError(
        "Booking created, but payment could not start. Please retry below.",
      );
      setPendingPayment({
        bookingId: result.bookingId,
        bookingNumber: result.bookingNumber,
      });
      return;
    }
    await payOnline(result.bookingId, result.bookingNumber, result.payment);
  }

  /** Pay-now retry from the pending panel (fresh order each attempt). */
  async function handlePendingPay() {
    if (!pendingPayment) return;
    setError("");
    const retry = await retryBookingPayment(pendingPayment.bookingId);
    if (!retry.success) {
      setError(retry.error);
      return;
    }
    if (!retry.payment) {
      setError("Could not start payment. Please try again.");
      return;
    }
    await payOnline(
      pendingPayment.bookingId,
      pendingPayment.bookingNumber,
      retry.payment,
    );
  }

  /* ---------------- Payment pending ---------------- */
  if (pendingPayment && !bookingNumber) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-16 md:px-6 md:pt-8">
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-950/50">
              <Clock className="size-10 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Payment pending</h1>
              <p className="mt-2 text-muted-foreground">
                Your booking{" "}
                <span className="font-semibold text-foreground">
                  {pendingPayment.bookingNumber}
                </span>{" "}
                is created. Complete the payment to confirm your slot.
              </p>
            </div>
            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : null}
            <div className="mt-2 flex gap-3">
              <Button onClick={handlePendingPay} disabled={authorizing}>
                {authorizing ? "Opening payment…" : "Pay now"}
              </Button>
              <Link href="/customer/my-bookings">
                <Button variant="outline">My Bookings</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  /* ---------------- Confirmation ---------------- */
  if (bookingNumber) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-16 md:px-6 md:pt-8">
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="rounded-full bg-green-100 p-4 dark:bg-green-950/50">
              <CheckCircle2 className="size-10 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Booking requested!</h1>
              <p className="mt-2 text-muted-foreground">
                Your reference is{" "}
                <span className="font-semibold text-foreground">
                  {bookingNumber}
                </span>
                . {listing.provider.name} has been notified and will confirm
                your appointment shortly.
              </p>
            </div>
            <div className="mt-2 flex gap-3">
              <Link
                href={
                  viewerUser?.role === "provider"
                    ? "/provider/my-bookings"
                    : "/customer/my-bookings"
                }
              >
                <Button>View My Bookings</Button>
              </Link>
              <Link href="/services">
                <Button variant="outline">Browse More Services</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 md:px-6 md:pt-8">
      {/* No overflow-hidden — it would break the sticky summary sidebar below. */}
      <Card>
        {/* Hero header */}
        <div className="border-b px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <BackButton label="All Services" href="/services" className="mb-1 -ml-3" />
            <nav className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Link href="/services" className="hover:text-foreground">
                Services
              </Link>
              <ChevronRight className="size-3" />
              <span className="truncate text-foreground">{listing.title}</span>
            </nav>

            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              {listing.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {listing.provider.name.slice(0, 2).toUpperCase()}
                </span>
                {listing.provider.name}
              </span>
              <span className="flex items-center gap-1">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-foreground">
                  {listing.ratingAvg !== null
                    ? listing.ratingAvg.toFixed(1)
                    : "New"}
                </span>
                {listing.ratingCount > 0 && `(${listing.ratingCount})`}
              </span>
              {listing.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {listing.location}
                </span>
              )}
              {listing.estimatedDuration && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {listing.estimatedDuration}
                </span>
              )}
            </div>

            <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
              {listing.description ||
                "Professional service at your doorstep."}
            </p>
            {providerBio && (
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                About the provider: {providerBio}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {enumLabel(listing.categoryName ?? "") || "Service"}
              </span>
            </div>
          </div>

          {/* Gallery (Cloudinary via next-cloudinary) */}
          {images.length > 0 && (
            <div className="shrink-0">
              <GalleryImage
                image={images[0]!}
                index={0}
                title={listing.title}
                className="h-48 w-full rounded-2xl object-cover shadow-md ring-1 ring-border lg:w-72"
                sizes="(max-width: 1024px) 100vw, 300px"
                width={576}
                height={384}
              />
              {images.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {images.slice(0, 4).map((image, index) => (
                    <GalleryImage
                      key={image.id}
                      image={image}
                      index={index}
                      title={listing.title}
                      className={`h-14 w-20 shrink-0 cursor-pointer rounded-lg object-cover ring-1 transition-opacity hover:opacity-80 ${
                        index === 0 ? "ring-primary" : "ring-border"
                      }`}
                      sizes="80px"
                      width={160}
                      height={112}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        <div className="bg-cream px-4 py-6 sm:px-5 md:px-6 dark:bg-zinc-800/60">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Wizard column */}
        <div>
          {isOwner && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-600 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertCircle className="size-4 shrink-0" />
              This is your own listing &mdash; you can&apos;t book it. Manage
              it from{" "}
              <Link href="/provider/my-services" className="font-semibold underline">
                My Services
              </Link>
              .
            </div>
          )}

          {/* Step indicator — compact, accessible */}
          <ol className="mb-6 flex items-center gap-2" aria-label="Booking steps">
            {STEPS.map((label, index) => {
              const number = index + 1;
              const isActive = number === step;
              const isDone = number < step;
              return (
                <li key={label} className="flex flex-1 items-center gap-2">
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ${isActive ? "bg-zinc-900 text-white ring-zinc-900 dark:bg-white dark:text-zinc-900" : isDone ? "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800" : "bg-white text-muted-foreground ring-zinc-200 dark:bg-zinc-900"}`}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {number}
                  </span>
                  <span className={`hidden text-xs font-medium sm:block ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                  {number < STEPS.length && <span className="mx-1 hidden h-px flex-1 bg-zinc-200 dark:bg-zinc-800 sm:block" aria-hidden />}
                </li>
              );
            })}
          </ol>

          {!isAuthenticated ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Calendar className="size-8 text-primary" />
                <p className="font-semibold">Sign in to book this service</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Create a free account to schedule an appointment with{" "}
                  {listing.provider.name}.
                </p>
                <Link href={`/sign-in?next=/services/${listing.id}`} className="mt-2">
                  <Button>Sign In to Continue</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                {error && (
                  <div className="mb-5 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* STEP 1 — Job Details */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold">Job details</h2>
                      <p className="text-sm text-muted-foreground">
                        Tell us where the work happens and how to reach you.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label>Service location *</Label>
                      {addressMode === "saved" && hasSavedAddress ? (
                        <>
                          <div className="inline-flex rounded-full border bg-zinc-100 p-1 dark:bg-zinc-800">
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="rounded-full"
                              onClick={() => setAddressMode("saved")}
                            >
                              Saved Address
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-full"
                              onClick={() => setAddressMode("custom")}
                            >
                              Pick a different location
                            </Button>
                          </div>
                          <div className="flex items-start gap-3 rounded-xl border bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
                            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                            <div className="min-w-0">
                              <p className="text-sm leading-6">{viewerAddress}</p>
                              {viewerLatitude != null && viewerLongitude != null && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Pinned at {viewerLatitude.toFixed(4)},{" "}
                                  {viewerLongitude.toFixed(4)}
                                </p>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <MapLocationPicker
                          compact
                          toolbar={
                            hasSavedAddress ? (
                              <div className="inline-flex rounded-full border bg-zinc-100 p-1 dark:bg-zinc-800">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-full"
                                  onClick={() => setAddressMode("saved")}
                                >
                                  Saved Address
                                </Button>
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  className="rounded-full"
                                  onClick={() => setAddressMode("custom")}
                                >
                                  Pick a different location
                                </Button>
                              </div>
                            ) : undefined
                          }
                          onChange={(loc) =>
                            setDetails((prev) => ({
                              ...prev,
                              streetAddress: loc?.address ?? "",
                              latitude: loc?.latitude ?? null,
                              longitude: loc?.longitude ?? null,
                            }))
                          }
                        />
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full name</Label>
                        <Input
                          id="fullName"
                          value={details.contactFullName}
                          onChange={(event) =>
                            setDetails((prev) => ({
                              ...prev,
                              contactFullName: event.target.value,
                            }))
                          }
                          className="bg-background"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={details.contactEmail}
                          onChange={(event) =>
                            setDetails((prev) => ({
                              ...prev,
                              contactEmail: event.target.value,
                            }))
                          }
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={details.contactPhone}
                          onChange={(event) =>
                            setDetails((prev) => ({
                              ...prev,
                              contactPhone: event.target.value,
                            }))
                          }
                          className="bg-background"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Job notes (optional)</Label>
                      <Textarea
                        id="notes"
                        value={details.jobNotes}
                        onChange={(event) =>
                          setDetails((prev) => ({
                            ...prev,
                            jobNotes: event.target.value,
                          }))
                        }
                        placeholder="Any specific requirements or access instructions"
                        rows={3}
                        className="bg-background"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={goNext}
                        disabled={isOwner}
                        title={
                          isOwner
                            ? "You can't book your own listing"
                            : undefined
                        }
                      >
                        Continue
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 2 — Schedule */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Pick a schedule
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Available slots come from{" "}
                        {listing.provider.name}&apos;s weekly availability.
                      </p>
                    </div>

                    {tiers.length > 0 && (
                      <div className="space-y-2">
                        <Label>Choose a pricing option</Label>
                        <div className="grid gap-2.5">
                          {tiers.map((tier) => (
                            <button
                              key={tier.id}
                              type="button"
                              onClick={() => setTierId(tier.id)}
                              className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                                tierId === tier.id
                                  ? "border-primary bg-primary/5"
                                  : "hover:border-primary/40"
                              }`}
                            >
                              <span>
                                <span className="block text-sm font-semibold">
                                  {tier.name}
                                </span>
                                {tier.description && (
                                  <span className="block text-xs text-muted-foreground">
                                    {tier.description}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 font-bold">
                                {formatCents(tier.priceCents)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isUrgent && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="date">Date *</Label>
                          <Input
                            id="date"
                            type="date"
                            value={date}
                            min={bookingWindow.min}
                            max={bookingWindow.max}
                            onChange={(event) => handleDateChange(event.target.value)}
                            className="w-fit bg-background"
                          />
                          <p className="text-xs text-muted-foreground">
                            Bookable dates: today through {bookingWindow.max} (7 days).
                          </p>
                        </div>

                        {date && (
                          <div className="space-y-2">
                            <Label>Available time slots *</Label>
                            {loadingSlots ? (
                              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                Checking availability…
                              </p>
                            ) : slots !== null && slots.length === 0 ? (
                              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                                No open slots on this date. Try another day.
                              </p>
                            ) : (
                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {(slots ?? []).map((slot) => (
                                  <button
                                    key={slot.time}
                                    type="button"
                                    disabled={slot.status !== "available"}
                                    onClick={() => setSlotTime(slot.time)}
                                    className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                                      slot.status !== "available"
                                        ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through opacity-60"
                                        : slotTime === slot.time
                                          ? "border-primary bg-primary text-white"
                                          : "hover:border-primary/60"
                                    }`}
                                  >
                                    {formatSlot(slot.time)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    <div className="space-y-3">
                      <label className="flex cursor-pointer items-center gap-3 text-sm">
                        <Checkbox
                          checked={isUrgent}
                          onCheckedChange={(checked) =>
                            setIsUrgent(checked === true)
                          }
                        />
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="size-4" /> Urgent job
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 text-sm">
                        <Checkbox
                          checked={isContactless}
                          onCheckedChange={(checked) =>
                            setIsContactless(checked === true)
                          }
                        />
                        <span className="font-medium">
                          Contactless visit preferred
                        </span>
                      </label>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setStep(1)}>
                        <ChevronLeft className="size-4" />
                        Back
                      </Button>
                      <Button
                        onClick={goNext}
                        disabled={isOwner}
                        title={
                          isOwner
                            ? "You can't book your own listing"
                            : undefined
                        }
                      >
                        Continue
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3 — Payment */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold">Payment</h2>
                      <p className="text-sm text-muted-foreground">
                        Choose how you&apos;d like to pay for this booking.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment method</Label>
                      <div className="grid gap-2.5">
                        {(
                          [
                            {
                              value: "card",
                              label: "Credit / Debit Card",
                              icon: CreditCard,
                            },
                            {
                              value: "upi",
                              label: "UPI",
                              icon: Smartphone,
                            },
                          ] as const
                        ).map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setMethod(option.value)}
                            className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                              method === option.value
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary/40"
                            }`}
                          >
                            <option.icon className="size-4 text-primary" />
                            <span className="text-sm font-medium">
                              {option.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/40 p-3.5">
                      <p className="text-sm text-muted-foreground">
                        You&apos;ll enter card/UPI details securely in
                        Razorpay Checkout after creating the booking. Your
                        booking reference is generated first, so a failed
                        payment never loses your slot request.
                      </p>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setStep(2)}>
                        <ChevronLeft className="size-4" />
                        Back
                      </Button>
                      <Button
                        onClick={() => void handlePay()}
                        disabled={submitting || authorizing || isOwner}
                        title={
                          isOwner
                            ? "You can't book your own listing"
                            : undefined
                        }
                      >
                        {authorizing ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Authorizing…
                          </>
                        ) : submitting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Confirming…
                          </>
                        ) : (
                          <>
                            Confirm &amp; Pay{" "}
                            {formatCents(pricing.totalCents)}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sticky summary sidebar */}
        <aside>
          <div className="sticky top-24 space-y-4">
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold">Booking summary</h3>

                <div className="mt-4 flex gap-3">
                  {images[0] && (
                    <GalleryImage
                      image={images[0]}
                      index={0}
                      title={listing.title}
                      className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-border"
                      sizes="64px"
                      width={128}
                      height={128}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold">
                      {listing.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      by {listing.provider.name}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Pricing option</dt>
                    <dd className="font-medium">
                      {selectedTier
                        ? selectedTier.name
                        : `Base (${pricingUnitLabel(listing.pricingType)})`}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd>{formatCents(pricing.baseCents)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      Service fee (10%)
                    </dt>
                    <dd>{formatCents(pricing.serviceFeeCents)}</dd>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <dt>Total</dt>
                    <dd>{formatCents(pricing.totalCents)}</dd>
                  </div>
                </dl>

                {date && slotTime && (
                  <p className="mt-4 flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                    <Calendar className="size-4 shrink-0 text-primary" />
                    {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at {formatSlot(slotTime)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/40">
              <CardContent className="flex items-start gap-2.5 p-4 text-xs text-muted-foreground">
                You won&apos;t be charged until the provider confirms the
                appointment. Free cancellation any time before work begins.
              </CardContent>
            </Card>
            </div>
          </aside>
          </div>

          <ReviewsSection
            listingId={listing.id}
            initialReviews={reviews}
            ratingAvg={listing.ratingAvg}
            ratingCount={listing.ratingCount}
            breakdown={ratingBreakdown}
          />
        </div>
      </Card>
    </main>
  );
}

/** Canonical 24h "HH:mm" -> friendly display ("09:30 AM"). */
function formatSlot(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  let h = Number.parseInt(hStr ?? "", 10);
  if (!Number.isFinite(h)) return hhmm;
  const m = mStr ?? "00";
  const suffix = h >= 12 ? "PM" : "AM";
  h %= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${suffix}`;
}
