"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Check,
  Clock,
  ExternalLink,
  MapPin,
  Pencil,
  RefreshCw,
  UserX,
  Video,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { Alert, Badge, Button, Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import {
  MODE_LABEL,
  SLOT_OPTIONS,
  STATUS_INFO,
  dateKeyOf,
  durationMinutes,
  googleCalendarUrl,
  longWhen,
  patientCanChange,
  shortWhen,
  timeOf,
  zonedDate,
  type AppointmentDTO,
  type AppointmentMode,
  type Slot,
} from "@/lib/schedule";
import { SlotPicker } from "./SlotPicker";

type Viewer = "NUTRITIONIST" | "PATIENT";
type Dialog = null | "confirm" | "reschedule" | "cancel" | "details";

export function AppointmentItem({
  appointment: a,
  viewer,
  now,
  minNoticeHours,
  showPerson = true,
  className,
}: {
  appointment: AppointmentDTO;
  viewer: Viewer;
  /** Momento da requisição (ISO), para decisões dependentes de tempo. */
  now: string;
  minNoticeHours: number;
  showPerson?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nowDate = new Date(now);
  const started = new Date(a.startsAt) <= nowDate;
  const open = a.status === "REQUESTED" || a.status === "CONFIRMED";
  const status = STATUS_INFO[a.status];
  const patientMayChange = viewer === "PATIENT" && open && patientCanChange(a.status, a.startsAt, minNoticeHours, nowDate);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/appointments/${a.id}`, { method: "PATCH", body });
      setDialog(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }

  const close = () => {
    setDialog(null);
    setError(null);
  };

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-4", a.status === "CANCELLED" && "opacity-70", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{longWhen(a.startsAt)}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {timeOf(a.startsAt)}–{timeOf(a.endsAt)} ({durationMinutes(a)} min)
            </span>
            <span className="inline-flex items-center gap-1">
              {a.mode === "ONLINE" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
              {MODE_LABEL[a.mode]}
            </span>
            {showPerson ? (
              <span className="font-medium text-slate-700">
                {viewer === "NUTRITIONIST" ? a.patientName : a.nutritionistName}
              </span>
            ) : null}
          </p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-slate-600">
        {a.status === "REQUESTED" && a.lastActionBy === "PATIENT" && viewer === "PATIENT" ? (
          <p className="text-amber-700">Sua nutricionista vai confirmar ou sugerir outro horário.</p>
        ) : null}
        {a.previousStartsAt && open ? (
          <p className="text-xs text-slate-500">
            Reagendada {a.lastActionBy === "PATIENT" ? "pelo paciente" : "pela nutricionista"} (antes: {shortWhen(a.previousStartsAt)})
          </p>
        ) : null}
        {a.reason ? (
          <p>
            <span className="font-medium text-slate-700">Motivo:</span> {a.reason}
          </p>
        ) : null}
        {a.notes ? (
          <p>
            <span className="font-medium text-slate-700">Observações:</span> {a.notes}
          </p>
        ) : null}
        {a.mode === "PRESENCIAL" && a.location ? (
          <p className="inline-flex items-start gap-1">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {a.location}
          </p>
        ) : null}
        {a.mode === "ONLINE" && a.meetingUrl && a.status === "CONFIRMED" ? (
          <a href={a.meetingUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm", "mt-1")}>
            <Video className="h-4 w-4" /> Entrar na chamada <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
        {a.mode === "ONLINE" && !a.meetingUrl && a.status === "CONFIRMED" && viewer === "PATIENT" ? (
          <p className="text-xs text-slate-500">O link da chamada será enviado pela nutricionista.</p>
        ) : null}
        {a.status === "CANCELLED" && a.cancelReason ? <p className="text-xs">Motivo do cancelamento: {a.cancelReason}</p> : null}
      </div>

      {open || (viewer === "NUTRITIONIST" && a.status === "CONFIRMED") ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {viewer === "NUTRITIONIST" && a.status === "REQUESTED" && !started ? (
            <Button size="sm" onClick={() => setDialog("confirm")}>
              <Check className="h-4 w-4" /> Confirmar
            </Button>
          ) : null}
          {viewer === "NUTRITIONIST" && open && (!started || a.status === "REQUESTED") ? (
            <Button size="sm" variant="outline" onClick={() => setDialog("reschedule")}>
              <RefreshCw className="h-4 w-4" /> Reagendar
            </Button>
          ) : null}
          {viewer === "NUTRITIONIST" && open ? (
            <Button size="sm" variant="ghost" onClick={() => setDialog("details")}>
              <Pencil className="h-4 w-4" /> Detalhes
            </Button>
          ) : null}
          {viewer === "NUTRITIONIST" && a.status === "CONFIRMED" && started ? (
            <>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => patch({ action: "complete" })}>
                <CalendarCheck className="h-4 w-4" /> Marcar como realizada
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => window.confirm("Registrar que o paciente não compareceu?") && patch({ action: "noShow" })}
              >
                <UserX className="h-4 w-4" /> Não compareceu
              </Button>
            </>
          ) : null}
          {viewer === "NUTRITIONIST" && open && (!started || a.status === "REQUESTED") ? (
            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setDialog("cancel")}>
              <CalendarX className="h-4 w-4" /> {a.status === "REQUESTED" ? "Recusar" : "Cancelar"}
            </Button>
          ) : null}

          {viewer === "PATIENT" && open && !started ? (
            patientMayChange ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setDialog("reschedule")}>
                  <RefreshCw className="h-4 w-4" /> Reagendar
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setDialog("cancel")}>
                  <CalendarX className="h-4 w-4" /> Cancelar
                </Button>
              </>
            ) : (
              <p className="text-xs text-slate-500">
                Faltam menos de {minNoticeHours} h. Para mudar ou cancelar, fale com sua nutricionista pelo chat.
              </p>
            )
          ) : null}

          {a.status === "CONFIRMED" && !started ? (
            <a
              href={googleCalendarUrl(a, viewer === "PATIENT" ? `Consulta com ${a.nutritionistName}` : `Consulta: ${a.patientName}`)}
              target="_blank"
              rel="noreferrer"
              className={buttonClass("ghost", "sm")}
            >
              <CalendarPlus className="h-4 w-4" /> Google Agenda
            </a>
          ) : null}
        </div>
      ) : null}

      {error && !dialog ? (
        <Alert tone="red" className="mt-3">
          {error}
        </Alert>
      ) : null}

      {dialog === "confirm" ? (
        <Modal title="Confirmar consulta" onClose={close}>
          <ConfirmForm appointment={a} busy={busy} error={error} onSubmit={(body) => patch({ action: "confirm", ...body })} />
        </Modal>
      ) : null}
      {dialog === "reschedule" ? (
        <Modal title="Reagendar consulta" onClose={close} size="lg">
          <RescheduleForm
            appointment={a}
            viewer={viewer}
            busy={busy}
            error={error}
            onSubmit={(body) => patch({ action: "reschedule", ...body })}
          />
        </Modal>
      ) : null}
      {dialog === "cancel" ? (
        <Modal title={viewer === "NUTRITIONIST" && a.status === "REQUESTED" ? "Recusar solicitação" : "Cancelar consulta"} onClose={close}>
          <CancelForm busy={busy} error={error} onSubmit={(reason) => patch({ action: "cancel", reason })} />
        </Modal>
      ) : null}
      {dialog === "details" ? (
        <Modal title="Detalhes da consulta" onClose={close}>
          <DetailsForm appointment={a} busy={busy} error={error} onSubmit={(body) => patch({ action: "update", ...body })} />
        </Modal>
      ) : null}
    </div>
  );
}

function ConfirmForm({
  appointment: a,
  busy,
  error,
  onSubmit,
}: {
  appointment: AppointmentDTO;
  busy: boolean;
  error: string | null;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [meetingUrl, setMeetingUrl] = useState(a.meetingUrl ?? "");
  const [location, setLocation] = useState(a.location ?? "");
  const [notes, setNotes] = useState(a.notes ?? "");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ meetingUrl, location, notes });
      }}
    >
      <p className="text-sm text-slate-600">
        {a.patientName} · {longWhen(a.startsAt)} · {MODE_LABEL[a.mode]}
      </p>
      {a.mode === "ONLINE" ? (
        <Field label="Link da videochamada" htmlFor="c-link" hint="Google Meet, Zoom, WhatsApp... O paciente vê depois da confirmação.">
          <Input id="c-link" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/..." />
        </Field>
      ) : (
        <Field label="Local" htmlFor="c-location">
          <Input id="c-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Endereço do consultório" />
        </Field>
      )}
      <Field label="Observações para o paciente (opcional)" htmlFor="c-notes">
        <Textarea id="c-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Ex.: venha de roupa leve para a avaliação" />
      </Field>
      {error ? <Alert tone="red">{error}</Alert> : null}
      <Button type="submit" disabled={busy}>
        <Check className="h-4 w-4" /> {busy ? "Confirmando..." : "Confirmar consulta"}
      </Button>
    </form>
  );
}

function RescheduleForm({
  appointment: a,
  viewer,
  busy,
  error,
  onSubmit,
}: {
  appointment: AppointmentDTO;
  viewer: Viewer;
  busy: boolean;
  error: string | null;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [tab, setTab] = useState<"slots" | "manual">("slots");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [date, setDate] = useState(dateKeyOf(a.startsAt));
  const [time, setTime] = useState(timeOf(a.startsAt));
  const [duration, setDuration] = useState(durationMinutes(a));

  function submit() {
    if (tab === "slots") {
      if (slot) onSubmit({ startsAt: slot.startsAt, ...(viewer === "NUTRITIONIST" ? { durationMinutes: duration } : {}) });
      return;
    }
    if (date && time) onSubmit({ startsAt: zonedDate(date, time).toISOString(), durationMinutes: duration });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Horário atual: <strong>{longWhen(a.startsAt)}</strong>
      </p>
      {viewer === "NUTRITIONIST" ? (
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
          <button type="button" onClick={() => setTab("slots")} className={cn("rounded-md px-3 py-1", tab === "slots" ? "bg-white shadow-sm" : "text-slate-600")}>
            Horários livres
          </button>
          <button type="button" onClick={() => setTab("manual")} className={cn("rounded-md px-3 py-1", tab === "manual" ? "bg-white shadow-sm" : "text-slate-600")}>
            Outro horário
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Escolha um novo horário. A nutricionista precisa confirmar a mudança.</p>
      )}

      {tab === "slots" ? (
        <SlotPicker value={slot} onChange={setSlot} excludeId={a.id} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Data" htmlFor="r-date">
            <Input id="r-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Horário" htmlFor="r-time">
            <Input id="r-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Duração" htmlFor="r-duration">
            <Select id="r-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[...new Set([...SLOT_OPTIONS, duration])].sort((x, y) => x - y).map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}

      {error ? <Alert tone="red">{error}</Alert> : null}
      <Button onClick={submit} disabled={busy || (tab === "slots" ? !slot : !date || !time)}>
        <RefreshCw className="h-4 w-4" />
        {busy ? "Salvando..." : viewer === "PATIENT" ? "Pedir novo horário" : "Reagendar"}
      </Button>
    </div>
  );
}

function CancelForm({ busy, error, onSubmit }: { busy: boolean; error: string | null; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(reason);
      }}
    >
      <Field label="Motivo (opcional)" htmlFor="x-reason" hint="A outra pessoa recebe o aviso no chat.">
        <Textarea id="x-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
      </Field>
      {error ? <Alert tone="red">{error}</Alert> : null}
      <Button type="submit" variant="danger" disabled={busy}>
        <CalendarX className="h-4 w-4" /> {busy ? "Cancelando..." : "Confirmar"}
      </Button>
    </form>
  );
}

function DetailsForm({
  appointment: a,
  busy,
  error,
  onSubmit,
}: {
  appointment: AppointmentDTO;
  busy: boolean;
  error: string | null;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [mode, setMode] = useState<AppointmentMode>(a.mode);
  const [meetingUrl, setMeetingUrl] = useState(a.meetingUrl ?? "");
  const [location, setLocation] = useState(a.location ?? "");
  const [notes, setNotes] = useState(a.notes ?? "");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ mode, meetingUrl, location, notes });
      }}
    >
      <Field label="Modalidade" htmlFor="d-mode">
        <Select id="d-mode" value={mode} onChange={(e) => setMode(e.target.value as AppointmentMode)}>
          <option value="ONLINE">Online</option>
          <option value="PRESENCIAL">Presencial</option>
        </Select>
      </Field>
      {mode === "ONLINE" ? (
        <Field label="Link da videochamada" htmlFor="d-link">
          <Input id="d-link" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/..." />
        </Field>
      ) : (
        <Field label="Local" htmlFor="d-location">
          <Input id="d-location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
      )}
      <Field label="Observações para o paciente" htmlFor="d-notes">
        <Textarea id="d-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
      </Field>
      {error ? <Alert tone="red">{error}</Alert> : null}
      <Button type="submit" disabled={busy}>
        {busy ? "Salvando..." : "Salvar detalhes"}
      </Button>
    </form>
  );
}
