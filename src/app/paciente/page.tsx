import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  Camera,
  Clock,
  MessageCircle,
  MessageSquareQuote,
  Paperclip,
  Scale,
  UtensilsCrossed,
} from "lucide-react";
import { LinkActionButton } from "@/components/patient/ConnectForms";
import { NoLink } from "@/components/patient/NoLink";
import { Alert, Avatar, Badge, ButtonLink, Card, CardBody, CardHeader, PageSkeleton, Stat } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getPatientLinks } from "@/lib/dal";
import { fmt, fmtDate, fmtRelative } from "@/lib/format";
import { ratingInfo } from "@/lib/meal-log";
import { planTotals } from "@/lib/meal-math";
import { OPEN_STATUSES, shortWhen } from "@/lib/schedule";
import { daysAgo } from "@/lib/time";

export const metadata: Metadata = { title: "Início" };

export default function PatientHome(props: PageProps<"/paciente">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Home searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Home({ searchParams }: { searchParams: PageProps<"/paciente">["searchParams"] }) {
  const { aviso } = await searchParams;
  const { user, active, pending } = await getPatientLinks();
  const firstName = user.name.split(" ")[0];

  if (!active) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Olá, {firstName}!</h1>
          <p className="text-sm text-slate-500">Bem-vindo(a) à sua área de acompanhamento nutricional.</p>
        </div>
        {typeof aviso === "string" ? <Alert tone="yellow">{aviso}</Alert> : null}
        {pending.length ? (
          <Card>
            <CardHeader title="Solicitações enviadas" description="Aguardando a resposta da nutricionista." />
            <ul className="divide-y divide-slate-100">
              {pending.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.nutritionist.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.nutritionist.name}</p>
                      <p className="text-xs text-slate-500">Enviada {fmtRelative(p.updatedAt)}</p>
                    </div>
                  </div>
                  <LinkActionButton patientId={p.id} action="cancel" label="Cancelar" confirmText="Cancelar esta solicitação?" />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        <NoLink />
      </div>
    );
  }

  const [plan, feedbacks, lastAssessment, unread, examCount, logs7, nextAppointment] = await Promise.all([
    prisma.mealPlan.findFirst({
      where: { patientId: active.id, isActive: true },
      include: { meals: { orderBy: { position: "asc" }, include: { items: true } } },
    }),
    prisma.mealLog.findMany({
      where: { patientId: active.id, feedback: { not: null } },
      orderBy: { feedbackAt: "desc" },
      take: 3,
    }),
    prisma.assessment.findFirst({ where: { patientId: active.id }, orderBy: { date: "desc" } }),
    prisma.message.count({ where: { patientId: active.id, readAt: null, senderId: { not: user.id } } }),
    prisma.examFile.count({ where: { patientId: active.id } }),
    prisma.mealLog.count({ where: { patientId: active.id, date: { gte: daysAgo(7) } } }),
    prisma.appointment.findFirst({
      where: { patientId: active.id, status: { in: OPEN_STATUSES }, endsAt: { gte: daysAgo(0) } },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  const totals = plan ? planTotals(plan.meals) : null;
  const nutri = active.nutritionist;
  const digits = nutri.phone?.replace(/\D/g, "") ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Olá, {firstName}!</h1>
          <p className="text-sm text-slate-500">Seu acompanhamento com {nutri.name}.</p>
        </div>
        {/* Celular: ação principal na largura toda e as outras duas lado a lado. */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <ButtonLink href="/paciente/diario" className="col-span-2">
            <Camera className="h-4 w-4" /> Registrar refeição
          </ButtonLink>
          <ButtonLink href="/paciente/consultas" variant="outline">
            <CalendarDays className="h-4 w-4" /> Consultas
          </ButtonLink>
          <ButtonLink href="/paciente/chat" variant="outline">
            <MessageCircle className="h-4 w-4" /> Chat {unread ? <Badge tone="green">{unread}</Badge> : null}
          </ButtonLink>
        </div>
      </div>

      {typeof aviso === "string" ? <Alert tone="yellow">{aviso}</Alert> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat
          label="Último peso"
          value={lastAssessment ? `${fmt(lastAssessment.weight)} kg` : "—"}
          sub={lastAssessment ? `Avaliado em ${fmtDate(lastAssessment.date)}` : "Sem avaliações"}
          icon={<Scale className="h-5 w-5" />}
          tone="green"
        />
        <Stat label="Registros no diário (7 dias)" value={logs7} icon={<Camera className="h-5 w-5" />} tone="blue" />
        <Stat
          label="Exames enviados"
          value={examCount}
          sub={
            <Link href="/paciente/anamnese#exames" className="text-emerald-700 hover:underline">
              Enviar exame
            </Link>
          }
          icon={<Paperclip className="h-5 w-5" />}
          tone="yellow"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader
            title="Seu plano alimentar"
            icon={<UtensilsCrossed className="h-5 w-5" />}
            action={
              plan ? (
                <Link href="/paciente/plano" className="text-sm font-medium text-emerald-700 hover:underline">
                  Ver completo
                </Link>
              ) : null
            }
          />
          <CardBody>
            {plan && totals ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  <strong className="text-slate-900">{plan.title}</strong> · {fmt(totals.kcal, 0)} kcal/dia
                </p>
                <ul className="divide-y divide-slate-100">
                  {plan.meals.map((meal) => (
                    <li key={meal.id} className="flex items-start gap-3 py-2.5">
                      <span className="flex w-14 shrink-0 items-center gap-1 font-mono text-xs text-emerald-700">
                        <Clock className="h-3 w-3" /> {meal.time ?? "--:--"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{meal.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {meal.items.map((i) => i.foodName.split(",")[0]).join(" · ") || "—"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Sua nutricionista ainda não liberou um plano alimentar.</p>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Sua nutricionista" />
            <CardBody className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <Avatar name={nutri.name} />
                <div>
                  <p className="font-medium text-slate-900">{nutri.name}</p>
                  {nutri.nutritionistProfile?.crn ? <p className="text-xs text-slate-500">{nutri.nutritionistProfile.crn}</p> : null}
                </div>
              </div>
              {nutri.nutritionistProfile?.specialties ? <p className="text-slate-600">{nutri.nutritionistProfile.specialties}</p> : null}
              {nextAppointment ? (
                <Link
                  href="/paciente/consultas"
                  className={
                    nextAppointment.status === "CONFIRMED"
                      ? "block rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800 hover:bg-emerald-100"
                      : "block rounded-lg bg-amber-50 px-3 py-2 text-amber-900 hover:bg-amber-100"
                  }
                >
                  Próxima consulta ({nextAppointment.mode === "ONLINE" ? "online" : "presencial"}): {shortWhen(nextAppointment.startsAt)}
                  {nextAppointment.status === "REQUESTED" ? " · aguardando confirmação" : ""}
                </Link>
              ) : (
                <Link href="/paciente/consultas" className="block rounded-lg bg-slate-50 px-3 py-2 text-emerald-700 hover:bg-slate-100">
                  Agendar uma consulta
                </Link>
              )}
              {digits ? (
                <a
                  href={`https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-emerald-700 hover:underline"
                >
                  WhatsApp: {nutri.phone}
                </a>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Últimos feedbacks" icon={<MessageSquareQuote className="h-5 w-5" />} />
            <CardBody>
              {feedbacks.length ? (
                <ul className="space-y-3">
                  {feedbacks.map((f) => {
                    const rating = ratingInfo(f.feedbackRating);
                    return (
                      <li key={f.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                        <p className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                          {f.mealType} · {fmtRelative(f.date)}
                          {rating ? <Badge tone={rating.tone}>{rating.label}</Badge> : null}
                        </p>
                        {f.feedback ? <p className="line-clamp-3 text-slate-700">{f.feedback}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Registre suas refeições no diário para receber feedback.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
