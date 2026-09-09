export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-cream px-4 py-8 dark:bg-zinc-950 md:px-6 md:py-10">
      {/* Home hero glows — almost-white with soft pastel */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-18%] top-[8%] size-180 rounded-full bg-glow-blue/55 blur-[110px] dark:bg-blue-900/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-16%] top-[12%] size-170 rounded-full bg-glow-yellow/55 blur-[110px] dark:bg-amber-900/12"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[52%] h-105 w-225 -translate-x-1/2 rounded-full bg-white/70 blur-[50px] dark:bg-zinc-900/40"
      />

      <div className="relative w-full max-w-md">
        {children}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Secure · Trusted by 1000+ homeowners
        </p>
      </div>
    </div>
  );
}
