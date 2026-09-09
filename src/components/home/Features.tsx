import { BadgeCheck, ShieldCheck, Zap, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const features = [
  {
    icon: ShieldCheck,
    title: "Vetted professionals",
    description: "Every pro is reviewed for quality, identity and past work before they can accept a single request.",
    stat: "500+ pros",
  },
  {
    icon: Zap,
    title: "Real-time updates",
    description: "Instant notifications the moment your booking is accepted, on the way or completed — no guessing.",
    stat: "Live tracking",
  },
  {
    icon: BadgeCheck,
    title: "Transparent & simple",
    description: "Upfront prices, clear service descriptions and no hidden fees — what you see is what you pay.",
    stat: "No surprises",
  },
];

export function Features() {
  return (
    <section className="bg-white py-12 dark:bg-zinc-950 md:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Why HandyHub</p>
              <h2 className="mt-2 max-w-md text-2xl font-semibold tracking-tight sm:text-[26px]">Why homeowners choose us</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">Trust and convenience built in — so you can focus on your home, not the hassle.</p>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 80}>
              <div className="group relative overflow-hidden rounded-2xl border bg-white p-6 transition hover:border-zinc-300 hover:shadow-sm dark:bg-zinc-950 dark:border-zinc-800 dark:hover:border-zinc-700">
                <div className="flex items-start justify-between">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-white transition group-hover:scale-105 dark:bg-white dark:text-zinc-900">
                    <feature.icon className="size-4" />
                  </div>
                  <span className="rounded-full border bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300">
                    {feature.stat}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-zinc-900 dark:text-white">
                  Learn more <ArrowUpRight className="size-3 transition group-hover:translate-x-0.5" />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

