"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Alert, Button, Textarea } from "@/components/ui";
import type { ChatMessage } from "@/lib/chat";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";

const POLL_MS = 3000;
const TZ = "America/Sao_Paulo";

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: TZ });
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

/** Altura do campo de mensagem acompanha o texto, até 160px. */
function fitHeight(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

export function Chat({
  patientId,
  currentUserId,
  otherName,
  initialMessages,
  disabledReason,
  className,
}: {
  patientId: string;
  currentUserId: string;
  otherName: string;
  initialMessages: ChatMessage[];
  disabledReason?: string | null;
  /** Altura da caixa (padrão: tela menos o cabeçalho do prontuário). */
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const lastAt = useRef<string | null>(initialMessages.at(-1)?.createdAt ?? null);
  const stickToBottom = useRef(true);

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((current) => {
      const ids = new Set(current.map((m) => m.id));
      const fresh = incoming.filter((m) => !ids.has(m.id));
      if (!fresh.length) return current;
      const next = [...current, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      lastAt.current = next.at(-1)?.createdAt ?? lastAt.current;
      return next;
    });
  }, []);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const qs = lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : "";
        const data = await api<{ messages: ChatMessage[] }>(`/api/patients/${patientId}/messages${qs}`);
        if (!stopped) merge(data.messages);
      } catch {
        // falha temporária de rede: tenta de novo no próximo ciclo
      }
    }
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [patientId, merge]);

  useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      const data = await api<{ message: ChatMessage }>(`/api/patients/${patientId}/messages`, { body: { content } });
      stickToBottom.current = true;
      merge([data.message]);
      setText("");
      requestAnimationFrame(() => fitHeight(input.current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setSending(false);
    }
  }

  return (
    // dvh: no celular a altura acompanha a barra do navegador (100vh fica maior que a área visível).
    <div
      className={cn(
        "flex h-[calc(100dvh-16rem)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="font-medium text-slate-900">{otherName}</p>
        <p className="text-xs text-slate-500">As mensagens são atualizadas automaticamente.</p>
      </div>
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-4 py-4"
      >
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">Nenhuma mensagem ainda. Diga olá! 👋</p>
        ) : (
          messages.map((m, i) => {
            const mine = m.senderId === currentUserId;
            const newDay = i === 0 || dayLabel(messages[i - 1].createdAt) !== dayLabel(m.createdAt);
            return (
              <div key={m.id}>
                {newDay ? (
                  <p className="my-3 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {dayLabel(m.createdAt)}
                  </p>
                ) : null}
                <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                      mine ? "rounded-br-sm bg-emerald-600 text-white" : "rounded-bl-sm bg-white text-slate-800 ring-1 ring-slate-200",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={cn("mt-0.5 text-right text-[10px]", mine ? "text-emerald-100" : "text-slate-400")}>
                      {timeLabel(m.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="border-t border-slate-100 p-3">
        {disabledReason ? (
          <Alert tone="blue">{disabledReason}</Alert>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <Textarea
              ref={input}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                fitHeight(e.currentTarget);
              }}
              onKeyDown={(e) => {
                // Com teclado físico, Enter envia. Na tela de toque, Enter quebra a linha e o botão envia.
                const touch = window.matchMedia("(pointer: coarse)").matches;
                if (e.key === "Enter" && !e.shiftKey && !touch && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={4000}
              enterKeyHint="enter"
              placeholder="Escreva uma mensagem"
              className="max-h-40 min-h-10 resize-none"
              aria-label="Mensagem"
            />
            <Button type="submit" disabled={sending || !text.trim()} aria-label="Enviar" className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        )}
        {!disabledReason ? (
          <p className="mt-1.5 hidden text-[11px] text-slate-400 [@media(pointer:fine)]:block">
            Enter envia · Shift+Enter quebra a linha
          </p>
        ) : null}
        {error ? (
          <Alert tone="red" className="mt-2">
            {error}
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
