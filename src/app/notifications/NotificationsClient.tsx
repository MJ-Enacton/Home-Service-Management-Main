"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Circle, Loader2 } from "lucide-react";

import type { NotificationItem, Role } from "@/types";
import type {
  BookingUpdatedEvent,
  NewRequestEvent,
} from "@/lib/socket/notify";
import { getSocket } from "@/lib/socket/client";
import {
  markAllNotificationsRead,
  markNotificationRead,
  respondToBooking,
} from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Item = NotificationItem & { bookingStatus: string | null };

function formatNotificationDate(date: Date | string) {
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface NotificationsClientProps {
  notifications: Item[];
  role: Role;
}

export function NotificationsClient({
  notifications,
  role,
}: NotificationsClientProps) {
  const [items, setItems] = useState<Item[]>(notifications);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  // Adjust state during render when fresh data arrives from the server
  // (https://react.dev/learn/you-might-not-need-an-effect)
  const [prevServerItems, setPrevServerItems] = useState(notifications);
  if (prevServerItems !== notifications) {
    setPrevServerItems(notifications);
    setItems(notifications);
  }

  // Real-time updates over Socket.IO (shared connection on port 5000)
  useEffect(() => {
    const socket = getSocket();

    socket.on("notification:new", (payload: NewRequestEvent & { title?: string; bookingId?: string | null }) => {
      setItems((prev) => {
        if (prev.some((item) => item.id === payload.id)) return prev;
        const raw = payload as unknown as {
          id: string;
          message: string;
          title?: string;
          type?: string;
          bookingId?: string | null;
          createdAt: string;
        };
        const incoming: Item = {
          id: raw.id,
          message: raw.message,
          title: raw.title ?? "New booking request",
          type: raw.type ?? "new_request",
          bookingId: raw.bookingId ?? null,
          bookingStatus:
            raw.type === "request_accepted" ? "confirmed" : null,
          readAt: null,
          archivedAt: null,
          createdAt: new Date(raw.createdAt),
        };
        return [incoming, ...prev];
      });
    });

    socket.on("booking:updated", (payload: BookingUpdatedEvent) => {
      setItems((prev) =>
        prev.map((item) =>
          item.bookingId === payload.bookingId
            ? { ...item, bookingStatus: payload.status }
            : item,
        ),
      );
    });

    return () => {
      socket.off("notification:new");
      socket.off("booking:updated");
    };
  }, []);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.readAt).length,
    [items],
  );

  const hasUnread = unreadCount > 0;

  function handleMarkRead(id: string) {
    void markNotificationRead(id);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id && !item.readAt ? { ...item, readAt: new Date() } : item,
      ),
    );
  }

  function handleMarkAllRead() {
    void markAllNotificationsRead();
    setItems((prev) =>
      prev.map((item) =>
        item.readAt ? item : { ...item, readAt: new Date() },
      ),
    );
  }

  async function handleRespond(id: string, accept: boolean) {
    setRespondingId(id);
    setErrorId(null);

    const result = await respondToBooking(id, accept);

    setItems((prev) =>
      prev.map((item) =>
        item.id === id && result.success
          ? {
              ...item,
              readAt: item.readAt ?? new Date(),
              bookingStatus: accept ? "confirmed" : "cancelled",
            }
          : item,
      ),
    );

    if (!result.success) {
      setErrorId(id);
    }

    setRespondingId(null);
  }

  const isProvider = role === "provider";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-12 md:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasUnread ? `${unreadCount} unread · ` : ""}Booking updates and system messages.
          </p>
        </div>
        {hasUnread && (
          <Button variant="outline" size="sm" className="h-8 rounded-full" onClick={handleMarkAllRead}>
            <CheckCheck className="size-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white py-12 text-center dark:bg-zinc-900">
          <Bell className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No notifications</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            You&apos;re all caught up — new requests and booking updates will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((notification) => {
            const isUnread = !notification.readAt;
            const canRespond =
              isProvider &&
              notification.type === "new_request" &&
              notification.bookingStatus === "requested";
            const handledByOther =
              isProvider &&
              notification.type === "new_request" &&
              notification.bookingStatus !== null &&
              notification.bookingStatus !== "requested";

            return (
              <Card
                key={notification.id}
                className={isUnread ? "border-primary/40" : undefined}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="mt-1 shrink-0">
                    <Circle
                      className={`size-2.5 ${
                        isUnread
                          ? "fill-primary text-primary"
                          : "fill-border text-border"
                      }`}
                    />
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    {notification.title && (
                      <p
                        className={`text-sm font-semibold ${
                          isUnread ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {notification.title}
                      </p>
                    )}

                    <p
                      className={`text-sm ${isUnread ? "font-medium text-foreground" : "text-muted-foreground"}`}
                    >
                      {notification.message}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {formatNotificationDate(notification.createdAt)}
                    </p>

                    {canRespond ? (
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleRespond(notification.id, true)}
                          disabled={respondingId !== null}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
                          {respondingId === notification.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : null}
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRespond(notification.id, false)}
                          disabled={respondingId !== null}
                          className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          Decline
                        </Button>
                      </div>
                    ) : handledByOther ? (
                      <p className="pt-1 text-xs font-medium text-muted-foreground">
                        Request closed
                      </p>
                    ) : null}

                    {errorId === notification.id && (
                      <p className="text-xs font-medium text-amber-600">
                        This request was already handled.
                      </p>
                    )}
                  </div>

                  {isUnread && !canRespond && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkRead(notification.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
