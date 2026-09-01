"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, MessageCircle, Send, X } from "lucide-react";

import type { ChatMessage, ChatSummary } from "./actions";
import { getActiveChats, getChatMessages, sendChatMessage } from "./actions";
import { getSocket } from "@/lib/socket/client";
import { formatTimeDisplay } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

type View =
  | { kind: "closed" }
  | { kind: "list" }
  | { kind: "thread"; bookingId: string };

export function BookingChatWidget() {
  const pathname = usePathname();
  const [view, setView] = useState<View>({ kind: "closed" });
  const viewRef = useRef<View>(view);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the ref in sync with the latest view state.
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const refreshChats = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const list = await getActiveChats();
      setChats(list);
      // No active chats → nothing to show; reset any open panel.
      if (list.length === 0) {
        setView({ kind: "closed" });
      }
    } catch {
      // Ignore transient failures; polling will retry.
    }
  }, []);

  const openThread = useCallback(
    async (bookingId: string) => {
      setLoadingThread(true);
      try {
        const result = await getChatMessages(bookingId);
        if (!result.success) {
          // Booking left its active state — drop back to the list.
          setView({ kind: "list" });
          void refreshChats();
          return;
        }
        setMessages(result.messages);
        setView({ kind: "thread", bookingId });
      } finally {
        setLoadingThread(false);
      }
    },
    [refreshChats],
  );

  // Initial load + polling fallback.
  useEffect(() => {
    // Deferred so the effect body never sets state synchronously.
    const kickoff = setTimeout(() => void refreshChats(), 0);
    const interval = setInterval(() => void refreshChats(), 20000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(interval);
    };
  }, [refreshChats]);

  // Realtime updates over Socket.IO.
  useEffect(() => {
    const socket = getSocket();

    function isThreadPayload(
      payload: unknown,
    ): payload is { bookingId: string } {
      return (
        typeof payload === "object" &&
        payload !== null &&
        typeof (payload as { bookingId?: unknown }).bookingId === "string"
      );
    }

    function handleIncoming(rawPayload: unknown) {
      if (!isThreadPayload(rawPayload)) return;
      const payload = rawPayload;
      const current = viewRef.current;
      if (
        current.kind === "thread" &&
        current.bookingId === payload.bookingId
      ) {
        // Re-fetch so read receipts stay accurate.
        void getChatMessages(payload.bookingId).then((result) => {
          if (result.success) setMessages(result.messages);
        });
      }
      void refreshChats();
    }

    socket.on("chat:message", handleIncoming);
    socket.on("chat:refresh", () => void refreshChats());

    return () => {
      socket.off("chat:message");
      socket.off("chat:refresh");
    };
  }, [refreshChats]);

  // Keep the thread scrolled to the newest message.
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, loadingThread]);

  // Hidden for admins and when there's nothing to chat about.
  if (pathname.startsWith("/admin") || chats.length === 0) {
    return null;
  }

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  async function handleSend() {
    if (view.kind !== "thread" || !draft.trim() || sending) return;
    const bookingId = view.bookingId;
    const body = draft.trim();
    setSending(true);
    try {
      const result = await sendChatMessage(bookingId, body);
      if (!result.success) {
        toast.add({
          title: result.error ?? "Message failed to send.",
          type: "error",
        });
        return;
      }
      setMessages((prev) =>
        prev.some((message) => message.id === result.message.id)
          ? prev
          : [...prev, result.message],
      );
      setDraft("");
      void refreshChats();
    } finally {
      setSending(false);
    }
  }

  const activeChat =
    view.kind === "thread"
      ? chats.find((chat) => chat.bookingId === view.bookingId)
      : undefined;

  return (
    <>
      {/* Panel */}
      {view.kind !== "closed" && (
        <div className="fixed bottom-20 right-4 z-50 flex h-120 max-h-[calc(100vh-7rem)] w-90 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-xl">
          {/* Header */}
          <div className="flex items-center gap-2 border-b bg-primary px-3 py-2.5 text-primary-foreground">
            {view.kind === "thread" && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Back to chats"
                onClick={() => setView({ kind: "list" })}
                className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
              >
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {view.kind === "thread"
                  ? (activeChat?.counterpartyName ?? "Chat")
                  : "Chats"}
              </p>
              {view.kind === "thread" && activeChat && (
                <p className="truncate text-xs text-primary-foreground/80">
                  {activeChat.listingTitle} · {activeChat.bookingNumber}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close chat"
              onClick={() => setView({ kind: "closed" })}
              className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Body */}
          {view.kind === "list" ? (
            <div className="flex-1 divide-y overflow-y-auto">
              {chats.map((chat) => (
                <button
                  key={chat.bookingId}
                  type="button"
                  onClick={() => void openThread(chat.bookingId)}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/60"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {chat.counterpartyName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {chat.counterpartyName}
                      </span>
                      {chat.lastMessage && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {new Date(
                            chat.lastMessage.createdAt,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-xs ${chat.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                      >
                        {chat.lastMessage
                          ? `${chat.lastMessage.isMine ? "You: " : ""}${chat.lastMessage.body}`
                          : `${chat.listingTitle} · say hello!`}
                      </span>
                      {chat.unreadCount > 0 && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                          {chat.unreadCount}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : loadingThread ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Booking context strip */}
              <Link
                href="/my-bookings"
                className="border-b px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/50"
              >
                {activeChat?.bookingNumber} ·{" "}
                {activeChat &&
                  new Date(activeChat.scheduledDate).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    },
                  )}{" "}
                ·{" "}
                {activeChat && formatTimeDisplay(activeChat.scheduledTimeSlot)}
              </Link>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 space-y-2 overflow-y-auto p-3"
              >
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No messages yet. Say hello!
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          message.isMine
                            ? "rounded-br-sm bg-primary text-white"
                            : "rounded-bl-sm bg-muted text-foreground"
                        }`}
                      >
                        <p className="wrap-break-word whitespace-pre-wrap">
                          {message.body}
                        </p>
                        <p
                          className={`mt-1 text-right text-[10px] ${
                            message.isMine
                              ? "text-white/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatTimeDisplay(
                            `${String(message.createdAt.getHours()).padStart(2, "0")}:${String(message.createdAt.getMinutes()).padStart(2, "0")}`,
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Composer */}
              <form
                className="flex items-center gap-2 border-t p-2.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSend();
                }}
              >
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type a message…"
                  maxLength={2000}
                  className="h-9 flex-1 rounded-full bg-background"
                  aria-label="Message"
                />
                <Button
                  type="submit"
                  size="icon-sm"
                  aria-label="Send message"
                  disabled={!draft.trim() || sending}
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Floating bubble */}
      <button
        type="button"
        aria-label={view.kind === "closed" ? "Open chats" : "Close chats"}
        onClick={() =>
          setView(
            view.kind === "closed" ? { kind: "list" } : { kind: "closed" },
          )
        }
        className="fixed bottom-4 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105"
      >
        {view.kind === "closed" ? (
          <MessageCircle className="size-6" />
        ) : (
          <X className="size-6" />
        )}
        {view.kind === "closed" && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-background bg-red-500 px-1 text-xs font-bold">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>
    </>
  );
}
