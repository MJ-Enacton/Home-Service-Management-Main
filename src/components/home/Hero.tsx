import Link from "next/link";
import { ArrowRight, Handshake, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const stats = [
  { value: "1k+", label: "Services booked" },
  { value: "100%", label: "Verified providers" },
  { value: "24/7", label: "Booking availability" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-blue-50 via-white to-white dark:from-blue-950/30 dark:via-background dark:to-background"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-900/20"
      />

      <div className="mx-auto w-full max-w-6xl px-4 pt-20 pb-16 text-center md:px-6 md:pt-28 md:pb-24">
        <Badge
          variant="secondary"
          className="mb-6 gap-1.5 rounded-full px-3 py-1 text-xs"
        >
          <Sparkles className="size-3.5 text-blue-600 dark:text-blue-400" />
          Trusted home services, on demand
        </Badge>

        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl md:leading-[1.1]">
          Home services,{" "}
          <span className="bg-linear-to-r bg-clip-text text-transparent from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            done right
          </span>{" "}
          — the first time.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          From plumbing to painting, book vetted local professionals in
          minutes. Real-time updates keep you in the loop from booking to
          completion.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/allservices" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full bg-blue-600 text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 sm:w-auto"
            >
              Browse Services
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/sign-up" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              <Handshake className="size-4" />
              Become a Provider
            </Button>
          </Link>
        </div>

        <div className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-6">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold tracking-tight sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
