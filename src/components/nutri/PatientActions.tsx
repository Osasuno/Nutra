"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, KeyRound, MessageCircle, RotateCcw, Trash2 } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { Alert, Button, buttonClass } from "@/components/ui";
import { api } from "@/lib/client-api";
import { fmtDateTime } from "@/lib/format";

/**
 * Link de nova senha para o paciente que esqueceu a senha. O link aparece só uma vez (o banco
 * guarda apenas o hash); gerar outro cancela o anterior.
 */
export function PasswordResetLink({ patientId, patientName, phone }: { patientId: string; patientName: string; phone: string | null }) {
  const [link, setLink] = useState<{ path: string; expiresAt: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const digits = phone?.replace(/\D/g, "") ?? "";
  const to = digits ? (digits.length <= 11 ? `55${digits}` : digits) : "";

  async function generate() {
    if (link && !window.confirm("Gerar um novo link? O anterior deixa de funcionar.")) return;
    setLoading(true);
    setError(null);
    try {
      setLink(await api<{ path: string; expiresAt: string }>(`/api/patients/${patientId}/password-reset`, { method: "POST" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-900">O paciente esqueceu a senha?</p>
        <p className="text-sm text-slate-600">
          Gere um link para ele criar uma senha nova. O link vale por 24 horas e funciona uma vez.
        </p>
      </div>
      {link ? (
        <>
          <p className="break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">{link.path}</p>
          <p className="text-xs text-slate-500">
            Vale até {fmtDateTime(link.expiresAt)}. Ele só aparece agora; se perder, gere outro.
          </p>
          <div className="flex flex-wrap gap-2">
            <CopyButton value={link.path} absolute label="Copiar link" />
            <button
              type="button"
              className={buttonClass("outline", "sm")}
              onClick={() => {
                const text = `Olá, ${patientName.split(" ")[0]}! Use este link para criar uma nova senha no Nutra. Ele vale por 24 horas e só funciona uma vez: ${window.location.origin}${link.path}`;
                window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
              }}
            >
              <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
            </button>
            <Button size="sm" variant="ghost" onClick={generate} disabled={loading}>
              <RotateCcw className="h-4 w-4" /> Gerar outro
            </Button>
          </div>
        </>
      ) : (
        <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
          <KeyRound className="h-4 w-4" /> {loading ? "Gerando..." : "Gerar link de nova senha"}
        </Button>
      )}
      {error ? <Alert tone="red">{error}</Alert> : null}
    </div>
  );
}

export function InviteActions({ patientId, token, patientName }: { patientId: string; token: string; patientName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const path = `/convite/${token}`;
  const shareText = (origin: string) =>
    `Olá, ${patientName.split(" ")[0]}! Crie sua conta na plataforma para acompanharmos seu plano alimentar: ${origin}${path}`;

  return (
    <div className="space-y-3">
      <p className="break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">{path}</p>
      <div className="flex flex-wrap gap-2">
        <CopyButton value={path} absolute label="Copiar link" />
        <button
          type="button"
          className={buttonClass("outline", "sm")}
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText(window.location.origin))}`, "_blank")}
        >
          <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
        </button>
        <Button
          size="sm"
          variant="ghost"
          disabled={loading}
          onClick={async () => {
            if (!window.confirm("Gerar um novo link? O link anterior deixará de funcionar.")) return;
            setLoading(true);
            await api(`/api/patients/${patientId}`, { method: "PATCH", body: { action: "regenerateInvite" } }).catch(() => undefined);
            router.refresh();
            setLoading(false);
          }}
        >
          <RotateCcw className="h-4 w-4" /> Gerar novo link
        </Button>
      </div>
    </div>
  );
}

export function StatusActions({ patientId, status }: { patientId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "archive" | "activate") {
    setLoading(true);
    setError(null);
    try {
      await api(`/api/patients/${patientId}`, { method: "PATCH", body: { action } });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    const answer = window.prompt(
      "Esta ação apaga definitivamente o prontuário, anamnese, avaliações, planos, diário, fotos e mensagens deste paciente. Para confirmar, digite EXCLUIR:",
    );
    if (answer?.trim().toUpperCase() !== "EXCLUIR") return;
    setLoading(true);
    try {
      await api(`/api/patients/${patientId}`, { method: "DELETE" });
      router.push("/nutri");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "ARCHIVED" ? (
          <Button variant="secondary" onClick={() => run("activate")} disabled={loading}>
            <RotateCcw className="h-4 w-4" /> Reativar acompanhamento
          </Button>
        ) : status === "ACTIVE" ? (
          <Button variant="outline" onClick={() => run("archive")} disabled={loading}>
            <Archive className="h-4 w-4" /> Arquivar paciente
          </Button>
        ) : null}
        <Button variant="danger" onClick={remove} disabled={loading}>
          <Trash2 className="h-4 w-4" /> Excluir prontuário
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Arquivar encerra o acompanhamento (o paciente perde acesso ao chat e ao diário), mas mantém o histórico.
      </p>
      {error ? <Alert tone="red">{error}</Alert> : null}
    </div>
  );
}
