import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Mail, Phone, Target } from "lucide-react";
import { PatientTabs } from "@/components/nutri/PatientTabs";
import { Avatar, Badge, Skeleton } from "@/components/ui";
import { nextAppointmentsByPatient } from "@/lib/appointments";
import { requireNutriPatient } from "@/lib/dal";
import { ageFrom, sexLabel } from "@/lib/format";
import { shortWhen } from "@/lib/schedule";
import { now } from "@/lib/time";

export default function PatientLayout({ children, params }: LayoutProps<"/nutri/pacientes/[id]">) {
  return (
    <div>
      <Link href="/nutri" className="no-print mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Todos os pacientes
      </Link>
      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-16 w-full max-w-xl" />
            <Skeleton className="h-10 w-full" />
          </div>
        }
      >
        <PatientHeader params={params} />
      </Suspense>
      <div className="mt-6">{children}</div>
    </div>
  );
}

async function PatientHeader({ params }: { params: LayoutProps<"/nutri/pacientes/[id]">["params"] }) {
  const { id } = await params;
  const { patient } = await requireNutriPatient(id);
  const next = (await nextAppointmentsByPatient([patient.id], new Date(now()))).get(patient.id);
  const age = ageFrom(patient.birthDate);
  const digits = patient.phone?.replace(/\D/g, "") ?? "";
  const whatsapp = digits ? `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}` : null;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={patient.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{patient.name}</h1>
            {patient.status === "ACTIVE" ? <Badge tone="green">Ativo</Badge> : null}
            {patient.status === "ARCHIVED" ? <Badge>Arquivado</Badge> : null}
            {patient.status === "PENDING" ? <Badge tone="yellow">Solicitação pendente</Badge> : null}
            {!patient.userId ? <Badge tone="blue">Sem conta (convite pendente)</Badge> : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>
              {age !== null ? `${age} anos` : "Idade não informada"} · {sexLabel(patient.sex)}
            </span>
            {patient.email ? (
              <a href={`mailto:${patient.email}`} className="inline-flex items-center gap-1 hover:text-emerald-700">
                <Mail className="h-3.5 w-3.5" /> {patient.email}
              </a>
            ) : null}
            {patient.phone ? (
              <a
                href={whatsapp ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-emerald-700"
              >
                <Phone className="h-3.5 w-3.5" /> {patient.phone}
              </a>
            ) : null}
            {next ? (
              <Link href="/nutri/agenda" className="inline-flex items-center gap-1 hover:text-emerald-700">
                <CalendarDays className="h-3.5 w-3.5" /> Próxima consulta: {shortWhen(next.startsAt)} ({next.mode === "ONLINE" ? "online" : "presencial"})
                {next.status === "REQUESTED" ? <span className="font-medium text-amber-700"> · aguardando confirmação</span> : null}
              </Link>
            ) : null}
          </div>
          {patient.objective ? (
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-700">
              <Target className="h-3.5 w-3.5 text-emerald-600" /> {patient.objective}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-5">
        <PatientTabs id={patient.id} />
      </div>
    </div>
  );
}
