"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutGrid,
  Briefcase,
  Menu,
  UserRound,
  Wrench,
  X,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SignOutDialog } from "@/components/auth/SignOutDialog";

interface MobileSidebarProps {
  role?: string | null;
  name?: string | null;
}

export function MobileSidebar({ role, name }: MobileSidebarProps) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const links = [
    ...(role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: LayoutGrid }]
      : role === "provider"
        ? [
            {
              href: "/provider/my-services",
              label: "My Services",
              icon: Wrench,
            },
          ]
        : [{ href: "/services", label: "Services", icon: LayoutGrid }]),
    ...(role !== "admin"
      ? [
          {
            href:
              role === "provider"
                ? "/provider/my-bookings"
                : "/customer/my-bookings",
            label: "My Bookings",
            icon: CalendarDays,
          },
        ]
      : []),
    {
      href:
        role === "provider"
          ? "/provider/profile"
          : role === "customer"
            ? "/customer/profile"
            : "/profile",
      label: "Profile",
      icon: UserRound,
    },
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="fixed inset-0 z-60 lg:hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                  onClick={() => setOpen(false)}
                />

                <motion.aside
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col border-l bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-center justify-between border-b p-4 dark:border-zinc-800">
                    <div className="min-w-0">
                      {name && (
                        <p className="truncate text-sm font-semibold">{name}</p>
                      )}
                      {role && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {role}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Close menu"
                      onClick={() => setOpen(false)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>

                  <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                    {links.map((link) => {
                      const active = isActive(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            active
                              ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                          )}
                        >
                          <link.icon className="size-4" />
                          {link.label}
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="border-t p-3 dark:border-zinc-800">
                    {role === "provider" && (
                      <Link
                        href="/services"
                        onClick={() => setOpen(false)}
                        aria-current={isActive("/services") ? "page" : undefined}
                        className={cn(
                          "mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive("/services")
                            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                        )}
                      >
                        <Briefcase className="size-4" />
                        Browse Services
                      </Link>
                    )}
                    <SignOutDialog
                      onSignedOut={() => setOpen(false)}
                      trigger={
                        <Button
                          variant="outline"
                          className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/30"
                        >
                          <LogOut className="size-4" />
                          Sign Out
                        </Button>
                      }
                    />
                  </div>
                </motion.aside>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
