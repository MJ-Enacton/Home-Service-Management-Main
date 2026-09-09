import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-[calc(100svh-56px)] flex-col items-center justify-center overflow-hidden bg-cream px-4 py-10 dark:bg-zinc-950 md:px-6">
      {/* soft glows — same language as Hero, very subtle */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[18%] top-[6%] size-155 rounded-full bg-glow-blue/55 blur-[100px] dark:bg-blue-900/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[16%] top-[10%] size-150 rounded-full bg-glow-yellow/55 blur-[100px] dark:bg-amber-900/12"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-90 w-225 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-[50px] dark:bg-zinc-900/40"
      />

      {/* giant 404 backdrop — cloudy dissolve like Link 2 */}
      <div aria-hidden className="pointer-events-none relative select-none">
        <p
          className="text-center text-[160px] font-bold leading-none tracking-[-0.06em] text-zinc-900/[0.07] dark:text-white/[0.07] sm:text-[220px] md:text-[280px]"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, black 52%, transparent 90%)",
            maskImage: "linear-gradient(to bottom, black 52%, transparent 90%)",
          }}
        >
          404
        </p>
        {/* clouds hugging the base of the numerals */}
        <div className="absolute inset-x-0 bottom-[6%] flex items-end justify-center">
          <div className="relative h-20 w-full max-w-2xl">
            <div className="absolute bottom-0 left-[8%] h-12 w-40 rounded-full bg-white blur-[18px] dark:bg-zinc-900 glow-float" />
            <div className="absolute bottom-1 left-[28%] h-16 w-52 rounded-full bg-white blur-[22px] dark:bg-zinc-900 glow-float-rev" />
            <div className="absolute bottom-0 left-[52%] h-14 w-44 rounded-full bg-white blur-[20px] dark:bg-zinc-900 glow-float" />
            <div className="absolute bottom-2 right-[10%] h-12 w-36 rounded-full bg-white blur-[18px] dark:bg-zinc-900 glow-float-rev" />
            <div className="absolute -bottom-2 left-1/2 h-10 w-[80%] -translate-x-1/2 rounded-full bg-white/90 blur-[28px] dark:bg-zinc-900/90" />
          </div>
        </div>
      </div>

      <div className="relative -mt-8 flex max-w-xl flex-col items-center text-center md:-mt-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-[44px] md:leading-none">
          Sorry, that page{" "}
          <span className="font-(--font-display) italic">
            could not be found
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
          The service may be inactive, moved, or the link is wrong. Let&apos;s
          get you back to something useful.
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/allservices">
            <Button className="h-10 rounded-full bg-zinc-900 px-6 text-sm text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
              Browse services
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
          <Link href="/">
            <Button
              variant="outline"
              className="h-10 rounded-full bg-white px-6 text-sm dark:bg-zinc-900"
            >
              Go back home
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Error 404 · handyhub
        </p>
      </div>
    </main>
  );
}
