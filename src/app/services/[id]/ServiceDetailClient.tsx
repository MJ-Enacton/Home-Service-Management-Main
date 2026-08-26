"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";

import type { ServiceListingCard, TierOption } from "@/types/service";
import type { ListingReviewSummary } from "@/lib/db/queries/listings";
import type { Slot } from "@/lib/availability";
import {
  enumLabel,
  formatCents,
  pricingUnitLabel,
} from "@/lib/format";
import { computePriceBreakdown } from "@/lib/pricing";
import { bookService, getScheduleOptions } from "./actions";
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
  imageCount: number;
  providerBio: string | null;
  reviews: ListingReviewSummary[];
  viewerAddress: string | null;
  isOwner: boolean;
  isAuthenticated: boolean;
}

type PaymentMethod = "card" | "paypal" | "wallet";

const STEPS = ["Job Details", "Schedule", "Payment"] as const;

const EMPTY_DETAILS = {
  streetAddress: "",
  city: "",
  zipCode: "",
  jobNotes: "",
  contactFirstName: "",
  contactLastName: "",
  contactEmail: "",
  contactPhone: "",
};

export function ServiceDetailClient({
  listing,
  tiers,
  imageCount,
  providerBio,
  reviews,
  viewerAddress,
  isOwner,
  isAuthenticated,
}: ServiceDetailClientProps) {
  const [step, setStep] = useState(1);
  const [details, setDetails] = useState({
    ...EMPTY_DETAILS,
    streetAddress: viewerAddress ?? "",
  });
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotTime, setSlotTime] = useState("");
  const [tierId, setTierId] = useState<string | null>(tiers[0]?.id ?? null);
  const [isContactless, setIsContactless] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [authorizing, setAuthorizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bookingNumber, setBookingNumber] = useState("");

  const selectedTier = tiers.find((tier) => tier.id === tierId) ?? null;
  const baseCents = selectedTier
    ? selectedTier.priceCents
    : listing.startingPriceCents;
  const pricing = computePriceBreakdown(baseCents);

  /** Reset schedule-dependent state and kick off slot loading on date change. */
  function handleDateChange(value: string) {
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
    if (step === 1 && !details.streetAddress.trim()) {
      setError("Street address is required.");
      return;
    }
    if (step === 2 && (!date || !slotTime)) {
      setError("Please pick a date and an available time slot.");
      return;
    }
    setStep((prev) => Math.min(3, prev + 1));
  }

  /** Mock-gateway card validation (Luhn + expiry). */
  function validateCard(): string | null {
    const digits = cardNumber.replace(/\D/g, "");
    if (!cardName.trim()) return "Cardholder name is required.";
    if (digits.length < 13 || digits.length > 19) {
      return "Enter a valid card number.";
    }
    let sum = 0;
    let double = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let value = Number(digits[i]);
      if (double) {
        value *= 2;
        if (value > 9) value -= 9;
      }
      sum += value;
      double = !double;
    }
    if (sum % 10 !== 0) return "This card number is not valid.";

    const expiryMatch = /^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/.exec(cardExpiry);
    if (!expiryMatch) return "Use MM/YY for the expiry date.";
    const month = Number(expiryMatch[1]);
    const year = 2000 + Number(expiryMatch[2]);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
    if (endOfMonth < new Date()) return "This card has expired.";

    if (!/^\d{3,4}$/.test(cardCvc)) return "Enter a valid CVC.";
    return null;
  }

  /** Simulated authorization before creating the booking. */
  async function handlePay() {
    setError("");
    if (method === "card") {
      const cardError = validateCard();
      if (cardError) {
        setError(cardError);
        return;
      }
    }

    setAuthorizing(true);
    try {
      // Pretend to talk to the payment gateway.
      await new Promise((resolve) => setTimeout(resolve, method === "card" ? 1500 : 800));
    } finally {
      setAuthorizing(false);
    }

    await handleConfirm(
      method === "card"
        ? { cardLast4: cardNumber.replace(/\D/g, "").slice(-4) }
        : undefined,
    );
  }

  async function handleConfirm(payment?: { cardLast4?: string }) {
    setError("");
    setSubmitting(true);
    try {
      const result = await bookService({
        listingId: listing.id,
        details,
        schedule: {
          scheduledDate: date,
          scheduledTimeSlot: slotTime,
          isContactless,
          isUrgent,
          tierId,
        },
        paymentMethod: method,
        payment,
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
        return;
      }
      setBookingNumber(result.bookingNumber ?? "");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------- Confirmation ---------------- */
  if (bookingNumber) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 md:px-6">
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
              <Link href="/my-bookings">
                <Button>View My Bookings</Button>
              </Link>
              <Link href="/allservices">
                <Button variant="outline">Browse More Services</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6">
      {/* Hero header band */}
      <section className="-mx-4 border-b bg-muted/40 px-4 py-8 md:-mx-6 md:px-6 md:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <BackButton label="All Services" className="mb-1 -ml-3" />
            <nav className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Link href="/allservices" className="hover:text-foreground">
                All Services
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
                {listing.provider.isVerified && (
                  <BadgeCheck className="size-4 text-primary" />
                )}
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
              {listing.isVerified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <ShieldCheck className="size-3.5" />
                  Verified provider
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {enumLabel(listing.categoryName ?? "") || "Service"}
              </span>
            </div>
          </div>

          {/* Gallery */}
          {imageCount > 0 && (
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/services/${listing.id}/image`}
                alt={listing.title}
                className="h-48 w-full rounded-2xl object-cover shadow-md ring-1 ring-border lg:w-72"
              />
              {imageCount > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {Array.from(
                    { length: Math.min(imageCount, 4) },
                    (_, index) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={index}
                        src={`/api/services/${listing.id}/image?i=${index}`}
                        alt={`${listing.title} photo ${index + 1}`}
                        className={`h-14 w-20 shrink-0 cursor-pointer rounded-lg object-cover ring-1 transition-opacity hover:opacity-80 ${
                          index === 0 ? "ring-primary" : "ring-border"
                        }`}
                      />
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-8 py-8 lg:grid-cols-[1fr_360px] lg:py-10">
        {/* Wizard column */}
        <div>
          {isOwner && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-600 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertCircle className="size-4 shrink-0" />
              This is your own listing &mdash; you can&apos;t book it. Manage
              it from{" "}
              <Link href="/my-services" className="font-semibold underline">
                My Services
              </Link>
              .
            </div>
          )}

          {/* Step indicator */}
          <ol className="mb-8 flex items-center gap-2">
            {STEPS.map((label, index) => {
              const number = index + 1;
              const isActive = number === step;
              const isDone = number < step;
              return (
                <li key={label} className="flex flex-1 items-center gap-2">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      isActive
                        ? "bg-primary text-white"
                        : isDone
                          ? "bg-primary/15 text-primary"
                          : "border bg-muted text-muted-foreground"
                    }`}
                  >
                    {number}
                  </span>
                  <span
                    className={`hidden text-sm font-medium sm:block ${
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                  {number < STEPS.length && (
                    <span className="mx-1 hidden h-px flex-1 bg-border sm:block" />
                  )}
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
                <Link href="/sign-in" className="mt-2">
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

                    <div className="space-y-2">
                      <Label htmlFor="street">Street address *</Label>
                      <Input
                        id="street"
                        value={details.streetAddress}
                        onChange={(event) =>
                          setDetails((prev) => ({
                            ...prev,
                            streetAddress: event.target.value,
                          }))
                        }
                        placeholder="221B Baker Street"
                        className="bg-background"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={details.city}
                          onChange={(event) =>
                            setDetails((prev) => ({
                              ...prev,
                              city: event.target.value,
                            }))
                          }
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zip">ZIP code</Label>
                        <Input
                          id="zip"
                          value={details.zipCode}
                          onChange={(event) =>
                            setDetails((prev) => ({
                              ...prev,
                              zipCode: event.target.value,
                            }))
                          }
                          className="bg-background"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First name</Label>
                        <Input
                          id="firstName"
                          value={details.contactFirstName}
                          onChange={(event) =>
                            setDetails((prev) => ({
                              ...prev,
                              contactFirstName: event.target.value,
                            }))
                          }
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last name</Label>
                        <Input
                          id="lastName"
                          value={details.contactLastName}
                          onChange={(event) =>
                            setDetails((prev) => ({
                              ...prev,
                              contactLastName: event.target.value,
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
                      <Button onClick={goNext}>
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

                    <div className="space-y-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(event) => handleDateChange(event.target.value)}
                        className="w-fit bg-background"
                      />
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
                      <Button onClick={goNext}>
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
                            { value: "paypal", label: "PayPal", icon: Wallet },
                            {
                              value: "wallet",
                              label: "Platform Wallet",
                              icon: Wallet,
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

                    {method === "card" && (
                      <div className="space-y-3 rounded-xl border bg-muted/40 p-3.5">
                        <div className="space-y-2">
                          <Label htmlFor="cardName">Cardholder name</Label>
                          <Input
                            id="cardName"
                            value={cardName}
                            onChange={(event) => setCardName(event.target.value)}
                            placeholder="Name on card"
                            autoComplete="cc-name"
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cardNumber">Card number</Label>
                          <Input
                            id="cardNumber"
                            inputMode="numeric"
                            value={cardNumber}
                            onChange={(event) =>
                              setCardNumber(
                                (event.target.value.replace(/\D/g, "").match(/.{1,4}/g) ?? [])
                                  .join(" ")
                                  .slice(0, 19),
                              )
                            }
                            placeholder="4242 4242 4242 4242"
                            autoComplete="cc-number"
                            className="bg-background font-mono"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Demo gateway — use any Luhn-valid test number, e.g.{" "}
                            <span className="font-mono">4242 4242 4242 4242</span>
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cardExpiry">Expiry</Label>
                            <Input
                              id="cardExpiry"
                              inputMode="numeric"
                              value={cardExpiry}
                              onChange={(event) => {
                                const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
                                setCardExpiry(
                                  digits.length > 2
                                    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
                                    : digits,
                                );
                              }}
                              placeholder="MM/YY"
                              autoComplete="cc-exp"
                              className="bg-background font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cardCvc">CVC</Label>
                            <Input
                              id="cardCvc"
                              inputMode="numeric"
                              value={cardCvc}
                              onChange={(event) =>
                                setCardCvc(event.target.value.replace(/\D/g, "").slice(0, 4))
                              }
                              placeholder="123"
                              autoComplete="cc-csc"
                              className="bg-background font-mono"
                            />
                          </div>
                        </div>
                      </div>
                     )}

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setStep(2)}>
                        <ChevronLeft className="size-4" />
                        Back
                      </Button>
                      <Button
                        onClick={() => void handlePay()}
                        disabled={submitting || authorizing}
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/services/${listing.id}/image`}
                    alt={listing.title}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-border"
                  />
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
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                You won&apos;t be charged until the provider confirms the
                appointment. Free cancellation any time before work begins.
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="border-t py-8 lg:py-10">
          <h2 className="text-xl font-bold tracking-tight">
            Reviews
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              {listing.ratingAvg !== null
                ? `${listing.ratingAvg.toFixed(1)} · ${listing.ratingCount} review${listing.ratingCount === 1 ? "" : "s"}`
                : ""}
            </span>
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, starIndex) => (
                        <Star
                          key={starIndex}
                          className={`size-3.5 ${
                            starIndex < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      ))}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {review.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      “{review.comment}”
                    </p>
                  )}
                  <p className="text-xs font-medium text-foreground">
                    {review.reviewerName}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
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
