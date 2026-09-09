"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  Users,
  HardHat,
  Wallet,
  ClipboardList,
  Menu,
  X,
  Home,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SignOutDialog } from "@/components/auth/SignOutDialog";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/services", label: "Services", icon: Wrench },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/providers", label: "Providers", icon: HardHat },
  { href: "/admin/revenue", label: "Revenue", icon: Wallet },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

interface AdminShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    role?: string | null;
  };
}

export function AdminShell({ children, user }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 md:flex">
        <Link
          href="/"
          className="flex items-center gap-2 border-b px-4 py-4 dark:border-zinc-800"
        >
          <div className="rounded-lg bg-primary p-1.5">
            <Home className="size-5 text-white" />
          </div>
          <span className="bg-linear-to-r bg-clip-text text-xl font-bold tracking-tight text-transparent from-primary to-primary/60">
            HomeService
          </span>
        </Link>

        <div className="flex flex-1 flex-col overflow-y-auto p-3">
          <NavLinks />

          <div className="mt-auto border-t pt-3 dark:border-zinc-800">
            <div className="mb-2 px-2">
              <p className="truncate text-sm font-medium leading-none">
                {user.name}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground capitalize">
                {user.role}
              </p>
            </div>
            <SignOutDialog
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/30"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </Button>
              }
            />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-white/95 px-4 backdrop-blur dark:border-zinc-800 dark:bg-black/95 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-1.5">
            <Home className="size-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">HomeService</span>
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle admin menu"
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </Button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-x-0 top-14 bottom-0 z-30 bg-black/20 md:hidden dark:bg-black/50"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="mx-4 mt-3 flex max-h-[calc(100%-1.5rem)] flex-col rounded-xl border bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(event) => event.stopPropagation()}
          >
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <div className="mt-auto border-t pt-3 dark:border-zinc-800">
              <div className="mb-2 px-2">
                <p className="truncate text-sm font-medium leading-none">
                  {user.name}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground capitalize">
                  {user.role}
                </p>
              </div>
              <SignOutDialog
                onSignedOut={() => setMobileOpen(false)}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/30"
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 pt-18 pb-8 md:ml-60 md:px-6 md:pt-8">
        {children}
      </main>
    </div>
  );
}
