import { BadgeCheck, ShieldCheck, Zap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: ShieldCheck,
    title: "Vetted professionals",
    description:
      "Every provider on HomeService is verified by our team before they can accept a single request.",
  },
  {
    icon: Zap,
    title: "Real-time updates",
    description:
      "Get instant notifications the moment your booking is accepted, completed or needs your attention.",
  },
  {
    icon: BadgeCheck,
    title: "Transparent & simple",
    description:
      "Clear service descriptions, straightforward booking and no hidden surprises along the way.",
  },
];

export function Features() {
  return (
    <section className="border-t bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Why homeowners choose us
          </h2>
          <p className="mt-2 text-muted-foreground">
            We obsess over trust and convenience so you don&apos;t have to.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="p-6">
                <div className="mb-4 w-fit rounded-xl bg-blue-50 p-3 dark:bg-blue-950/50">
                  <feature.icon className="size-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
