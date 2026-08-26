import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CtaBanner() {
  return (
    <section className="px-4 py-10 md:px-6">
      <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-16 text-center text-white md:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-white/10 blur-2xl"
        />

        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
          Ready to cross off that to-do list?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-blue-100">
          Join thousands of homeowners who trust HomeService for repairs,
          maintenance and improvements.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/allservices" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="secondary"
              className="w-full bg-white text-blue-700 hover:bg-blue-50 sm:w-auto"
            >
              Get Started
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/sign-up" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="w-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              Join as a Provider
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
