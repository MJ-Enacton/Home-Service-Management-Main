import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export function CtaBanner() {
  return (
    <section className="bg-white px-4 py-10 dark:bg-zinc-950 md:px-6 md:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border bg-zinc-50 px-6 py-10 text-center shadow-sm dark:bg-zinc-900 dark:border-zinc-800 md:px-10 md:py-14">
            {/* soft glows with drift */}
            <div
              aria-hidden
              className="pointer-events-none absolute -left-24 top-1/2 size-105 -translate-y-1/2 rounded-full bg-blue-100/40 blur-[70px] dark:bg-blue-900/10 glow-float"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 top-1/2 size-105 -translate-y-1/2 rounded-full bg-amber-50/50 blur-[70px] dark:bg-amber-900/10 glow-float-rev"
            />

            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-medium shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
                <Sparkles className="size-3 text-zinc-600" />
                Join 1000+ happy homeowners
              </span>
              <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
                Ready to cross off that{" "}
                <span className="font-(--font-display) italic">
                  to-do list?
                </span>
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Join thousands who trust HandyHub for repairs, maintenance and
                improvements — booked in minutes, done right the first time.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/services" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full rounded-full bg-zinc-900 px-6 text-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition hover:-translate-y-px hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 sm:w-auto"
                  >
                    Get started
                    <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                  </Button>
                </Link>
                <Link href="/sign-up" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full rounded-full bg-white px-6 transition hover:bg-zinc-50 dark:bg-zinc-900 sm:w-auto"
                  >
                    Join as a provider
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                No hidden fees · Free cancellation before work begins
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

