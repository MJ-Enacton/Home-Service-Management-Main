"use client";

import * as React from "react";
import Link from "next/link";
import { Popover } from "@base-ui/react";
import { Bell } from "lucide-react";
import { getSocket } from "@/lib/socket/client";

interface RecentNotification {
  id: string;
  message: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [items, setItems] = React.useState<RecentNotification[]>([]);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/recent");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      // ignore fetch failures
    }
  }, []);

  React.useEffect(() => {
    let active = true;

    async function fetchUnreadCount() {
      try {
        const res = await fetch("/api/notifications/unread");
        if (!res.ok) return;
        const data = await res.json();
        if (active) setUnreadCount(data.count ?? 0);
      } catch {
        // ignore fetch failures
      }
    }

    void fetchUnreadCount();

    const socket = getSocket();

    socket.on("unread:count", (data: { count?: number }) => {
      if (active) setUnreadCount(data.count ?? 0);
    });

    socket.on("notification:new", () => {
      if (active) void fetchNotifications();
    });

    return () => {
      active = false;
      socket.off("unread:count");
      socket.off("notification:new");
    };
  }, [fetchNotifications]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      void fetchNotifications();
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        className="relative flex items-center gap-1 text-zinc-600 hover:text-blue-600 dark:text-zinc-300 transition-colors outline-none"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-4 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-50"
        >
          <Popover.Popup
            className="w-80 origin-(--transform-origin) rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            aria-label="Recent notifications"
          >
            <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">
              Notifications
            </div>
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No notifications yet
              </div>
            ) : (
              <ul className="max-h-72 overflow-y-auto p-1">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href="/notifications"
                      onClick={() => setOpen(false)}
                      className="flex flex-col gap-0.5 rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <span
                        className={
                          item.readAt
                            ? "text-sm text-zinc-600 dark:text-zinc-300"
                            : "text-sm font-medium"
                        }
                      >
                        {item.message}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {timeAgo(item.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-border p-1">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-center text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/50"
              >
                Show all Notifications
              </Link>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
