import { Suspense } from "react";
import Link from "next/link";
import {
  Activity,
  CalendarDays,
  Camera,
  ChevronRight,
  ClipboardList,
  Flame,
  MessageCircle,
  NotebookPen,
  Percent,
  Scale,
  UtensilsCrossed,
} from "lucide-react";
import { EvolutionChart } from "@/components/charts/EvolutionChart";
import { NoteForm } from "@/components/nutri/NoteForm";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageSkeleton, Stat } from "@/components/ui";
import { parseAnamnesis, anamnesisProgress, type AnamnesisData } from "@/lib/anamnesis";
import { prisma } from "@/lib/db";
import { requireNutriPatient } from "@/lib/dal";
import { ageFrom, fmt, fmtDateTime, fmtRelative } from "@/lib/format";
import { bmi as calcBmi, classifyBmi, classifyBodyFat, type Sex } from "@/lib/formulas";
import { macroSplit, planTotals } from "@/lib/meal-math";
import { appointmentInclude, getScheduleSettings, toAppointmentDTO } from "@/lib/appointments";
import { STATUS_INFO, shortWhen } from "@/lib/schedule";
import { daysAgo, now } from "@/lib/time";
import { AppointmentItem } from "@/components/agenda/AppointmentItem";
import { NewAppointmentButton } from "@/components/agenda/ScheduleForm";

export default function PatientOverviewPage(props: PageProps<"/nutri/pacientes/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Overview params={props.params} />
    </Suspense>
  );
}

function listText(value: unknown): string | null {
  if (Array.isArray(value)) {
    const parts = value
      .map((v) => (typeof v === "string" ? v : typeof v === "object" && v ? Object.values(v)[0] : ""))
      .map((v) => String(v ?? "").trim())
      .filter((v) => v && v !== "Nenhuma" && v !== "Sem queixas");
    return parts.length ? parts.join(", ") : null;
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function summaryRows(a: AnamnesisData) {
  const join = (...v: (string | null)[]) => v.filter(Boolean).join(" · ") || null;
  return [
    { label: "Objetivos", value: join(listText(a.objetivos), listText(a.motivo)) },
    { label: "Doenças", value: join(listText(a.doencas), listText(a.doencasOutras)) },
    { label: "Medicamentos", value: listText(a.medicamentos) },
    { label: "Suplementos", value: listText(a.suplementos) },
    { label: "Alergias / intolerâncias", value: join(listText(a.alergiasAlimentares), listText(a.intolerancias)) },
    { label: "Restrições", value: join(listText(a.restricoes), listText(a.aversoes)) },
    {
      label: "Atividade física",
      value: a.atividadeFisica === "Sim" ? listText(a.atividades) ?? "Pratica" : a.atividadeFisica === "Não" ? "Não pratica" : null,
    },
    {
      label: "Sono e estresse",
      value: join(
        typeof a.sonoHoras === "number" ? `${a.sonoHoras} h/noite` : null,
        listText(a.qualidadeSono),
        typeof a.estresse === "number" ? `estresse ${a.estresse}/10` : null,
      ),
    },
    {
      label: "Intestino e hidratação",
      value: join(
        listText(a.frequenciaEvacuacao),
        listText(a.bristol),
        typeof a.agua === "number" ? `${fmt(a.agua)} L de água/dia` : null,
      ),
    },
  ].filter((r) => r.value);
}

async function Overview({ params }: { params: PageProps<"/nutri/pacientes/[id]">["params"] }) {
  const { id } = await params;
  const { user, patient } = await requireNutriPatient(id);
  const since7 = daysAgo(7);
  const since30 = daysAgo(30);

  const [assessments, energy, plan, logs, messages, notes, anamnesis, logs7, logs30, unread] = await Promise.all([
    prisma.assessment.findMany({ where: { patientId: id }, orderBy: { date: "asc" } }),
    prisma.energyCalculation.findFirst({ where: { patientId: id }, orderBy: { createdAt: "desc" } }),
    prisma.mealPlan.findFirst({ where: { patientId: id, isActive: true }, include: { meals: { include: { items: true } } } }),
    prisma.mealLog.findMany({ where: { patientId: id }, orderBy: { date: "desc" }, take: 6 }),
    prisma.message.findMany({
      where: { patientId: id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { sender: { select: { id: true, name: true } } },
    }),
    prisma.clinicalNote.findMany({ where: { patientId: id }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.anamnesis.findUnique({ where: { patientId: id } }),
    prisma.mealLog.count({ where: { patientId: id, date: { gte: since7 } } }),
    prisma.mealLog.count({ where: { patientId: id, date: { gte: since30 } } }),
    prisma.message.count({ where: { patientId: id, readAt: null, senderId: { not: user.id } } }),
  ]);
  const current = new Date(now());
  const [appointmentRows, schedule] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId: id, NOT: { status: "CANCELLED" } },
      include: appointmentInclude,
      orderBy: { startsAt: "desc" },
      take: 20,
    }),
    getScheduleSettings(user.id),
  ]);
  const upcomingAppointments = appointmentRows
    .filter((a) => (a.status === "REQUESTED" || a.status === "CONFIRMED") && a.endsAt >= current)
    .reverse();
  const pastAppointments = appointmentRows.filter((a) => !upcomingAppointments.includes(a)).slice(0, 3);
  const scheduleDefaults = {
    slotMinutes: schedule.slotMinutes,
    modes: schedule.modes,
    address: schedule.address,
    meetingUrl: schedule.meetingUrl,
  };

  const age = ageFrom(patient.birthDate);
  const sex = (patient.sex as Sex | null) ?? null;
  const first = assessments[0];
  const last = assessments[assessments.length - 1];
  const bmi = last ? last.bmi ?? calcBmi(last.weight, last.height) : null;
  const delta = first && last && assessments.length > 1 ? last.weight - first.weight : null;
  const anamnesisData = anamnesis ? parseAnamnesis(anamnesis.data) : null;
  const progress = anamnesisData ? anamnesisProgress(anamnesisData, { sex: patient.sex, role: "NUTRITIONIST" }) : null;
  const totals = plan ? planTotals(plan.meals) : null;
  const split = totals ? macroSplit(totals) : null;
  const base = `/nutri/pacientes/${id}`;

  const points = assessments.map((a) => {
    let waist: number | null = null;
    try {
      const c = JSON.parse(a.circumferences) as Record<string, number | null>;
      waist = typeof c.waist === "number" ? c.waist : null;
    } catch {
      waist = null;
    }
    return { date: a.date.toISOString(), weight: a.weight, bodyFat: a.bodyFatPercent, leanMass: a.leanMass, waist };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat
          label="Peso atual"
          value={last ? `${fmt(last.weight)} kg` : "—"}
          sub={
            delta !== null
              ? `${delta <= 0 ? "▼" : "▲"} ${fmt(Math.abs(delta))} kg desde ${first.date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
              : last
                ? `Avaliado ${fmtRelative(last.date)}`
                : "Nenhuma avaliação"
          }
          icon={<Scale className="h-5 w-5" />}
          tone="green"
        />
        <Stat
          label="IMC"
          value={fmt(bmi)}
          sub={bmi ? classifyBmi(bmi, age).label : "—"}
          icon={<Activity className="h-5 w-5" />}
          tone="blue"
        />
        <Stat
          label="% de gordura"
          value={last?.bodyFatPercent ? `${fmt(last.bodyFatPercent)}%` : "—"}
          sub={
            last?.bodyFatPercent
              ? `${classifyBodyFat(last.bodyFatPercent, sex).label} · MM ${fmt(last.leanMass)} kg`
              : "Sem composição corporal"
          }
          icon={<Percent className="h-5 w-5" />}
          tone="yellow"
        />
        <Stat
          label="Meta energética"
          value={energy ? `${fmt(energy.targetKcal, 0)} kcal` : "—"}
          sub={
            energy
              ? `P ${fmt(energy.proteinG, 0)} g · C ${fmt(energy.carbsG, 0)} g · G ${fmt(energy.fatG, 0)} g`
              : "Calcule em Energia e metas"
          }
          icon={<Flame className="h-5 w-5" />}
          tone="red"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Evolução"
            description="Peso, massa magra, % de gordura e cintura ao longo das avaliações."
            action={
              <Link href={`${base}/avaliacoes`} className="text-sm font-medium text-emerald-700 hover:underline">
                Avaliações
              </Link>
            }
          />
          <CardBody>
            {points.length >= 2 ? (
              <EvolutionChart points={points} />
            ) : (
              <EmptyState
                className="border-none py-8"
                title={points.length ? "Registre mais uma avaliação para ver o gráfico" : "Nenhuma avaliação registrada"}
                description="As avaliações antropométricas aparecem aqui como linha do tempo."
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Engajamento" icon={<Camera className="h-5 w-5" />} />
          <CardBody className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Registros no diário (7 dias)</span>
              <span className="font-semibold">{logs7}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Registros no diário (30 dias)</span>
              <span className="font-semibold">{logs30}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Mensagens não lidas</span>
              <span className="font-semibold">{unread}</span>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-slate-500">Anamnese preenchida</span>
                <span className="font-semibold">{progress ? `${progress.percent}%` : "0%"}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress?.percent ?? 0}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Paciente desde</span>
              <span className="font-semibold">{patient.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Resumo clínico"
            icon={<ClipboardList className="h-5 w-5" />}
            description={anamnesis ? `Anamnese atualizada ${fmtRelative(anamnesis.updatedAt)}` : undefined}
            action={
              <Link href={`${base}/anamnese`} className="text-sm font-medium text-emerald-700 hover:underline">
                Abrir anamnese
              </Link>
            }
          />
          <CardBody>
            {anamnesisData && summaryRows(anamnesisData).length ? (
              <dl className="space-y-3 text-sm">
                {summaryRows(anamnesisData).map((row) => (
                  <div key={row.label} className="grid gap-1 sm:grid-cols-3">
                    <dt className="text-slate-500">{row.label}</dt>
                    <dd className="text-slate-800 sm:col-span-2">{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <EmptyState
                className="border-none py-6"
                title="Anamnese ainda não preenchida"
                description="Preencha durante a consulta ou peça ao paciente para responder pelo app antes."
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Plano alimentar ativo"
            icon={<UtensilsCrossed className="h-5 w-5" />}
            action={
              <Link href={`${base}/plano`} className="text-sm font-medium text-emerald-700 hover:underline">
                Planos
              </Link>
            }
          />
          <CardBody className="@container">
            {plan && totals && split ? (
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-slate-900">{plan.title}</p>
                  <p className="text-xs text-slate-500">
                    {plan.meals.length} refeições · atualizado {fmtRelative(plan.updatedAt)}
                  </p>
                </div>
                {/* 4 colunas só quando o card tem largura para "Carboidratos" caber. */}
                <div className="grid grid-cols-2 gap-2 text-center text-sm @md:grid-cols-4">
                  {[
                    { label: "kcal", value: fmt(totals.kcal, 0), target: plan.targetKcal },
                    { label: "Proteínas", value: `${fmt(totals.protein, 0)} g`, sub: `${fmt(split.protein, 0)}%` },
                    { label: "Carboidratos", value: `${fmt(totals.carbs, 0)} g`, sub: `${fmt(split.carbs, 0)}%` },
                    { label: "Gorduras", value: `${fmt(totals.fat, 0)} g`, sub: `${fmt(split.fat, 0)}%` },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg bg-slate-50 p-2">
                      <p className="text-[11px] uppercase text-slate-400">{m.label}</p>
                      <p className="font-semibold text-slate-900">{m.value}</p>
                      <p className="text-[11px] text-slate-500">
                        {"target" in m && m.target ? `meta ${fmt(m.target, 0)}` : "sub" in m ? m.sub : ""}
                      </p>
                    </div>
                  ))}
                </div>
                <ul className="space-y-1 text-sm">
                  {plan.meals
                    .sort((a, b) => a.position - b.position)
                    .map((meal) => (
                      <li key={meal.id} className="flex justify-between text-slate-600">
                        <span>
                          {meal.time ? <span className="mr-2 font-mono text-xs text-slate-400">{meal.time}</span> : null}
                          {meal.name}
                        </span>
                        <span className="text-slate-400">{meal.items.length} itens</span>
                      </li>
                    ))}
                </ul>
              </div>
            ) : (
              <EmptyState
                className="border-none py-6"
                title="Nenhum plano ativo"
                description="Monte um plano com a base TACO e ative para o paciente visualizar."
              />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Diário alimentar recente"
            icon={<Camera className="h-5 w-5" />}
            action={
              <Link href={`${base}/diario`} className="text-sm font-medium text-emerald-700 hover:underline">
                Ver diário
              </Link>
            }
          />
          <CardBody>
            {logs.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {logs.map((log) => (
                  <Link key={log.id} href={`${base}/diario`} className="group overflow-hidden rounded-lg border border-slate-200">
                    {log.photoPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/uploads/${log.photoPath}`}
                        alt={`Foto: ${log.mealType}`}
                        className="aspect-square w-full object-cover transition group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-slate-50 p-2 text-center text-xs text-slate-500">
                        {log.description?.slice(0, 80) || "Sem foto"}
                      </div>
                    )}
                    <div className="px-2 py-1.5">
                      <p className="truncate text-xs font-medium text-slate-800">{log.mealType}</p>
                      <p className="flex items-center justify-between text-[11px] text-slate-500">
                        {fmtRelative(log.date)}
                        {log.feedback ? <Badge tone="green">ok</Badge> : <Badge tone="yellow">novo</Badge>}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState className="border-none py-6" title="Nenhum registro no diário" />
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Consultas"
              icon={<CalendarDays className="h-5 w-5" />}
              action={
                patient.status === "ACTIVE" ? (
                  <NewAppointmentButton
                    patients={[{ id: patient.id, name: patient.name }]}
                    fixedPatientId={patient.id}
                    settings={scheduleDefaults}
                    label="Agendar"
                    variant="secondary"
                  />
                ) : null
              }
            />
            <CardBody className="space-y-3">
              {upcomingAppointments.length ? (
                upcomingAppointments.map((a) => (
                  <AppointmentItem
                    key={a.id}
                    appointment={toAppointmentDTO(a, "NUTRITIONIST")}
                    viewer="NUTRITIONIST"
                    now={current.toISOString()}
                    minNoticeHours={schedule.minNoticeHours}
                    showPerson={false}
                  />
                ))
              ) : (
                <p className="text-sm text-slate-500">Nenhuma consulta agendada.</p>
              )}
              {pastAppointments.length ? (
                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Anteriores</p>
                  <ul className="space-y-1 text-sm text-slate-600">
                    {pastAppointments.map((a) => (
                      <li key={a.id} className="flex justify-between gap-2">
                        <span>
                          {shortWhen(a.startsAt)} · {a.mode === "ONLINE" ? "online" : "presencial"}
                        </span>
                        <Badge tone={STATUS_INFO[a.status as keyof typeof STATUS_INFO]?.tone ?? "neutral"}>
                          {STATUS_INFO[a.status as keyof typeof STATUS_INFO]?.label ?? a.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Últimas mensagens"
              icon={<MessageCircle className="h-5 w-5" />}
              action={
                <Link href={`${base}/chat`} className="text-sm font-medium text-emerald-700 hover:underline">
                  Abrir chat
                </Link>
              }
            />
            <CardBody>
              {messages.length ? (
                <ul className="space-y-3 text-sm">
                  {messages.map((m) => (
                    <li key={m.id} className="flex gap-2">
                      <span className="shrink-0 font-medium text-slate-700">
                        {m.sender.id === user.id ? "Você" : m.sender.name.split(" ")[0]}:
                      </span>
                      <span className="line-clamp-2 flex-1 text-slate-600">{m.content}</span>
                      <span className="shrink-0 text-xs text-slate-400">{fmtRelative(m.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  {patient.userId ? "Nenhuma mensagem ainda." : "O chat fica disponível quando o paciente criar a conta."}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Evolução clínica"
              icon={<NotebookPen className="h-5 w-5" />}
              action={
                <Link href={`${base}/notas`} className="inline-flex items-center text-sm font-medium text-emerald-700 hover:underline">
                  Todas <ChevronRight className="h-4 w-4" />
                </Link>
              }
            />
            <CardBody className="space-y-4">
              {notes.length ? (
                <ul className="space-y-3">
                  {notes.map((n) => (
                    <li key={n.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                      <p className="mb-1 text-xs text-slate-400">{fmtDateTime(n.createdAt)}</p>
                      <p className="line-clamp-3 whitespace-pre-wrap text-slate-700">{n.content}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              <NoteForm patientId={id} compact />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
