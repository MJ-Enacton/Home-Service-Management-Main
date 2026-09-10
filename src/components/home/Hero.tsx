/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Search,
  Sparkles,
  Star,
  Wrench,
  SprayCan,
  Zap,
  Paintbrush,
  Flower2,
  Hammer,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const stats = [
  { value: "1k+", label: "Services booked" },
  { value: "500+", label: "Active providers" },
  { value: "24/7", label: "Booking availability" },
];

const chips = [
  { label: "Plumbing", slug: "plumbing" },
  { label: "Cleaning", slug: "cleaning" },
  { label: "Electrical", slug: "electrical" },
  { label: "Painting", slug: "painting" },
  { label: "Gardening", slug: "gardening" },
];

export function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/services?q=${encodeURIComponent(q)}` : "/services");
  }

  return (
    <section className="relative flex min-h-[calc(100dvh-56px)] w-full items-center justify-center overflow-hidden bg-cream dark:bg-zinc-950">
      {/* Glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-18%] top-[8%] size-180 rounded-full bg-glow-blue/70 blur-[100px] dark:bg-blue-900/20 glow-float"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-16%] top-[12%] size-170 rounded-full bg-glow-yellow/70 blur-[100px] dark:bg-amber-900/15 glow-float-rev"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[52%] h-105 w-225 -translate-x-1/2 rounded-full bg-white/80 blur-[50px] dark:bg-zinc-900/40"
      />

      {/* Floating preview cards — B */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block"
      >
        {/* Left card */}
        <Link
          href="/services?cats=plumbing"
          className="pointer-events-auto absolute left-[5%] top-[18%] hidden w-56 rotate-[-4deg] rounded-2xl border bg-white p-4 shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition hover:-rotate-2 hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] xl:left-[8%] 2xl:left-[10%]"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <Wrench className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-none">Plumbing Fix</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="size-3 fill-amber-500 text-amber-500" /> 4.9 ·
                312 bookings
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold">
            ₹499{" "}
            <span className="text-xs font-normal text-muted-foreground">
              onwards
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Vetted pro · today slots
          </p>
        </Link>

        {/* Right card */}
        <Link
          href="/services?cats=cleaning"
          className="pointer-events-auto absolute right-[5%] top-[20%] hidden w-56 rotate-[4deg] rounded-2xl border bg-white p-4 shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition hover:rotate-2 hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] xl:right-[8%] 2xl:right-[10%]"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
              <SprayCan className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-none">
                Deep Cleaning
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="size-3 fill-amber-500 text-amber-500" /> 4.8 ·
                210 bookings
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold">
            ₹799{" "}
            <span className="text-xs font-normal text-muted-foreground">
              flat
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            No haggling · Secure online payment
          </p>
        </Link>

        {/* Bottom-right small — electrical */}
        <Link
          href="/services?cats=electrical"
          className="pointer-events-auto absolute bottom-[18%] right-[12%] hidden w-48 rotate-2 rounded-2xl border bg-white p-3 shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition hover:rotate-0 xl:flex xl:items-center xl:gap-3"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30">
            <Zap className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold">Electrical</p>
            <p className="text-[11px] text-muted-foreground">
              24/7 · from ₹349
            </p>
          </div>
          <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
        </Link>

        {/* Top-left small — painting */}
        <Link
          href="/services?cats=painting"
          className="pointer-events-auto absolute left-[6%] top-[8%] hidden w-48 -rotate-2 rounded-2xl border bg-white p-3 shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition hover:rotate-0 xl:flex xl:items-center xl:gap-3"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/30">
            <Paintbrush className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold">Painting</p>
            <p className="text-[11px] text-muted-foreground">
              From ₹1,199 · 4.8★
            </p>
          </div>
          <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
        </Link>

        {/* Bottom-left small — gardening */}
        <Link
          href="/services?cats=gardening"
          className="pointer-events-auto absolute bottom-[14%] left-[8%] hidden w-48 -rotate-3 rounded-2xl border bg-white p-3 shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition hover:-rotate-1 xl:flex xl:items-center xl:gap-3"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-950/30">
            <Flower2 className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold">Gardening</p>
            <p className="text-[11px] text-muted-foreground">
              Weekly · from ₹599
            </p>
          </div>
          <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
        </Link>

        {/* Top-right small — carpentry */}
        <Link
          href="/services?cats=carpentry"
          className="pointer-events-auto absolute right-[6%] top-[7%] hidden w-48 rotate-3 rounded-2xl border bg-white p-3 shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition hover:rotate-0 xl:flex xl:items-center xl:gap-3"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/30">
            <Hammer className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold">Plumbing</p>
            <p className="text-[11px] text-muted-foreground">
              Custom · from ₹449
            </p>
          </div>
          <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
        </Link>
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-10 text-center md:px-6 md:py-16">
        <Badge
          variant="secondary"
          className="hero-in gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-medium shadow-sm dark:bg-zinc-800 dark:border-zinc-700"
        >
          <Sparkles className="size-3 text-zinc-600 dark:text-zinc-300" />
          Trusted home services, on demand
        </Badge>

        <h1 className="hero-in hero-in-1 mx-auto mt-6 max-w-3xl text-center text-[36px] font-bold leading-[0.9] tracking-[-0.03em] sm:text-[48px] md:text-[64px] lg:text-[72px]">
          <span className="block">Home services you</span>
          <span className="block font-(--font-display) italic">
            can book in seconds
          </span>
        </h1>

        <p className="hero-in hero-in-2 mx-auto mt-5 max-w-xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
          From plumbing to painting, compare vetted local pros, see upfront
          prices and book in under 2 minutes — no calls, no haggling.
        </p>

        {/* Search — A */}
        <form
          onSubmit={onSearch}
          role="search"
          aria-label="Search services"
          className="hero-in hero-in-2 relative mx-auto mt-7 flex w-full max-w-xl items-center"
        >
          <Search className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search — e.g. plumbing, cleaning"
            className="h-12 w-full rounded-full border-zinc-200 bg-white pl-10 pr-27 text-sm shadow-[0_8px_30px_rgba(0,0,0,0.06)] placeholder:text-muted-foreground/70 dark:border-zinc-800 dark:bg-zinc-900"
            aria-label="Search services"
          />
          <Button
            type="submit"
            className="absolute right-1.5 h-9 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
          >
            Search
          </Button>
        </form>

        {/* Chips — A */}
        <div className="hero-in hero-in-2 mt-3 flex flex-wrap items-center justify-center gap-2">
          {chips.map((chip) => (
            <Link
              key={chip.slug}
              href={`/services?cats=${chip.slug}`}
              className="rounded-full border bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {chip.label}
            </Link>
          ))}
        </div>

        <div className="hero-in hero-in-3 mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/services">
            <Button
              size="lg"
              className="h-11 rounded-full bg-zinc-900 px-7 text-sm font-medium text-white shadow-[0_4px_24px_rgba(0,0,0,0.12)] hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Get Started
              <span className="ml-1.5 flex size-7 items-center justify-center rounded-full bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
                <ArrowRight className="size-4" />
              </span>
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button
              size="lg"
              variant="outline"
              className="h-11 rounded-full border-zinc-300 bg-white px-7 text-sm font-medium shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Become a provider
            </Button>
          </Link>
        </div>

        <div className="hero-in hero-in-3 mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="flex -space-x-1.5">
            <img
              src="https://i.pravatar.cc/100?img=32"
              alt=""
              className="size-6 rounded-full border-2 border-cream object-cover dark:border-zinc-950"
            />
            <img
              src="https://i.pravatar.cc/100?img=33"
              alt=""
              className="size-6 rounded-full border-2 border-cream object-cover dark:border-zinc-950"
            />
            <img
              src="https://i.pravatar.cc/100?img=35"
              alt=""
              className="size-6 rounded-full border-2 border-cream object-cover dark:border-zinc-950"
            />
          </span>
          <span className="flex items-center gap-1">
            <span className="flex gap-0.5 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3 fill-amber-500" />
              ))}
            </span>
            <span className="font-medium text-foreground">4.9</span>
            <span>Trusted by 1000+ clients</span>
          </span>
        </div>

        <div className="hero-in hero-in-4 mx-auto mt-8 grid w-full max-w-2xl grid-cols-3 gap-6 border-t border-zinc-200/60 pt-6 dark:border-zinc-800">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-xl font-bold tracking-tight sm:text-2xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs leading-tight text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
      {/* Blend: soft fade from hero cream to white so the cut disappears */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-b from-cream/0 via-cream/60 to-white dark:from-transparent dark:via-zinc-950/40 dark:to-zinc-950"
      />
    </section>
  );
}
