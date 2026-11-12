"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Video } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  WEEKDAYS_SHORT,
  addMonths,
  dateKeyOf,
  monthGrid,
  monthLabel,
  shortDayLabel,
  timeOf,
  type AppointmentDTO,
} from "@/lib/schedule";
import { AppointmentItem } from "./AppointmentItem";
import { ScheduleForm, type ScheduleDefaults } from "./ScheduleForm";

const CHIP: Record<AppointmentDTO["status"], string> = {
  REQUESTED: "bg-amber-100 text-amber-900 ring-amber-200",
  CONFIRMED: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  COMPLETED: "bg-sky-50 text-sky-800 ring-sky-100",
  NO_SHOW: "bg-red-50 text-red-700 ring-red-100",
  CANCELLED: "bg-slate-100 text-slate-500 line-through ring-slate-200",
};

export function AgendaView({
  monthKey,
  todayKey,
  now,
  appointments,
  patients,
  settings,
  minNoticeHours,
}: {
  monthKey: string;
  todayKey: string;
  now: string;
  appointments: AppointmentDTO[];
  patients: { id: string; name: string }[];
  settings: ScheduleDefaults;
  minNoticeHours: number;
}) {
  const days = useMemo(() => monthGrid(monthKey), [monthKey]);
  const [selected, setSelected] = useState(todayKey.startsWith(monthKey) ? todayKey : `${monthKey}-01`);
  const [showCancelled, setShowCancelled] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [creatingOn, setCreatingOn] = useState<string | null>(null);

  const visible = appointments.filter((a) => showCancelled || a.status !== "CANCELLED");
  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentDTO[]>();
    for (const a of visible) {
      const key = dateKeyOf(a.startsAt);
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return map;
  }, [visible]);
  const selectedList = byDay.get(selected) ?? [];
  const detail = appointments.find((a) => a.id === detailId) ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-1">
            <Link
              href={`/nutri/agenda?mes=${addMonths(monthKey, -1)}`}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h2 className="min-w-44 text-center font-semibold text-slate-900">{monthLabel(monthKey)}</h2>
            <Link
              href={`/nutri/agenda?mes=${addMonths(monthKey, 1)}`}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
            {!todayKey.startsWith(monthKey) ? (
              <Link href="/nutri/agenda" className="ml-2 rounded-lg px-2 py-1 text-sm text-emerald-700 hover:bg-emerald-50">
                Hoje
              </Link>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
            Mostrar canceladas
          </label>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
          {WEEKDAYS_SHORT.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const list = byDay.get(day) ?? [];
            const inMonth = day.startsWith(monthKey);
            const isToday = day === todayKey;
            return (
              <div
                key={day}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(day)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(day)}
                className={cn(
                  "min-h-24 cursor-pointer border-b border-r border-slate-100 p-1.5 text-left transition hover:bg-emerald-50/40 sm:min-h-28",
                  !inMonth && "bg-slate-50/70 text-slate-400",
                  selected === day && "bg-emerald-50 ring-2 ring-inset ring-emerald-400",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday ? "bg-emerald-600 text-white" : inMonth ? "text-slate-700" : "text-slate-400",
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                <div className="mt-1 space-y-1">
                  {list.slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(day);
                        setDetailId(a.id);
                      }}
                      className={cn("flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] ring-1", CHIP[a.status])}
                      title={`${timeOf(a.startsAt)} · ${a.patientName}`}
                    >
                      {a.mode === "ONLINE" ? <Video className="h-3 w-3 shrink-0" /> : <MapPin className="h-3 w-3 shrink-0" />}
                      <span className="font-semibold">{timeOf(a.startsAt)}</span>
                      <span className="truncate">{a.patientName.split(" ")[0]}</span>
                    </button>
                  ))}
                  {list.length > 3 ? <p className="px-1 text-[11px] text-slate-500">+{list.length - 3} consulta(s)</p> : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 px-4 py-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-amber-200" /> Aguardando confirmação
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-emerald-200" /> Confirmada
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-sky-100" /> Realizada
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-red-100" /> Não compareceu
          </span>
        </div>
      </Card>

      <div className="space-y-3 xl:sticky xl:top-20 xl:self-start">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold capitalize text-slate-900">{shortDayLabel(selected)}</h3>
          <Button size="sm" variant="secondary" onClick={() => setCreatingOn(selected)}>
            Agendar neste dia
          </Button>
        </div>
        {selectedList.length ? (
          selectedList.map((a) => (
            <AppointmentItem key={a.id} appointment={a} viewer="NUTRITIONIST" now={now} minNoticeHours={minNoticeHours} />
          ))
        ) : (
          <EmptyState className="py-8" title="Nenhuma consulta neste dia" />
        )}
      </div>

      {detail ? (
        <Modal title={`Consulta de ${detail.patientName}`} onClose={() => setDetailId(null)} size="lg">
          <AppointmentItem appointment={detail} viewer="NUTRITIONIST" now={now} minNoticeHours={minNoticeHours} className="border-none p-0" />
          <Link href={`/nutri/pacientes/${detail.patientId}`} className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline">
            Abrir prontuário do paciente
          </Link>
        </Modal>
      ) : null}

      {creatingOn ? (
        <Modal title="Agendar consulta" onClose={() => setCreatingOn(null)} size="lg">
          <ScheduleForm patients={patients} defaultDate={creatingOn} settings={settings} onDone={() => setCreatingOn(null)} />
        </Modal>
      ) : null}
    </div>
  );
}
