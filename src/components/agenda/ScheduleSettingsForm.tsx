"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { NumberInput } from "@/components/NumberInput";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, Select } from "@/components/ui";
import { api } from "@/lib/client-api";
import { SLOT_OPTIONS, WEEKDAYS, type AppointmentMode, type ScheduleSettings } from "@/lib/schedule";

export function ScheduleSettingsForm({ initial }: { initial: ScheduleSettings }) {
  const router = useRouter();
  const [s, setS] = useState<ScheduleSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "green" | "red"; text: string } | null>(null);

  const set = <K extends keyof ScheduleSettings>(key: K, value: ScheduleSettings[K]) => {
    setS((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  };
  const setDay = (day: number, ranges: ScheduleSettings["days"][number]) =>
    set("days", s.days.map((r, i) => (i === day ? ranges : r)));
  const toggleMode = (mode: AppointmentMode) =>
    set("modes", s.modes.includes(mode) ? s.modes.filter((m) => m !== mode) : [...s.modes, mode]);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/profile/schedule", { method: "PUT", body: s });
      setMessage({ tone: "green", text: "Horários salvos. Os pacientes já veem os novos horários livres." });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "red", text: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader title="Dias e horários de atendimento" description="Os pacientes só podem solicitar consultas dentro destas faixas." />
        <CardBody className="divide-y divide-slate-100">
          {WEEKDAYS.map((label, day) => {
            const ranges = s.days[day] ?? [];
            const enabled = ranges.length > 0;
            return (
              <div key={label} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start">
                <label className="flex w-32 shrink-0 items-center gap-2 pt-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setDay(day, e.target.checked ? [{ start: "08:00", end: "12:00" }] : [])}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  {label}
                </label>
                {enabled ? (
                  <div className="flex-1 space-y-2">
                    {ranges.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={r.start}
                          onChange={(e) => setDay(day, ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                          className="min-w-0 flex-1 sm:w-32 sm:flex-none"
                          aria-label={`${label}: início`}
                        />
                        <span className="shrink-0 text-sm text-slate-400">até</span>
                        <Input
                          type="time"
                          value={r.end}
                          onChange={(e) => setDay(day, ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                          className="min-w-0 flex-1 sm:w-32 sm:flex-none"
                          aria-label={`${label}: fim`}
                        />
                        <button
                          type="button"
                          onClick={() => setDay(day, ranges.filter((_, j) => j !== i))}
                          className="shrink-0 rounded-lg p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600 sm:p-2"
                          aria-label="Remover faixa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {ranges.length < 4 ? (
                      <button
                        type="button"
                        onClick={() => setDay(day, [...ranges, { start: "14:00", end: "18:00" }])}
                        className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
                      >
                        <Plus className="h-4 w-4" /> Adicionar faixa (ex.: tarde)
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="pt-2 text-sm text-slate-400">Sem atendimento</p>
                )}
              </div>
            );
          })}
        </CardBody>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Regras" />
          <CardBody className="space-y-4">
            <Field label="Duração da consulta" htmlFor="ss-slot">
              <Select id="ss-slot" value={s.slotMinutes} onChange={(e) => set("slotMinutes", Number(e.target.value))}>
                {[...new Set([...SLOT_OPTIONS, s.slotMinutes])].sort((a, b) => a - b).map((m) => (
                  <option key={m} value={m}>
                    {m} minutos
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Antecedência mínima (horas)"
              htmlFor="ss-notice"
              hint="Para o paciente solicitar, reagendar ou cancelar. Ex.: 24."
            >
              <NumberInput id="ss-notice" value={s.minNoticeHours} onValueChange={(v) => set("minNoticeHours", Math.round(v ?? 0))} />
            </Field>
            <Field label="Agendar até quantos dias à frente" htmlFor="ss-ahead">
              <NumberInput id="ss-ahead" value={s.maxDaysAhead} onValueChange={(v) => set("maxDaysAhead", Math.round(v ?? 60))} />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Modalidades oferecidas</p>
              <div className="flex gap-4">
                {(["ONLINE", "PRESENCIAL"] as const).map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={s.modes.includes(m)} onChange={() => toggleMode(m)} className="h-4 w-4 accent-emerald-600" />
                    {m === "ONLINE" ? "Online" : "Presencial"}
                  </label>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Local e link padrão" />
          <CardBody className="space-y-4">
            <Field label="Endereço do consultório" htmlFor="ss-address" hint="Usado nas consultas presenciais.">
              <Input id="ss-address" value={s.address} onChange={(e) => set("address", e.target.value)} maxLength={300} placeholder="Rua, número, sala, bairro, cidade" />
            </Field>
            <Field label="Link padrão da videochamada" htmlFor="ss-link" hint="Opcional. Você pode trocar em cada consulta.">
              <Input id="ss-link" value={s.meetingUrl} onChange={(e) => set("meetingUrl", e.target.value)} maxLength={500} placeholder="https://meet.google.com/..." />
            </Field>
          </CardBody>
        </Card>

        {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
        <Button onClick={save} disabled={busy} className="w-full">
          <Save className="h-4 w-4" /> {busy ? "Salvando..." : "Salvar horários"}
        </Button>
      </div>
    </div>
  );
}
