"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MapPin, Phone, Wrench } from "lucide-react";

const platformLinks = [
  { href: "/allservices", label: "All Services" },
  { href: "/my-bookings", label: "My Bookings" },
  { href: "/profile", label: "Profile" },
];

const supportLinks = [
  { href: "/notifications", label: "Notifications" },
  { href: "/sign-in", label: "Sign In" },
  { href: "/sign-up", label: "Create Account" },
];

const providerLinks = [
  { href: "/sign-up", label: "Become a Provider" },
  { href: "/my-services", label: "My Services" },
];

export function Footer() {
  const pathname = usePathname();

  if (pathname === "/sign-in" || pathname === "/sign-up") {
    return null;
  }

  return (
    <footer className="border-t bg-muted/40 dark:border-border">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <h3 className="text-sm font-semibold">Contact Support</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0" />
                support@handyhub.com
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0" />
                +1 (800) 555-0199
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                123 Innovation Dr, Tech City, CA 94043
              </li>
            </ul>
          </div>

          <nav aria-label="Platform">
            <h3 className="text-xs font-semibold tracking-wider uppercase">
              Platform
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Support">
            <h3 className="text-xs font-semibold tracking-wider uppercase">
              Support
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="For providers">
            <h3 className="text-xs font-semibold tracking-wider uppercase">
              For Providers
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {providerLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex size-5 items-center justify-center rounded bg-primary">
              <Wrench className="size-3 text-primary-foreground" />
            </span>
            © {new Date().getFullYear()} HandyHub Marketplace. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
