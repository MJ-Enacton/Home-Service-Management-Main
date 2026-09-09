import { CalendarCheck, ClipboardList, Sparkles, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const steps = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Pick a service",
    description: "Browse our curated catalog and choose exactly what you need — from deep cleaning to leak repair.",
  },
  {
    number: "02",
    icon: CalendarCheck,
    title: "Book a time",
    description: "Select your preferred date and time, confirm your address, and get an upfront price in seconds.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Relax, it's handled",
    description: "A vetted local professional accepts your request, arrives on time and gets the job done right.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-zinc-50 py-12 dark:bg-zinc-900 md:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[26px]">Three steps to a job well done</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">No phone calls, no back-and-forth — just a clear track from request to completion.</p>
          </div>
        </Reveal>

        {/* Track */}
        <div className="relative mt-10">
          {/* Horizontal line — desktop */}
          <div aria-hidden className="pointer-events-none absolute left-[16.66%] right-[16.66%] top-[32px] hidden h-px bg-zinc-200 dark:bg-zinc-800 md:block" />
          {/* Vertical line — mobile */}
          <div aria-hidden className="pointer-events-none absolute left-[32px] top-6 bottom-6 w-px bg-zinc-200 dark:bg-zinc-800 md:hidden" />

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal key={step.number} delay={i * 90}>
                <div className="relative flex gap-4 md:flex-col md:gap-0 hover:[&>div:first-child>div]:scale-[1.02] transition-transform">
                {/* Node */}
                <div className="relative z-10 flex shrink-0 md:mx-auto">
                  <div className="flex size-16 items-center justify-center rounded-2xl border bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                    <step.icon className="size-5 text-zinc-900 dark:text-white" />
                  </div>
                  <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
                    {step.number.slice(1)}
                  </span>
                </div>

                <div className="min-w-0 flex-1 pt-1 md:pt-5 md:text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Step {step.number}</p>
                  <h3 className="mt-1 text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground md:mx-auto md:max-w-[28ch]">{step.description}</p>
                </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={320}>
          <div className="mt-8 flex justify-center">
            <p className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs text-muted-foreground dark:bg-zinc-900 dark:border-zinc-800">
              Avg. booking time: <span className="font-semibold text-foreground">under 2 minutes</span>
              <ArrowRight className="size-3" />
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

