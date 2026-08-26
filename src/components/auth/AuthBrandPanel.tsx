import Link from "next/link";
import { BadgeCheck, Clock, ShieldCheck, Wrench } from "lucide-react";

const highlights = [
  {
    icon: ShieldCheck,
    title: "Vetted professionals",
    description: "Every provider verified before their first job.",
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
    <aside className="relative hidden w-[44%] shrink-0 overflow-hidden bg-linear-to-br from-primary via-blue-700 to-indigo-800 lg:flex lg:flex-col lg:justify-between">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-indigo-400/20 blur-3xl"
      />

      <div className="relative p-10">
        <Link href="/" className="inline-flex items-center gap-2 text-white">
          <span className="rounded-lg bg-white/15 p-2 backdrop-blur">
            <Wrench className="size-6" />
          </span>
          <span className="text-2xl font-bold tracking-tight">HandyHub</span>
        </Link>
      </div>

      <div className="relative px-10 pb-12">
        <h2 className="max-w-sm text-3xl font-bold leading-snug tracking-tight text-white">
          Your home&apos;s to-do list, handled by professionals.
        </h2>
        <p className="mt-3 max-w-sm text-blue-100">
          Join a marketplace of trusted local experts for plumbing,
          electrical work, cleaning, painting and more.
        </p>

        <ul className="mt-10 space-y-5">
          {highlights.map((highlight) => (
            <li key={highlight.title} className="flex items-start gap-3">
              <span className="mt-0.5 rounded-lg bg-white/15 p-2 backdrop-blur">
                <highlight.icon className="size-4 text-white" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">
                  {highlight.title}
                </p>
                <p className="text-sm text-blue-100">
                  {highlight.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
