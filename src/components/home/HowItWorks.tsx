import { CalendarCheck, ClipboardList, Sparkles } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    title: "Pick a service",
    description:
      "Browse our catalog of home services and choose exactly what you need.",
  },
  {
    icon: CalendarCheck,
    title: "Book a time",
    description:
      "Select your preferred date and time, and confirm your address in seconds.",
  },
  {
    icon: Sparkles,
    title: "Relax, it's handled",
    description:
      "A vetted local professional accepts your request and gets the job done.",
  },
];

export function HowItWorks() {
  return (
    <section>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-2 text-muted-foreground">
            Three simple steps between you and a job well done.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="relative text-center">
              {index < steps.length - 1 && (
                <div
                  aria-hidden
                  className="absolute top-8 left-[calc(50%+3rem)] hidden h-px w-[calc(100%-6rem)] border-t-2 border-dashed border-border md:block"
                />
              )}
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-blue-600 shadow-md shadow-blue-500/25">
                <step.icon className="size-7 text-white" />
              </div>
              <p className="mt-5 text-xs font-semibold tracking-wider text-blue-600 uppercase dark:text-blue-400">
                Step {index + 1}
              </p>
              <h3 className="mt-1 font-semibold">{step.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
