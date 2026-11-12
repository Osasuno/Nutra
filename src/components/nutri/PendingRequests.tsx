"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, UserPlus, X } from "lucide-react";
import { Alert, Avatar, Button, Card, CardHeader } from "@/components/ui";
import { api } from "@/lib/client-api";
import { fmtRelative } from "@/lib/format";
import type { PatientCardData } from "@/lib/patients";

export function PendingRequests({ requests }: { requests: PatientCardData[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(id: string, action: "accept" | "reject") {
    setBusy(id);
    setError(null);
    try {
      await api(`/api/patients/${id}`, { method: "PATCH", body: { action } });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar a solicitação.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="mb-6 border-amber-200">
      <CardHeader
        icon={<UserPlus className="h-5 w-5" />}
        title={`Solicitações de acompanhamento (${requests.length})`}
        description="Pacientes que encontraram você no diretório e pediram para ser atendidos."
      />
      <ul className="divide-y divide-slate-100">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
            <Avatar name={r.name} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">{r.name}</p>
              <p className="text-xs text-slate-500">
                {r.email} · solicitado {fmtRelative(r.createdAt)}
              </p>
              {r.requestMessage ? <p className="mt-1 text-sm text-slate-600">“{r.requestMessage}”</p> : null}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => decide(r.id, "accept")} disabled={busy === r.id}>
                <Check className="h-4 w-4" /> Aceitar
              </Button>
              <Button size="sm" variant="outline" onClick={() => decide(r.id, "reject")} disabled={busy === r.id}>
                <X className="h-4 w-4" /> Recusar
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {error ? (
        <div className="px-5 pb-4">
          <Alert tone="red">{error}</Alert>
        </div>
      ) : null}
    </Card>
  );
}
