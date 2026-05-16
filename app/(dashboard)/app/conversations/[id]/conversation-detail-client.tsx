"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Bot, User, MessageCircle } from "lucide-react";

interface Message {
  id: string;
  senderType: "customer" | "ai" | "agent";
  text: string;
  createdAt: string;
}

interface Customer {
  id: string;
  displayName: string;
  pictureUrl: string | null;
  lineUserId: string;
}

interface ConversationDetail {
  id: string;
  status: "ai" | "needs_agent" | "agent_handling" | "resolved";
  customer: Customer | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationDetailClient({
  conversationId,
}: {
  conversationId: string;
}) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!alive) return;
        if (!data?.ok) {
          setError(data?.error || "load failed");
          return;
        }
        setConversation(data.conversation as ConversationDetail);
        setMessages(data.messages as Message[]);
      } catch (err) {
        if (alive) setError((err as Error).message);
      } finally {
        if (alive) timer = setTimeout(load, 30000);
      }
    };
    load();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!data?.ok) {
        setError(data?.error || "send failed");
        return;
      }
      // Optimistic: append to local state, full message will appear on next poll.
      setMessages((prev) =>
        prev
          ? [
              ...prev,
              {
                id: `local-${Date.now()}`,
                senderType: "agent",
                text,
                createdAt: new Date().toISOString(),
              },
            ]
          : prev,
      );
      setDraft("");
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (!conversation && !error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        載入中…
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        載入失敗：{error}
      </div>
    );
  }

  const customer = conversation?.customer;

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-3.5rem)] flex-col bg-slate-50 md:-mx-8 md:rounded-2xl md:border md:border-slate-200 md:bg-white">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:rounded-t-2xl">
        <Link
          href="/app/conversations"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        {customer?.pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={customer.pictureUrl}
            alt={customer.displayName}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
            {customer?.displayName.slice(0, 1) ?? "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-slate-900">
            {customer?.displayName ?? "未命名"}
          </h2>
          <p className="truncate text-xs text-slate-500">
            {conversation?.status === "ai" && "🤖 AI 處理中"}
            {conversation?.status === "needs_agent" && "⚠️ 建議接手"}
            {conversation?.status === "agent_handling" && "👤 你正在處理"}
            {conversation?.status === "resolved" && "✅ 已處理"}
          </p>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4"
      >
        {messages?.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <MessageCircle className="mb-2 h-10 w-10" />
            <p className="text-sm">尚無訊息</p>
          </div>
        )}
        {messages?.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      <footer className="border-t border-slate-200 bg-white p-3 md:rounded-b-2xl">
        {error && (
          <p className="mb-2 text-xs text-red-600">送出失敗：{error}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="打字回覆客人…(送出後 Bot 會以你的名義發送)"
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isCustomer = message.senderType === "customer";
  const isAgent = message.senderType === "agent";
  const isAi = message.senderType === "ai";

  if (isCustomer) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] space-y-1">
          <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm">
            {message.text}
          </div>
          <p className="px-1 text-[10px] text-slate-400">
            💬 客人 · {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] space-y-1">
        <div
          className={`rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm shadow-sm ${
            isAgent ? "bg-slate-900 text-white" : "bg-blue-100 text-blue-900"
          }`}
        >
          {message.text}
        </div>
        <p className="px-1 text-right text-[10px] text-slate-400">
          {isAi ? (
            <>
              <Bot className="-mt-0.5 mr-1 inline h-3 w-3" />
              AI
            </>
          ) : (
            <>
              <User className="-mt-0.5 mr-1 inline h-3 w-3" />你
            </>
          )}{" "}
          · {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
