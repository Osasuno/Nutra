"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Link2, Send, X } from "lucide-react";
import { Alert, Button, Input, Textarea } from "@/components/ui";
import { api } from "@/lib/client-api";

export function CodeConnectForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      method="post"
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
          await api("/api/connect", { body: { code } });
          router.push("/paciente");
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Não foi possível conectar.");
        } finally {
          setLoading(false);
        }
      }}
    >
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Código da nutricionista"
          className="font-mono uppercase"
          maxLength={20}
          aria-label="Código da nutricionista"
          required
        />
        <Button type="submit" disabled={loading || code.trim().length < 4}>
          <Link2 className="h-4 w-4" /> Conectar
        </Button>
      </div>
      {error ? <Alert tone="red">{error}</Alert> : null}
    </form>
  );
}

export function RequestLinkButton({ nutritionistId, name }: { nutritionistId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Send className="h-4 w-4" /> Solicitar acompanhamento
      </Button>
    );
  }
  return (
    <div className="w-full space-y-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder={`Mensagem para ${name.split(" ")[0]} (opcional): seu objetivo, melhor horário...`}
      />
      {error ? <Alert tone="red">{error}</Alert> : null}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              await api("/api/connect", { body: { nutritionistId, message } });
              router.push("/paciente");
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Erro ao enviar a solicitação.");
              setLoading(false);
            }
          }}
        >
          <Send className="h-4 w-4" /> Enviar solicitação
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" /> Cancelar
        </Button>
      </div>
    </div>
  );
}

export function LinkActionButton({
  patientId,
  action,
  label,
  confirmText,
}: {
  patientId: string;
  action: "end" | "cancel";
  label: string;
  confirmText: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      size="sm"
      variant={action === "end" ? "danger" : "outline"}
      disabled={loading}
      onClick={async () => {
        if (!window.confirm(confirmText)) return;
        setLoading(true);
        try {
          await api("/api/connect", { method: "PATCH", body: { patientId, action } });
          router.refresh();
        } catch (err) {
          window.alert(err instanceof Error ? err.message : "Erro.");
        } finally {
          setLoading(false);
        }
      }}
    >
      {label}
    </Button>
  );
}
