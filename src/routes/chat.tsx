import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ROOM = "grace-chat-global";
const NAME_KEY = "grace-chat-name";

type ChatMessage = {
  id: string;
  room: string;
  sender_name: string;
  content: string;
  created_at: string;
};

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Community Chat — Grace Book" },
      {
        name: "description",
        content:
          "Share prayer requests and encouragement in the Grace Book global chat room, updated in real time.",
      },
      { property: "og:title", content: "Community Chat — Grace Book" },
      {
        property: "og:description",
        content: "A live global room for prayer and encouragement.",
      },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setName(window.localStorage.getItem(NAME_KEY) ?? "");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room", ROOM)
        .order("created_at", { ascending: true })
        .limit(200);

      if (cancelled) return;
      if (error) {
        toast.error("Could not load the chat right now.");
      } else {
        setMessages((data ?? []) as ChatMessage[]);
      }
      setLoading(false);
    }

    void load();

    const channel = supabase
      .channel(ROOM)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room=eq.${ROOM}`,
        },
        (payload) => {
          const next = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === next.id) ? prev : [...prev, next],
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const trimmedName = useMemo(() => name.trim().slice(0, 40), [name]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    if (!trimmedName) {
      toast.error("Add a display name first.");
      return;
    }

    setSending(true);
    window.localStorage.setItem(NAME_KEY, trimmedName);
    const { error } = await supabase
      .from("chat_messages")
      .insert({ room: ROOM, sender_name: trimmedName, content: content.slice(0, 1000) });
    setSending(false);

    if (error) {
      toast.error("Message not sent. Please try again.");
      return;
    }
    setDraft("");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">
            Global <span className="text-gradient-grace">Chat</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            One room, everyone welcome. Share a prayer or an encouragement.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-glass-border px-3 py-1 text-xs font-semibold tracking-widest text-live uppercase">
          <span className="size-2 animate-pulse rounded-full bg-current" aria-hidden />
          Live
        </span>
      </header>

      <div className="glass-strong mt-8 rounded-3xl p-4 sm:p-6">
        <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Your name
        </label>
        <Input
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Miriam"
          className="mt-2 border-glass-border bg-glass"
        />

        <div className="mt-6 h-[52vh] min-h-72 space-y-3 overflow-y-auto pr-1">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No messages yet — be the first to say grace and peace.
            </p>
          ) : (
            messages.map((message) => {
              const mine = message.sender_name === trimmedName && trimmedName !== "";
              return (
                <div
                  key={message.id}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5",
                      mine
                        ? "bg-gradient-grace text-primary-foreground"
                        : "glass text-foreground",
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        mine ? "opacity-80" : "text-gold",
                      )}
                    >
                      {message.sender_name}
                    </p>
                    <p className="mt-1 text-sm break-words whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <p className="mt-1 text-[10px] opacity-60">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="mt-5 flex items-center gap-2">
          <Input
            value={draft}
            maxLength={1000}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message…"
            className="border-glass-border bg-glass"
          />
          <button
            type="submit"
            disabled={sending || draft.trim() === ""}
            aria-label="Send message"
            className="bg-gradient-grace glow-grace flex size-11 shrink-0 items-center justify-center rounded-full text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50"
          >
            <Send className="size-4" aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}
