import { Suspense } from "react";
import type { Metadata } from "next";
import { Settings2 } from "lucide-react";
import { AgendaView } from "@/components/agenda/AgendaView";
import { AppointmentItem } from "@/components/agenda/AppointmentItem";
import { NewAppointmentButton } from "@/components/agenda/ScheduleForm";
import { ButtonLink, PageHeader, PageSkeleton, SectionTitle } from "@/components/ui";
import { appointmentInclude, getScheduleSettings, toAppointmentDTO } from "@/lib/appointments";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { addDays, dateKeyOf, monthGrid, zonedDate } from "@/lib/schedule";
import { now } from "@/lib/time";

export const metadata: Metadata = { title: "Agenda" };

export default function AgendaPage(props: PageProps<"/nutri/agenda">) {
  return (
    <>
      <PageHeader title="Agenda" description="Consultas online e presenciais. Confirme solicitações, agende e reagende." />
      <Suspense fallback={<PageSkeleton />}>
        <AgendaContent searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function AgendaContent({ searchParams }: { searchParams: PageProps<"/nutri/agenda">["searchParams"] }) {
  const user = await requireUser("NUTRITIONIST");
  const { mes } = await searchParams;
  const current = new Date(now());
  const todayKey = dateKeyOf(current);
  const monthKey = typeof mes === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : todayKey.slice(0, 7);
  const grid = monthGrid(monthKey);
  const from = zonedDate(grid[0]);
  const to = zonedDate(addDays(grid[grid.length - 1], 1));

  const [rows, pending, patients, settings] = await Promise.all([
    prisma.appointment.findMany({
      where: { nutritionistId: user.id, startsAt: { gte: from, lt: to } },
      include: appointmentInclude,
      orderBy: { startsAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { nutritionistId: user.id, status: "REQUESTED" },
      include: appointmentInclude,
      orderBy: { startsAt: "asc" },
    }),
    prisma.patient.findMany({
      where: { nutritionistId: user.id, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getScheduleSettings(user.id),
  ]);

  const defaults = {
    slotMinutes: settings.slotMinutes,
    modes: settings.modes,
    address: settings.address,
    meetingUrl: settings.meetingUrl,
  };
  const nowIso = current.toISOString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <NewAppointmentButton patients={patients} settings={defaults} />
        <ButtonLink href="/nutri/agenda/horarios" variant="outline">
          <Settings2 className="h-4 w-4" /> Horários de atendimento
        </ButtonLink>
      </div>

      {pending.length ? (
        <section>
          <SectionTitle>Solicitações aguardando sua confirmação ({pending.length})</SectionTitle>
          <div className="grid gap-3 lg:grid-cols-2">
            {pending.map((a) => (
              <AppointmentItem
                key={a.id}
                appointment={toAppointmentDTO(a, "NUTRITIONIST")}
                viewer="NUTRITIONIST"
                now={nowIso}
                minNoticeHours={settings.minNoticeHours}
                className="border-amber-200"
              />
            ))}
          </div>
        </section>
      ) : null}

      <AgendaView
        monthKey={monthKey}
        todayKey={todayKey}
        now={nowIso}
        appointments={rows.map((a) => toAppointmentDTO(a, "NUTRITIONIST"))}
        patients={patients}
        settings={defaults}
        minNoticeHours={settings.minNoticeHours}
      />
    </div>
  );
}
