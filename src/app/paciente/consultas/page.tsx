import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { AppointmentItem } from "@/components/agenda/AppointmentItem";
import { RequestForm } from "@/components/agenda/RequestForm";
import { NoLink } from "@/components/patient/NoLink";
import { Alert, EmptyState, PageHeader, PageSkeleton, SectionTitle } from "@/components/ui";
import { appointmentInclude, getScheduleSettings, toAppointmentDTO } from "@/lib/appointments";
import { prisma } from "@/lib/db";
import { getPatientLinks } from "@/lib/dal";
import { OPEN_STATUSES } from "@/lib/schedule";
import { now } from "@/lib/time";

export const metadata: Metadata = { title: "Consultas" };

export default function PatientAppointmentsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { active } = await getPatientLinks();
  if (!active) return <NoLink feature="O agendamento de consultas" />;
  const current = new Date(now());
  const [settings, rows] = await Promise.all([
    getScheduleSettings(active.nutritionistId),
    prisma.appointment.findMany({
      where: { patientId: active.id },
      include: appointmentInclude,
      orderBy: { startsAt: "desc" },
      take: 60,
    }),
  ]);
  const isOpen = (s: string) => OPEN_STATUSES.includes(s as (typeof OPEN_STATUSES)[number]);
  const upcoming = rows.filter((a) => isOpen(a.status) && a.endsAt >= current).reverse();
  const history = rows.filter((a) => !(isOpen(a.status) && a.endsAt >= current));
  const nowIso = current.toISOString();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Consultas"
        description={`Solicite, reagende ou cancele consultas com ${active.nutritionist.name}. Os avisos chegam pelo chat.`}
      />

      {upcoming.length ? (
        <section className="space-y-3">
          <SectionTitle>Próximas consultas</SectionTitle>
          {upcoming.map((a) => (
            <AppointmentItem
              key={a.id}
              appointment={toAppointmentDTO(a, "PATIENT")}
              viewer="PATIENT"
              now={nowIso}
              minNoticeHours={settings.minNoticeHours}
              showPerson={false}
            />
          ))}
        </section>
      ) : null}

      {upcoming.length >= 3 ? (
        <Alert tone="yellow">Você já tem 3 consultas em aberto. Reagende ou cancele uma delas para solicitar outra.</Alert>
      ) : (
        <RequestForm modes={settings.modes} address={settings.address} />
      )}

      <section className="space-y-3">
        <SectionTitle>Histórico</SectionTitle>
        {history.length ? (
          history.map((a) => (
            <AppointmentItem
              key={a.id}
              appointment={toAppointmentDTO(a, "PATIENT")}
              viewer="PATIENT"
              now={nowIso}
              minNoticeHours={settings.minNoticeHours}
              showPerson={false}
            />
          ))
        ) : (
          <EmptyState icon={<CalendarDays className="h-8 w-8" />} title="Nenhuma consulta anterior" className="py-8" />
        )}
      </section>
    </div>
  );
}
