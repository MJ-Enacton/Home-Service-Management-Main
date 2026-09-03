/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, Sparkles, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const stats = [
  { value: "1k+", label: "Services booked" },
  { value: "500+", label: "Active providers" },
  { value: "24/7", label: "Booking availability" },
];

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100dvh-56px)] w-full items-center justify-center overflow-hidden bg-[#fcfcf9] dark:bg-zinc-950">
      {/* Whole-website background glows — pastel blue left, pastel yellow right, extremely soft */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-18%] top-[8%] size-180 rounded-full bg-[#e6efff]/70 blur-[100px] dark:bg-blue-900/20 glow-float"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-16%] top-[12%] size-170 rounded-full bg-[#fff6cc]/70 blur-[100px] dark:bg-amber-900/15 glow-float-rev"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[52%] h-105 w-225 -translate-x-1/2 rounded-full bg-white/80 blur-[50px] dark:bg-zinc-900/40"
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-14 text-center md:px-6 md:py-20">
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

        {/* Only 2 CTAs — they pop */}
        <div className="hero-in hero-in-3 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
              className="size-6 rounded-full border-2 border-[#fcfcf9] object-cover dark:border-zinc-950"
            />
            <img
              src="https://i.pravatar.cc/100?img=33"
              alt=""
              className="size-6 rounded-full border-2 border-[#fcfcf9] object-cover dark:border-zinc-950"
            />
            <img
              src="https://i.pravatar.cc/100?img=35"
              alt=""
              className="size-6 rounded-full border-2 border-[#fcfcf9] object-cover dark:border-zinc-950"
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

        {/* Stats — spacious, premium */}
        <div className="hero-in hero-in-4 mx-auto mt-10 grid w-full max-w-2xl grid-cols-3 gap-6 border-t border-zinc-200/60 pt-7 dark:border-zinc-800">
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
    </section>
  );
}

