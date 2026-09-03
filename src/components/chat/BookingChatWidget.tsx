"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, MessageCircle, Send, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import type { ChatMessage, ChatSummary } from "./actions";
import { getActiveChats, getChatMessages, sendChatMessage } from "./actions";
import { getSocket } from "@/lib/socket/client";
import { formatTimeDisplay } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useSession } from "@/lib/auth-client";

type View =
  | { kind: "closed" }
  | { kind: "list" }
  | { kind: "thread"; bookingId: string };

export function BookingChatWidget() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const bookingsHref = role === "provider" ? "/provider/my-bookings" : role === "customer" ? "/customer/my-bookings" : "/customer/my-bookings";
  const [view, setView] = useState<View>({ kind: "closed" });
  const viewRef = useRef<View>(view);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingEmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

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
        setRemoteTyping(false);
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

    function isTypingPayload(
      payload: unknown,
    ): payload is { bookingId: string; isTyping: boolean } {
      return (
        typeof payload === "object" &&
        payload !== null &&
        typeof (payload as { bookingId?: unknown }).bookingId === "string" &&
        typeof (payload as { isTyping?: unknown }).isTyping === "boolean"
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
        setRemoteTyping(false);
      }
      void refreshChats();
    }

    function handleTyping(raw: unknown) {
      if (!isTypingPayload(raw)) return;
      const current = viewRef.current;
      if (
        current.kind !== "thread" ||
        current.bookingId !== raw.bookingId
      )
        return;
      if (raw.isTyping) {
        setRemoteTyping(true);
        if (typingClearRef.current) clearTimeout(typingClearRef.current);
        typingClearRef.current = setTimeout(() => setRemoteTyping(false), 3000);
      } else {
        setRemoteTyping(false);
        if (typingClearRef.current) clearTimeout(typingClearRef.current);
      }
    }

    socket.on("chat:message", handleIncoming);
    socket.on("chat:refresh", () => void refreshChats());
    socket.on("chat:typing", handleTyping);

    return () => {
      socket.off("chat:message", handleIncoming);
      socket.off("chat:refresh");
      socket.off("chat:typing", handleTyping);
    };
  }, [refreshChats]);

  // Typing emit — subtle, throttled
  useEffect(() => {
    if (view.kind !== "thread") return;
    const socket = getSocket();
    const bookingId = view.bookingId;

    // stop helper
    const emitStop = () => {
      socket.emit("chat:typing", { bookingId, isTyping: false });
      lastTypingEmitRef.current = 0;
    };

    if (draft.trim().length === 0) {
      if (typingEmitTimeoutRef.current) clearTimeout(typingEmitTimeoutRef.current);
      emitStop();
      return;
    }

    const now = Date.now();
    if (now - lastTypingEmitRef.current > 800) {
      socket.emit("chat:typing", { bookingId, isTyping: true });
      lastTypingEmitRef.current = now;
    }

    if (typingEmitTimeoutRef.current) clearTimeout(typingEmitTimeoutRef.current);
    typingEmitTimeoutRef.current = setTimeout(() => {
      socket.emit("chat:typing", { bookingId, isTyping: false });
    }, 1400);

    return () => {
      if (typingEmitTimeoutRef.current) clearTimeout(typingEmitTimeoutRef.current);
    };
  }, [draft, view]);

  // Clear typing when switching threads/views
  useEffect(() => {
    if (view.kind !== "thread") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset transient UI on view exit
      setRemoteTyping(false);
    }
    if (view.kind !== "thread" && typingEmitTimeoutRef.current) {
      clearTimeout(typingEmitTimeoutRef.current);
    }
  }, [view]);

  // Keep the thread scrolled to the newest message.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      element.scrollTop = element.scrollHeight;
    } else {
      element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loadingThread, remoteTyping]);

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
      // stop typing immediately
      getSocket().emit("chat:typing", { bookingId, isTyping: false });
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
      <AnimatePresence>
        {view.kind !== "closed" && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-20 right-4 z-50 flex h-120 max-h-[calc(100vh-7rem)] w-90 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-xl"
          >
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
                  <motion.button
                    key={chat.bookingId}
                    type="button"
                    onClick={() => void openThread(chat.bookingId)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    whileTap={{ scale: 0.99 }}
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
                          <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white"
                          >
                            {chat.unreadCount}
                          </motion.span>
                        )}
                      </span>
                    </span>
                  </motion.button>
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
                  href={bookingsHref}
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
                    <>
                      <AnimatePresence initial={false}>
                        {messages.map((message) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
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
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <AnimatePresence>
                        {remoteTyping && (
                          <motion.div
                            key="typing"
                            initial={{ opacity: 0, y: 4, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="flex justify-start"
                          >
                            <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2.5">
                              <span className="flex items-center gap-1">
                                <motion.span
                                  className="size-1.5 rounded-full bg-foreground/60"
                                  animate={{ y: [0, -4, 0] }}
                                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                />
                                <motion.span
                                  className="size-1.5 rounded-full bg-foreground/60"
                                  animate={{ y: [0, -4, 0] }}
                                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                                />
                                <motion.span
                                  className="size-1.5 rounded-full bg-foreground/60"
                                  animate={{ y: [0, -4, 0] }}
                                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                                />
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
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
                  <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                    <Button
                      type="submit"
                      size="icon-sm"
                      aria-label="Send message"
                      disabled={!draft.trim() || sending}
                    >
                      <Send className="size-4" />
                    </Button>
                  </motion.div>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble */}
      <motion.button
        type="button"
        aria-label={view.kind === "closed" ? "Open chats" : "Close chats"}
        onClick={() =>
          setView(
            view.kind === "closed" ? { kind: "list" } : { kind: "closed" },
          )
        }
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 16 }}
        className="fixed bottom-4 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={view.kind}
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            {view.kind === "closed" ? (
              <MessageCircle className="size-6" />
            ) : (
              <X className="size-6" />
            )}
          </motion.span>
        </AnimatePresence>
        <AnimatePresence>
          {view.kind === "closed" && totalUnread > 0 && (
            <motion.span
              key={totalUnread}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-background bg-red-500 px-1 text-xs font-bold"
            >
              {totalUnread > 9 ? "9+" : totalUnread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
