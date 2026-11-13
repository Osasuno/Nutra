import { Suspense } from "react";
import { NotificationsBanner } from "@/components/pwa/NotificationsCard";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Camera, MessageCircle, UserPlus, Users } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { PatientBoard } from "@/components/nutri/PatientBoard";
import { PendingRequests } from "@/components/nutri/PendingRequests";
import { ButtonLink, Card, PageHeader, PageSkeleton, Stat } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { getPatientCards } from "@/lib/patients";
import { DAY_MS, now } from "@/lib/time";

export const metadata: Metadata = { title: "Pacientes" };

export default function NutriHome() {
  return (
    <>
      <PageHeader
        title="Pacientes"
        description="Visão gerencial: cada card resume a relação com o paciente. Clique para abrir o prontuário."
        actions={
          <ButtonLink href="/nutri/pacientes/novo">
            <UserPlus className="h-4 w-4" /> Novo paciente
          </ButtonLink>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  const user = await requireUser("NUTRITIONIST");
  const current = now();
  const [cards, profile, upcoming, requested] = await Promise.all([
    getPatientCards(user.id),
    prisma.nutritionistProfile.findUnique({ where: { userId: user.id }, select: { inviteCode: true } }),
    prisma.appointment.count({
      where: {
        nutritionistId: user.id,
        status: "CONFIRMED",
        startsAt: { gte: new Date(current), lte: new Date(current + 7 * DAY_MS) },
      },
    }),
    prisma.appointment.count({ where: { nutritionistId: user.id, status: "REQUESTED", startsAt: { gte: new Date(current) } } }),
  ]);

  const active = cards.filter((c) => c.status === "ACTIVE");
  const pending = cards.filter((c) => c.status === "PENDING");
  const unread = active.reduce((acc, c) => acc + c.unreadMessages, 0);
  const pendingFeedback = active.reduce((acc, c) => acc + c.pendingFeedback, 0);

  return (
    <>
      <div className="mb-6 empty:hidden">
        <NotificationsBanner role="NUTRITIONIST" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Pacientes ativos" value={active.length} icon={<Users className="h-5 w-5" />} tone="green" />
        <Stat
          label="Mensagens não lidas"
          value={unread}
          icon={<MessageCircle className="h-5 w-5" />}
          tone={unread ? "blue" : "neutral"}
        />
        <Stat
          label="Diário sem feedback"
          value={pendingFeedback}
          icon={<Camera className="h-5 w-5" />}
          tone={pendingFeedback ? "yellow" : "neutral"}
        />
        <Stat
          label="Consultas em 7 dias"
          value={upcoming}
          sub={
            requested ? (
              <Link href="/nutri/agenda" className="font-medium text-amber-700 hover:underline">
                {requested} solicitação(ões) aguardando você
              </Link>
            ) : (
              <Link href="/nutri/agenda" className="text-emerald-700 hover:underline">
                Abrir agenda
              </Link>
            )
          }
          icon={<CalendarDays className="h-5 w-5" />}
          tone={requested ? "yellow" : "neutral"}
        />
      </div>

      {pending.length ? <PendingRequests requests={pending} /> : null}

      {profile ? (
        <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">
              Seu código de convite: <span className="font-mono text-emerald-700">{profile.inviteCode}</span>
            </p>
            <p className="text-xs text-slate-500">
              O paciente que se cadastrar com este código já entra vinculado a você.
            </p>
          </div>
          <div className="flex gap-2">
            <CopyButton value={profile.inviteCode} label="Copiar código" />
            <CopyButton value={`/cadastro?codigo=${profile.inviteCode}`} absolute label="Copiar link" />
          </div>
        </Card>
      ) : null}

      <PatientBoard patients={cards.filter((c) => c.status !== "PENDING")} />
    </>
  );
}
