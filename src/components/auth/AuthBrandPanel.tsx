import Link from "next/link";
import { BadgeCheck, Clock, ShieldCheck, Wrench } from "lucide-react";

const highlights = [
  {
    icon: ShieldCheck,
    title: "Vetted professionals",
    description: "Every provider reviewed before their first job.",
  },
  {
    icon: Clock,
    title: "Book in minutes",
    description: "Pick a service, choose a time, and you're set.",
  },
  {
    icon: BadgeCheck,
    title: "Real-time updates",
    description: "Know the moment your booking moves forward.",
  },
];

export function AuthBrandPanel() {
  return (
    <aside className="relative hidden w-[44%] shrink-0 overflow-hidden border-r bg-zinc-900 lg:flex lg:flex-col lg:justify-between dark:border-zinc-800">
      {/* subtle texture — not purple wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-[18%] size-[420px] rounded-full bg-blue-500/10 blur-[70px]"
      />

      <div className="relative p-10">
        <Link href="/" className="inline-flex items-center gap-2.5 text-white">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white text-zinc-900">
            <Wrench className="size-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">HandyHub</span>
        </Link>
      </div>

      <div className="relative px-10 pb-10">
        <h2 className="max-w-sm text-[28px] font-bold leading-[0.95] tracking-tight text-white">
          Your home&apos;s
          <br />
          <span className="font-[var(--font-display)] italic font-bold">to-do list, handled.</span>
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
          Trusted local pros for plumbing, electrical, cleaning and more — upfront prices, real reviews.
        </p>

        <ul className="mt-8 space-y-4">
          {highlights.map((highlight) => (
            <li key={highlight.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                <highlight.icon className="size-3.5 text-white" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">{highlight.title}</p>
                <p className="text-sm leading-relaxed text-zinc-400">{highlight.description}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-xs text-zinc-500">© {new Date().getFullYear()} HandyHub · 24/7 support</p>
      </div>
    </aside>
  );
}
