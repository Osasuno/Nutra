"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarPlus, MapPin, Video } from "lucide-react";
import { Alert, Button, Card, CardBody, CardHeader, Field, Textarea } from "@/components/ui";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { longWhen, type AppointmentMode, type Slot } from "@/lib/schedule";
import { SlotPicker } from "./SlotPicker";

/** O paciente solicita uma consulta em um horário livre da nutricionista. */
export function RequestForm({ modes, address }: { modes: AppointmentMode[]; address: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<AppointmentMode>(modes[0] ?? "ONLINE");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [pickerKey, setPickerKey] = useState(0);

  async function submit() {
    if (!slot) return;
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/appointments", { body: { mode, startsAt: slot.startsAt, reason } });
      setMessage({
        tone: "green",
        text: `Solicitação enviada para ${longWhen(slot.startsAt)}. Você será avisado(a) pelo chat quando a nutricionista confirmar.`,
      });
      setSlot(null);
      setReason("");
      setPickerKey((k) => k + 1);
      router.refresh();
    } catch (err) {
      setMessage({ tone: "red", text: err instanceof Error ? err.message : "Não foi possível solicitar." });
      setPickerKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader icon={<CalendarPlus className="h-5 w-5" />} title="Solicitar consulta" description="Escolha a modalidade e um horário livre." />
      <CardBody className="space-y-5">
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Modalidade</p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ring-1 transition sm:py-2",
                  mode === m ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-slate-700 ring-slate-200 hover:ring-emerald-300",
                )}
              >
                {m === "ONLINE" ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                {m === "ONLINE" ? (
                  <span>
                    Online<span className="hidden sm:inline"> (videochamada)</span>
                  </span>
                ) : (
                  "Presencial"
                )}
              </button>
            ))}
          </div>
          {mode === "PRESENCIAL" && address ? (
            <p className="mt-2 flex items-start gap-1 text-xs text-slate-500">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {address}
            </p>
          ) : null}
        </div>

        <SlotPicker key={pickerKey} value={slot} onChange={setSlot} />

        <Field label="Motivo ou observação (opcional)" htmlFor="rq-reason">
          <Textarea
            id="rq-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            placeholder="Ex.: retorno, quero ajustar o plano, trazer exames..."
          />
        </Field>

        {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
        {/* O rótulo com a data é longo: no celular o botão ocupa a largura e quebra a linha. */}
        <Button onClick={submit} disabled={!slot || busy} className="h-auto min-h-10 w-full whitespace-normal py-2 sm:w-auto">
          <CalendarPlus className="h-4 w-4 shrink-0" />
          {busy ? "Enviando..." : slot ? `Solicitar ${longWhen(slot.startsAt)}` : "Escolha um horário"}
        </Button>
      </CardBody>
    </Card>
  );
}
