"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save } from "lucide-react";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { api } from "@/lib/client-api";

export type PatientProfileValues = { name: string; phone: string; birthDate: string; sex: string };

export function PatientProfileForm({ initial }: { initial: PatientProfileValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [message, setMessage] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (key: keyof PatientProfileValues) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [key]: e.target.value }));

  return (
    <form
      method="post"
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
          await api("/api/profile", { method: "PATCH", body: v });
          setMessage({ tone: "green", text: "Dados atualizados." });
          router.refresh();
        } catch (err) {
          setMessage({ tone: "red", text: err instanceof Error ? err.message : "Erro ao salvar." });
        } finally {
          setLoading(false);
        }
      }}
    >
      <Field label="Nome completo" htmlFor="pp-name">
        <Input id="pp-name" value={v.name} onChange={set("name")} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Telefone / WhatsApp" htmlFor="pp-phone">
          <Input id="pp-phone" value={v.phone} onChange={set("phone")} />
        </Field>
        <Field label="Data de nascimento" htmlFor="pp-birth">
          <Input id="pp-birth" type="date" value={v.birthDate} onChange={set("birthDate")} />
        </Field>
        <Field label="Sexo" htmlFor="pp-sex">
          <Select id="pp-sex" value={v.sex} onChange={set("sex")}>
            <option value="">Não informado</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
          </Select>
        </Field>
      </div>
      <p className="text-xs text-slate-500">
        Seu prontuário clínico é mantido pela nutricionista; avise-a se algum dado mudar.
      </p>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      <Button type="submit" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
