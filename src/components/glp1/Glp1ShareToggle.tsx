"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { api } from "@/lib/client-api";

/** Liga ou desliga as dicas da caneta na tela do plano do paciente. */
export function Glp1ShareToggle({ patientId, shared, hasAccount }: { patientId: string; shared: boolean; hasAccount: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(shared);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/patients/${patientId}`, { method: "PATCH", body: { action: "glp1Tips", shared: !on } });
      setOn(!on);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="min-w-0 text-sm text-slate-600">
        {on
          ? "O paciente vê as dicas em linguagem simples na tela do plano."
          : "O paciente não vê estas orientações."}
        {on && !hasAccount ? " Elas aparecem quando ele criar a conta." : ""}
        {error ? <span className="block text-red-600">{error}</span> : null}
      </p>
      <Button variant={on ? "outline" : "secondary"} size="sm" onClick={toggle} disabled={busy} className="shrink-0">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : on ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {on ? "Parar de mostrar" : "Mostrar dicas ao paciente"}
      </Button>
    </div>
  );
}
