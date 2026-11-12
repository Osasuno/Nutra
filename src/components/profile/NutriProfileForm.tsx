"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { api } from "@/lib/client-api";

export type NutriProfileValues = {
  name: string;
  phone: string;
  crn: string;
  specialties: string;
  bio: string;
  city: string;
  state: string;
  acceptingPatients: boolean;
  showInDirectory: boolean;
};

export function NutriProfileForm({ initial }: { initial: NutriProfileValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [message, setMessage] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const set = <K extends keyof NutriProfileValues>(key: K, value: NutriProfileValues[K]) => setV((p) => ({ ...p, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await api("/api/profile", { method: "PATCH", body: v });
      setMessage({ tone: "green", text: "Perfil atualizado." });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "red", text: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} method="post" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="np-name">
          <Input id="np-name" value={v.name} onChange={(e) => set("name", e.target.value)} required />
        </Field>
        <Field label="CRN" htmlFor="np-crn">
          <Input id="np-crn" value={v.crn} onChange={(e) => set("crn", e.target.value)} required />
        </Field>
        <Field label="Telefone / WhatsApp" htmlFor="np-phone">
          <Input id="np-phone" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Especialidades" htmlFor="np-spec" hint="Ex.: esportiva, materno-infantil, clínica">
          <Input id="np-spec" value={v.specialties} onChange={(e) => set("specialties", e.target.value)} maxLength={300} />
        </Field>
        <Field label="Cidade" htmlFor="np-city">
          <Input id="np-city" value={v.city} onChange={(e) => set("city", e.target.value)} maxLength={100} />
        </Field>
        <Field label="UF" htmlFor="np-state">
          <Input id="np-state" value={v.state} onChange={(e) => set("state", e.target.value.toUpperCase())} maxLength={2} />
        </Field>
      </div>
      <Field label="Apresentação" htmlFor="np-bio" hint="Aparece no diretório de nutricionistas para os pacientes.">
        <Textarea id="np-bio" value={v.bio} onChange={(e) => set("bio", e.target.value)} rows={4} maxLength={2000} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={v.showInDirectory} onChange={(e) => set("showInDirectory", e.target.checked)} className="h-4 w-4 accent-emerald-600" />
        Aparecer no diretório de nutricionistas
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={v.acceptingPatients} onChange={(e) => set("acceptingPatients", e.target.checked)} className="h-4 w-4 accent-emerald-600" />
        Aceitando novos pacientes pelo diretório
      </label>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      <Button type="submit" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Salvando..." : "Salvar perfil"}
      </Button>
    </form>
  );
}

export function InviteCodeCard({ code }: { code: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <div className="space-y-3">
      <p className="font-mono text-3xl font-semibold tracking-widest text-emerald-700">{code}</p>
      <p className="text-sm text-slate-500">
        Quem se cadastrar com este código (ou pelo link) entra direto como seu paciente.
      </p>
      <div className="flex flex-wrap gap-2">
        <CopyButton value={code} label="Copiar código" />
        <CopyButton value={`/cadastro?codigo=${code}`} absolute label="Copiar link de cadastro" />
        <Button
          size="sm"
          variant="ghost"
          disabled={loading}
          onClick={async () => {
            if (!window.confirm("Gerar um novo código? O código atual deixará de funcionar.")) return;
            setLoading(true);
            await api("/api/profile/invite-code", { method: "POST" }).catch(() => undefined);
            router.refresh();
            setLoading(false);
          }}
        >
          <RotateCcw className="h-4 w-4" /> Gerar novo código
        </Button>
      </div>
    </div>
  );
}
