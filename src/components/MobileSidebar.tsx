"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  LayoutGrid,
  Bell,
  Briefcase,
  Menu,
  UserRound,
  Wrench,
  X,
  LogOut,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MobileSidebarProps {
  role?: string | null;
  name?: string | null;
}

export function MobileSidebar({ role, name }: MobileSidebarProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setOpen(false);
    await authClient.signOut();
    router.push("/");
  }

  const links = [
    ...(role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: LayoutGrid }]
      : role === "provider"
        ? [{ href: "/my-services", label: "My Services", icon: Wrench }]
        : [{ href: "/allservices", label: "All Services", icon: LayoutGrid }]),
    { href: "/notifications", label: "Notifications", icon: Bell },
    ...(role !== "admin"
      ? [{ href: "/my-bookings", label: "My Bookings", icon: CalendarDays }]
      : []),
    { href: "/profile", label: "Profile", icon: UserRound },
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60] md:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setOpen(false)}
            />

            <aside className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col border-l bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
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
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                  )}
                >
                  <link.icon className="size-4" />
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="border-t p-3 dark:border-zinc-800">
              {role === "provider" && (
                <Link
                  href="/allservices"
                  onClick={() => setOpen(false)}
                  className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Briefcase className="size-4" />
                  Browse Services
                </Link>
              )}
              <Button
                variant="outline"
                className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/30"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                Sign Out
              </Button>
            </div>
          </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
