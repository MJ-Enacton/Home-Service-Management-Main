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

    socket.on("notification:new", (payload: NewRequestEvent) => {
      setItems((prev) => {
        if (prev.some((item) => item.id === payload.id)) return prev;
        const incoming: Item = {
          id: payload.id,
          message: payload.message,
          title: "New booking request",
          type: payload.type ?? "new_request",
          bookingId: payload.bookingId,
          bookingStatus:
            payload.type === "request_accepted" ? "confirmed" : null,
          readAt: null,
          archivedAt: null,
          createdAt: new Date(payload.createdAt),
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
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6">
      <div className="mb-8 border-b bg-muted/40 -mx-4 px-4 py-8 md:-mx-6 md:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Notifications
          </h1>
          <p className="text-muted-foreground">
            {hasUnread
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
              : "You are all caught up."}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-end gap-4">
        {hasUnread && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="size-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="overflow-hidden border-dashed bg-muted/40">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Bell className="size-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">No notifications yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                New booking requests and status updates will show up here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
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
