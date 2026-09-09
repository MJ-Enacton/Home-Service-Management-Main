"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MapPin, Phone, Wrench } from "lucide-react";

const platformLinks = [
  { href: "/services", label: "Services" },
  { href: "/customer/my-bookings", label: "My Bookings" },
  { href: "/customer/profile", label: "Profile" },
];

const supportLinks = [
  { href: "/customer/notifications", label: "Notifications" },
  { href: "/sign-in", label: "Sign In" },
  { href: "/sign-up", label: "Create Account" },
];

const providerLinks = [
  { href: "/sign-up", label: "Become a Provider" },
  { href: "/provider/my-services", label: "My Services" },
];

export function Footer() {
  const pathname = usePathname();

  if (
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/verify-email" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/admin" ||
    pathname?.startsWith("/admin/")
  ) {
    return null;
  }

  return (
    <footer className="border-t bg-white dark:bg-zinc-900 dark:border-zinc-800">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900">
                <Wrench className="size-4" />
              </span>
              <span className="text-base font-bold tracking-tight">HandyHub</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Book trusted local pros for plumbing, cleaning, electrical and more. Real pros, real reviews, on your schedule.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="size-3.5" />
                support@handyhub.com
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-3.5" />
                +1 (800) 555-0199
              </li>
            </ul>
          </div>

          <div className="flex gap-10 text-sm">
            <nav aria-label="Platform" className="min-w-24">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-900 dark:text-white">Platform</h3>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                {platformLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Support" className="min-w-24">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-900 dark:text-white">Support</h3>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                {supportLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="For providers" className="hidden min-w-24 sm:block">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-900 dark:text-white">Providers</h3>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                {providerLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-zinc-100 pt-6 text-xs text-muted-foreground dark:border-zinc-800 sm:flex-row">
          <p>© {new Date().getFullYear()} HandyHub. Built for real homes.</p>
          <p className="flex items-center gap-1.5">
            <MapPin className="size-3" /> Tech City, CA · 24/7 support
          </p>
        </div>
      </div>
    </footer>
  );
}
