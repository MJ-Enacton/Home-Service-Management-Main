"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileSidebar } from "@/components/MobileSidebar";
import { Search, Wrench, LogOut } from "lucide-react";

export function Navbar() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname === "/sign-in" || pathname === "/sign-up") {
    return null;
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = String(data.get("q") ?? "").trim();
    router.push(query ? `/allservices?q=${encodeURIComponent(query)}` : "/allservices");
  };

  const navLinkClass =
    "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-background/95 backdrop-blur supports-backdrop-filter:bg-white/80">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 md:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 transition-transform hover:scale-[1.02]"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Wrench className="size-4.5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">HandyHub</span>
        </Link>

        <form
          onSubmit={handleSearch}
          className="relative mx-auto hidden w-full max-w-md md:block"
          role="search"
        >
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            placeholder="Search services, providers..."
            className="h-9 rounded-full bg-muted/60 pl-10 text-sm"
          />
        </form>

        <div className="ml-auto flex items-center gap-3 md:gap-4">
          {!isPending && !session?.user ? (
            <>
              <Link href="/sign-in" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          ) : session?.user ? (
            <>
              <div className="hidden items-center gap-4 lg:flex">
                {session.user.role === "admin" ? (
                  <Link href="/admin" className={navLinkClass}>
                    Admin
                  </Link>
                ) : session.user.role === "provider" ? (
                  <Link href="/my-services" className={navLinkClass}>
                    My Services
                  </Link>
                ) : (
                  <Link href="/allservices" className={navLinkClass}>
                    All Services
                  </Link>
                )}
                {session.user.role !== "admin" && (
                  <Link href="/my-bookings" className={navLinkClass}>
                    My Bookings
                  </Link>
                )}
              </div>
              <NotificationBell />
              <Link
                href="/profile"
                className="hidden items-center gap-2 rounded-full border py-1 pr-3 pl-1 transition-colors hover:bg-muted sm:flex"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {session.user.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="max-w-24 truncate text-sm font-medium">
                  {session.user.name}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                aria-label="Sign out"
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="size-4" />
              </Button>
              <MobileSidebar
                role={session.user.role}
                name={session.user.name}
              />
            </>
          ) : (
            <div className="flex gap-3">
              <div className="h-9 w-20 animate-pulse rounded-full bg-muted" />
              <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
