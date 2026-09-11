"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileSidebar } from "@/components/MobileSidebar";
import { BrandLogo } from "@/components/BrandLogo";

function NavPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {active && (
        <motion.span
          layoutId="navbar-active-pill"
          className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-zinc-700"
          transition={{
            type: "spring",
            bounce: 0.1,
            duration: 0.7,
            delay: 0.3,
          }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </Link>
  );
}

export function Navbar() {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();

  if (
    pathname.startsWith("/admin") ||
    pathname === "/sign-in" ||
    pathname === "/sign-up"
  ) {
    return null;
  }

  const navLinkClass =
    "text-[15px] font-medium tracking-tight text-muted-foreground transition-colors hover:text-foreground";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl dark:bg-zinc-900/80 dark:border-zinc-800">
      <div className="mx-auto flex h-18 w-full max-w-7xl items-center gap-6 px-4 md:px-6">
        <div className="flex shrink-0 items-center gap-2.5">
          <BrandLogo height={48} priority />
        </div>

        {/* Center nav - purposeful, not blocky */}
        <div className="hidden flex-1 items-center justify-center lg:flex">
          {!isPending && session?.user && (
            <div className="flex items-center gap-1 rounded-full border bg-zinc-50 p-1 dark:bg-zinc-800 dark:border-zinc-700">
              {session.user.role === "customer" && (
                <NavPill href="/" active={isActive("/")}>
                  Home
                </NavPill>
              )}
              <NavPill href="/services" active={isActive("/services")}>
                Explore
              </NavPill>
              {session.user.role === "provider" && (
                <NavPill
                  href="/provider/dashboard"
                  active={isActive("/provider/dashboard")}
                >
                  Dashboard
                </NavPill>
              )}
              {session.user.role !== "admin" && (
                <NavPill
                  href={
                    session.user.role === "provider"
                      ? "/provider/my-bookings"
                      : "/customer/my-bookings"
                  }
                  active={
                    isActive(
                      session.user.role === "provider"
                        ? "/provider/my-bookings"
                        : "/customer/my-bookings",
                    ) || isActive("/my-bookings")
                  }
                >
                  Bookings
                </NavPill>
              )}
              {session.user.role === "provider" && (
                <NavPill
                  href="/provider/my-services"
                  active={
                    isActive("/provider/my-services") ||
                    isActive("/my-services")
                  }
                >
                  Services
                </NavPill>
              )}
              {session.user.role === "admin" && (
                <NavPill href="/admin" active={isActive("/admin")}>
                  Admin
                </NavPill>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          {!isPending && !session?.user ? (
            <>
              <Link href="/services" className="hidden lg:block">
                <span className={navLinkClass}>Explore</span>
              </Link>
              <Link href="/sign-in" className="hidden sm:block">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-full px-5 text-sm"
                >
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button
                  size="sm"
                  className="h-9 rounded-full bg-zinc-900 px-5 text-sm text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                >
                  Get started
                </Button>
              </Link>
            </>
          ) : session?.user ? (
            <>
              <div className="hidden items-center gap-1 lg:flex">
                <span className="mr-2 hidden text-sm text-muted-foreground xl:inline">
                  Hi, {session.user.name.split(" ")[0]}
                </span>
              </div>
              <NotificationBell />
              <Link
                href={
                  session.user.role === "provider"
                    ? "/provider/profile"
                    : session.user.role === "admin"
                      ? "/profile"
                      : "/customer/profile"
                }
                className="hidden items-center gap-2 rounded-full border bg-white py-1 pl-1 pr-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 sm:flex"
                aria-label="Profile"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">
                  {session.user.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="max-w-24 truncate">{session.user.name}</span>
              </Link>
              <MobileSidebar
                role={session.user.role}
                name={session.user.name}
              />
            </>
          ) : (
            <div className="flex gap-2">
              <div className="h-7 w-16 animate-pulse rounded-full bg-muted" />
              <div className="h-7 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
