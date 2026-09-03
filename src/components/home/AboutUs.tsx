import Link from "next/link";
import { ArrowRight, Heart, ShieldCheck, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export function AboutUs() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="relative overflow-hidden border-y bg-white dark:bg-zinc-950 dark:border-zinc-800"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.06),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.12),transparent_55%)]"
      />

      <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-6 md:py-16">
        <Reveal>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300">
              <Sparkles className="size-3 text-zinc-900 dark:text-white" />
              About HandyHub
            </div>

            <h2
              id="about-heading"
              className="mt-4 max-w-xl text-[26px] font-bold leading-[0.95] tracking-tight sm:text-[30px] md:text-[34px]"
            >
              A home should feel
              <br />
              <span className="font-(--font-display) italic">
                taken care of.
              </span>
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
              HandyHub was born from a simple frustration: finding a trustworthy
              person to fix your home shouldn&apos;t feel like a gamble. We
              spent months talking to homeowners and local pros — plumbers who
              pride themselves on tidy work, cleaners who notice the corners,
              electricians who explain before they charge.
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              So we built a marketplace that makes trust visible. Upfront
              prices, real reviews from completed jobs, and providers who manage
              their own schedule and reputation. No call centers. No hidden
              fees. Just honest work, easily booked.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/services">
                <Button
                  size="sm"
                  className="h-8 rounded-full bg-zinc-900 px-4 text-xs text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                >
                  Explore services <ArrowRight className="size-3.5" />
                </Button>
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-8 items-center rounded-full border bg-white px-4 text-xs font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800"
              >
                Become a provider
              </Link>
            </div>

            <dl className="mt-8 grid max-w-lg grid-cols-3 gap-4 border-t border-zinc-100 pt-6 dark:border-zinc-800">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Founded
                </dt>
                <dd className="mt-1 text-sm font-semibold">2023 · Tech City</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Bookings
                </dt>
                <dd className="mt-1 text-sm font-semibold">1k+ completed</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Rating
                </dt>
                <dd className="mt-1 text-sm font-semibold">4.8 / 5 average</dd>
              </div>
            </dl>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative overflow-hidden rounded-[2rem] border bg-zinc-50 p-6 dark:bg-zinc-900 dark:border-zinc-800 md:p-7">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-blue-100/50 blur-[60px] dark:bg-blue-900/20"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-20 size-75 rounded-full bg-amber-50/60 blur-[60px] dark:bg-amber-900/10"
            />

            <div className="relative">
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/4 dark:bg-zinc-800">
                  <Heart className="size-5 text-zinc-900 dark:text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Since 2023
                  </p>
                  <p className="text-sm font-semibold">
                    Built with care in Tech City
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/4 dark:bg-zinc-950 dark:ring-white/5">
                <p className="text-sm font-semibold">People first, always</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Every feature starts with a real story — a parent needing a
                  same-day clean, a provider wanting fair, timely pay. We design
                  for that exact moment.
                </p>
                <p className="mt-4 text-xs font-medium text-zinc-500">
                  — The HandyHub team
                </p>
              </div>

              <ul className="mt-4 space-y-3">
                <li className="flex gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/4 dark:bg-zinc-950 dark:ring-white/5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                    <ShieldCheck className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Trust is earned</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Only reviewed providers, clear scope, and reviews from
                      completed jobs.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/4 dark:bg-zinc-950 dark:ring-white/5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-900 ring-1 ring-black/5 dark:bg-zinc-800 dark:text-white dark:ring-white/10">
                    <Users className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      Local, not logged-off
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Your pros live nearby. We just make the connection
                      seamless.
                    </p>
                  </div>
                </li>
              </ul>

              <div className="mt-4 rounded-xl border border-dashed bg-white/80 px-4 py-3 text-center backdrop-blur dark:bg-zinc-900/60 dark:border-zinc-700">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Our promise
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-semibold">
                    If it&apos;s not done right, we make it right.
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  No hidden fees · Free cancellation before work begins
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

