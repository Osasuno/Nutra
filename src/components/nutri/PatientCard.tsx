import Link from "next/link";
import {
  CalendarDays,
  Camera,
  ClipboardList,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { daysSince, fmt, fmtRelative } from "@/lib/format";
import { classifyBmi } from "@/lib/formulas";
import type { PatientCardData } from "@/lib/patients";
import { shortWhen } from "@/lib/schedule";

const STATUS = {
  ACTIVE: { label: "Ativo", tone: "green" as const },
  PENDING: { label: "Solicitação", tone: "yellow" as const },
  ARCHIVED: { label: "Arquivado", tone: "neutral" as const },
};

export function PatientCard({ patient }: { patient: PatientCardData }) {
  const status = STATUS[patient.status];
  const bmiClass = patient.bmi ? classifyBmi(patient.bmi, patient.age) : null;
  const idleDays = daysSince(patient.lastLogAt);
  const alerts: { text: string; tone: "yellow" | "red" | "blue" }[] = [];
  if (patient.status === "ACTIVE") {
    if (!patient.hasAccount) alerts.push({ text: "Convite pendente", tone: "blue" });
    if (patient.nextAppointmentStatus === "REQUESTED") alerts.push({ text: "Pediu consulta", tone: "yellow" });
    if (patient.pendingFeedback > 0)
      alerts.push({ text: `${patient.pendingFeedback} registro(s) sem feedback`, tone: "yellow" });
    if (patient.hasAccount && (idleDays === null || idleDays >= 7))
      alerts.push({ text: idleDays === null ? "Nenhum registro no diário" : `Sem registros há ${idleDays} dias`, tone: "red" });
  }

  return (
    <Link
      href={`/nutri/pacientes/${patient.id}`}
      className={cn(
        "group flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md",
        patient.status === "ARCHIVED" && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <Avatar name={patient.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-slate-900 group-hover:text-emerald-700">{patient.name}</p>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="truncate text-xs text-slate-500">
            {[patient.age !== null ? `${patient.age} anos` : null, patient.sex === "F" ? "Feminino" : patient.sex === "M" ? "Masculino" : null]
              .filter(Boolean)
              .join(" · ") || "Dados pessoais incompletos"}
          </p>
          {patient.objective ? <p className="mt-1 line-clamp-1 text-xs text-slate-600">🎯 {patient.objective}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-3 border-y border-slate-100 text-center">
        <div className="px-2 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Peso</p>
          <p className="text-sm font-semibold text-slate-900">{patient.weight ? `${fmt(patient.weight)} kg` : "—"}</p>
          {patient.weightDelta !== null && Math.abs(patient.weightDelta) >= 0.05 ? (
            <p
              className={cn(
                "mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium",
                patient.weightDelta < 0 ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {patient.weightDelta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              {fmt(Math.abs(patient.weightDelta))} kg
            </p>
          ) : null}
        </div>
        <div className="border-x border-slate-100 px-2 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">IMC</p>
          <p className="text-sm font-semibold text-slate-900">{fmt(patient.bmi)}</p>
          {bmiClass ? <p className="mt-0.5 truncate text-[11px] text-slate-500">{bmiClass.label}</p> : null}
        </div>
        <div className="px-2 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">% Gordura</p>
          <p className="text-sm font-semibold text-slate-900">{patient.bodyFat ? `${fmt(patient.bodyFat)}%` : "—"}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{patient.assessments} avaliação(ões)</p>
        </div>
      </div>

      <ul className="space-y-1.5 p-4 text-xs text-slate-600">
        <li className="flex items-center gap-2">
          <Camera className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          Diário: {patient.logs7d} registro(s) em 7 dias
          {patient.lastLogAt ? <span className="text-slate-400">· último {fmtRelative(patient.lastLogAt)}</span> : null}
        </li>
        <li className="flex items-center gap-2">
          <MessageCircle className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {patient.unreadMessages > 0 ? (
            <span className="font-medium text-emerald-700">{patient.unreadMessages} mensagem(ns) não lida(s)</span>
          ) : patient.lastMessageAt ? (
            <>Última mensagem {fmtRelative(patient.lastMessageAt)}</>
          ) : (
            "Sem mensagens"
          )}
        </li>
        <li className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {patient.nextAppointment ? (
            <span>
              Consulta {patient.nextAppointmentMode === "ONLINE" ? "online" : "presencial"}: {shortWhen(patient.nextAppointment)}
              {patient.nextAppointmentStatus === "REQUESTED" ? (
                <span className="font-medium text-amber-700"> (aguardando você)</span>
              ) : null}
            </span>
          ) : (
            <span className="text-slate-400">Sem consulta agendada</span>
          )}
        </li>
        <li className="flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          Anamnese:{" "}
          {patient.anamnesisPercent === null ? (
            <span className="text-slate-400">não iniciada</span>
          ) : (
            <span className="flex flex-1 items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${patient.anamnesisPercent}%` }} />
              </span>
              {patient.anamnesisPercent}%
            </span>
          )}
        </li>
        <li className="flex items-center gap-2">
          <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {patient.activePlan ? (
            <span className="min-w-0 truncate">
              Plano ativo: {patient.activePlan.title}
              {patient.activePlan.kcal ? ` (${fmt(patient.activePlan.kcal, 0)} kcal)` : ""}
            </span>
          ) : (
            <span className="text-slate-400">Sem plano alimentar ativo</span>
          )}
        </li>
      </ul>

      {alerts.length ? (
        <div className="mt-auto flex flex-wrap gap-1.5 border-t border-slate-100 px-4 py-3">
          {alerts.map((a) => (
            <Badge key={a.text} tone={a.tone}>
              {a.text}
            </Badge>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
