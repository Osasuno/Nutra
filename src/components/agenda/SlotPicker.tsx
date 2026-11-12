"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Alert } from "@/components/ui";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { addDays, WEEKDAYS_SHORT, type DaySlots, type Slot } from "@/lib/schedule";

type SlotsResponse = {
  today: string;
  from: string;
  latestDay: string;
  hasMore: boolean;
  days: DaySlots[];
  settings: { slotMinutes: number; minNoticeHours: number; maxDaysAhead: number };
};

const PAGE_DAYS = 14;

/** Escolha de horário livre na agenda da nutricionista. */
export function SlotPicker({
  value,
  onChange,
  excludeId,
}: {
  value: Slot | null;
  onChange: (slot: Slot | null) => void;
  /** Consulta sendo reagendada (o horário atual dela fica livre). */
  excludeId?: string;
}) {
  const [from, setFrom] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const key = `${from ?? ""}|${excludeId ?? ""}`;
  const [result, setResult] = useState<{ key: string; data?: SlotsResponse; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ days: String(PAGE_DAYS) });
    if (from) qs.set("from", from);
    if (excludeId) qs.set("exclude", excludeId);
    api<SlotsResponse>(`/api/appointments/slots?${qs.toString()}`)
      .then((data) => !cancelled && setResult({ key, data }))
      .catch((err) => !cancelled && setResult({ key, error: err instanceof Error ? err.message : "Erro ao carregar horários." }));
    return () => {
      cancelled = true;
    };
  }, [key, from, excludeId]);

  const loading = result?.key !== key;
  const data = loading ? null : result?.data ?? null;
  const daysWithSlots = data?.days.filter((d) => d.slots.length) ?? [];
  const selectedDay = data?.days.find((d) => d.date === day && d.slots.length) ?? daysWithSlots[0] ?? null;
  const canGoBack = Boolean(data && from && data.from > data.today);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={!canGoBack || loading}
          onClick={() => data && setFrom(addDays(data.from, -PAGE_DAYS) < data.today ? null : addDays(data.from, -PAGE_DAYS))}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Anteriores
        </button>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
        <button
          type="button"
          disabled={!data?.hasMore || loading}
          onClick={() => data && setFrom(addDays(data.from, PAGE_DAYS))}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          Próximos <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {result?.error && !loading ? <Alert tone="red">{result.error}</Alert> : null}

      {data ? (
        <>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {data.days.map((d) => {
              const [, m, dd] = d.date.split("-");
              const active = selectedDay?.date === d.date;
              return (
                <button
                  key={d.date}
                  type="button"
                  disabled={!d.slots.length}
                  onClick={() => {
                    setDay(d.date);
                    onChange(null);
                  }}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-center text-xs transition",
                    active
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : d.slots.length
                        ? "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                        : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300",
                  )}
                >
                  <span className="block font-medium">{WEEKDAYS_SHORT[d.weekday]}</span>
                  <span className="block text-sm font-semibold">
                    {dd}/{m}
                  </span>
                  <span className="block text-[10px]">
                    {d.slots.length ? `${d.slots.length} ${d.slots.length === 1 ? "horário" : "horários"}` : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedDay ? (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Horários disponíveis</p>
              {/* Celular: grade de botões do mesmo tamanho, fáceis de tocar. */}
              <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
                {selectedDay.slots.map((slot) => (
                  <button
                    key={slot.startsAt}
                    type="button"
                    onClick={() => onChange(value?.startsAt === slot.startsAt ? null : slot)}
                    aria-pressed={value?.startsAt === slot.startsAt}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium ring-1 transition sm:py-1.5",
                      value?.startsAt === slot.startsAt
                        ? "bg-emerald-600 text-white ring-emerald-600"
                        : "bg-white text-slate-700 ring-slate-200 hover:ring-emerald-400",
                    )}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Horário de Brasília · duração de {data.settings.slotMinutes} min
                {data.settings.minNoticeHours ? ` · antecedência mínima de ${data.settings.minNoticeHours} h` : ""}
              </p>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
              Nenhum horário livre neste período. Veja os próximos dias ou fale com a nutricionista pelo chat.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
