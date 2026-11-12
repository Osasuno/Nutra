"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { SLOT_OPTIONS, dateKeyOf, timeOf, zonedDate, type AppointmentMode, type Slot } from "@/lib/schedule";
import { SlotPicker } from "./SlotPicker";

export type ScheduleDefaults = {
  slotMinutes: number;
  modes: AppointmentMode[];
  address: string;
  meetingUrl: string;
};

/** A nutricionista agenda uma consulta (já confirmada). */
export function ScheduleForm({
  patients,
  fixedPatientId,
  defaultDate,
  settings,
  onDone,
}: {
  patients: { id: string; name: string }[];
  fixedPatientId?: string;
  defaultDate?: string;
  settings: ScheduleDefaults;
  onDone: () => void;
}) {
  const router = useRouter();
  const [patientId, setPatientId] = useState(fixedPatientId ?? "");
  const [mode, setMode] = useState<AppointmentMode>(settings.modes[0] ?? "ONLINE");
  const [date, setDate] = useState(defaultDate ?? "");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(settings.slotMinutes);
  const [location, setLocation] = useState(settings.address);
  const [meetingUrl, setMeetingUrl] = useState(settings.meetingUrl);
  const [notes, setNotes] = useState("");
  const [showSlots, setShowSlots] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!patientId || !date || !time) {
      setError("Escolha o paciente, a data e o horário.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/appointments", {
        body: {
          patientId,
          mode,
          startsAt: zonedDate(date, time).toISOString(),
          durationMinutes: duration,
          location: mode === "PRESENCIAL" ? location : null,
          meetingUrl: mode === "ONLINE" ? meetingUrl : null,
          notes,
        },
      });
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível agendar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!fixedPatientId ? (
        <Field label="Paciente" htmlFor="s-patient">
          <Select id="s-patient" value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
            <option value="">Selecione</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Modalidade</p>
        <div className="flex gap-2">
          {(["ONLINE", "PRESENCIAL"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm ring-1",
                mode === m ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-slate-700 ring-slate-200",
              )}
            >
              {m === "ONLINE" ? "Online" : "Presencial"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Data" htmlFor="s-date">
          <Input id="s-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Horário" htmlFor="s-time" hint="Horário de Brasília">
          <Input id="s-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </Field>
        <Field label="Duração" htmlFor="s-duration">
          <Select id="s-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {[...new Set([...SLOT_OPTIONS, settings.slotMinutes])].sort((a, b) => a - b).map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div>
        <button type="button" onClick={() => setShowSlots((v) => !v)} className="text-sm font-medium text-emerald-700 hover:underline">
          {showSlots ? "Esconder horários livres" : "Ver meus horários livres"}
        </button>
        {showSlots ? (
          <div className="mt-3 rounded-lg border border-slate-200 p-3">
            <SlotPicker
              value={slot}
              onChange={(s) => {
                setSlot(s);
                if (s) {
                  setDate(dateKeyOf(s.startsAt));
                  setTime(timeOf(s.startsAt));
                }
              }}
            />
          </div>
        ) : null}
      </div>

      {mode === "ONLINE" ? (
        <Field label="Link da videochamada (opcional)" htmlFor="s-link">
          <Input id="s-link" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/..." />
        </Field>
      ) : (
        <Field label="Local" htmlFor="s-location">
          <Input id="s-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Endereço do consultório" />
        </Field>
      )}
      <Field label="Observações para o paciente (opcional)" htmlFor="s-notes">
        <Textarea id="s-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
      </Field>

      {error ? <Alert tone="red">{error}</Alert> : null}
      <Button type="submit" disabled={busy}>
        <CalendarPlus className="h-4 w-4" /> {busy ? "Agendando..." : "Agendar consulta"}
      </Button>
    </form>
  );
}

export function NewAppointmentButton({
  patients,
  fixedPatientId,
  settings,
  label = "Nova consulta",
  variant = "primary",
}: {
  patients: { id: string; name: string }[];
  fixedPatientId?: string;
  settings: ScheduleDefaults;
  label?: string;
  variant?: "primary" | "outline" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={variant === "primary" ? "md" : "sm"} onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> {label}
      </Button>
      {open ? (
        <Modal title="Agendar consulta" onClose={() => setOpen(false)} size="lg">
          <ScheduleForm patients={patients} fixedPatientId={fixedPatientId} settings={settings} onDone={() => setOpen(false)} />
        </Modal>
      ) : null}
    </>
  );
}
