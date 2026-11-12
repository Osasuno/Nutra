"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save } from "lucide-react";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/client-api";

export type PatientFormValues = {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  sex: string;
  objective: string;
};

const EMPTY: PatientFormValues = {
  name: "",
  email: "",
  phone: "",
  birthDate: "",
  sex: "",
  objective: "",
};

export function PatientForm({
  patientId,
  initial,
  submitLabel = "Salvar",
}: {
  patientId?: string;
  initial?: Partial<PatientFormValues>;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PatientFormValues>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof PatientFormValues) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setSaved(false);
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const data = { ...values };
    try {
      if (patientId) {
        await api(`/api/patients/${patientId}`, { method: "PATCH", body: { action: "update", data } });
        setSaved(true);
        router.refresh();
      } else {
        const res = await api<{ id: string }>("/api/patients", { body: data });
        router.push(`/nutri/pacientes/${res.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} method="post" className="space-y-4">
      <Field label="Nome completo" htmlFor="name">
        <Input id="name" value={values.name} onChange={set("name")} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="E-mail" htmlFor="email" hint="Usado para o paciente criar a conta pelo convite.">
          <Input id="email" type="email" value={values.email} onChange={set("email")} />
        </Field>
        <Field label="Telefone / WhatsApp" htmlFor="phone">
          <Input id="phone" type="tel" value={values.phone} onChange={set("phone")} placeholder="(11) 99999-9999" />
        </Field>
        <Field label="Data de nascimento" htmlFor="birthDate" hint="Necessária para idade e fórmulas.">
          <Input id="birthDate" type="date" value={values.birthDate} onChange={set("birthDate")} />
        </Field>
        <Field label="Sexo" htmlFor="sex" hint="Usado nas fórmulas nutricionais.">
          <Select id="sex" value={values.sex} onChange={set("sex")}>
            <option value="">Não informado</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
          </Select>
        </Field>
      </div>
      <Field label="Objetivo principal" htmlFor="objective">
        <Textarea
          id="objective"
          value={values.objective}
          onChange={set("objective")}
          rows={2}
          maxLength={300}
          placeholder="Ex.: emagrecimento com ganho de massa muscular"
        />
      </Field>
      <p className="text-xs text-slate-500">As consultas são marcadas na Agenda (menu lateral) ou na visão geral do paciente.</p>
      {error ? <Alert tone="red">{error}</Alert> : null}
      {saved ? <Alert tone="green">Dados salvos.</Alert> : null}
      <Button type="submit" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
