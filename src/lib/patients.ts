import "server-only";
import { prisma } from "./db";
import { anamnesisProgress, parseAnamnesis } from "./anamnesis";
import { ageFrom } from "./format";
import { bmi as calcBmi } from "./formulas";
import { OPEN_STATUSES } from "./schedule";

export type PatientCardData = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: "ACTIVE" | "PENDING" | "ARCHIVED";
  hasAccount: boolean;
  age: number | null;
  sex: string | null;
  objective: string | null;
  requestMessage: string | null;
  weight: number | null;
  weightDelta: number | null;
  bmi: number | null;
  bodyFat: number | null;
  assessments: number;
  lastAssessmentAt: string | null;
  lastLogAt: string | null;
  logs7d: number;
  pendingFeedback: number;
  unreadMessages: number;
  lastMessageAt: string | null;
  activePlan: { title: string; kcal: number | null } | null;
  anamnesisPercent: number | null;
  nextAppointment: string | null;
  /** "REQUESTED" quando a próxima consulta ainda aguarda confirmação. */
  nextAppointmentStatus: string | null;
  nextAppointmentMode: string | null;
  createdAt: string;
  lastActivityAt: string;
};

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export async function getPatientCards(nutritionistId: string): Promise<PatientCardData[]> {
  const current = new Date();
  const since7 = new Date(current.getTime() - 7 * 86_400_000);
  const [patients, recentLogs, upcoming] = await Promise.all([
    prisma.patient.findMany({
      where: { nutritionistId },
      orderBy: { updatedAt: "desc" },
      include: {
        assessments: {
          select: { date: true, weight: true, height: true, bmi: true, bodyFatPercent: true },
          orderBy: { date: "asc" },
        },
        mealPlans: { where: { isActive: true }, select: { title: true, targetKcal: true }, take: 1 },
        anamnesis: { select: { data: true } },
        mealLogs: { select: { date: true }, orderBy: { date: "desc" }, take: 1 },
        messages: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        _count: {
          select: {
            messages: { where: { readAt: null, senderId: { not: nutritionistId } } },
            mealLogs: { where: { feedback: null } },
          },
        },
      },
    }),
    prisma.mealLog.groupBy({
      by: ["patientId"],
      where: { patient: { nutritionistId }, date: { gte: since7 } },
      _count: { _all: true },
    }),
    prisma.appointment.findMany({
      where: { nutritionistId, status: { in: OPEN_STATUSES }, endsAt: { gte: current } },
      orderBy: { startsAt: "asc" },
      select: { patientId: true, startsAt: true, status: true, mode: true },
    }),
  ]);

  const logs7Map = new Map(recentLogs.map((r) => [r.patientId, r._count._all]));
  const nextMap = new Map<string, (typeof upcoming)[number]>();
  for (const a of upcoming) if (!nextMap.has(a.patientId)) nextMap.set(a.patientId, a);

  return patients.map((p) => {
    const first = p.assessments[0];
    const last = p.assessments[p.assessments.length - 1];
    const lastLog = p.mealLogs[0]?.date ?? null;
    const lastMessage = p.messages[0]?.createdAt ?? null;
    const activity = [p.updatedAt, lastLog, lastMessage, last?.date ?? null]
      .filter((d): d is Date => d instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const anamnesis = p.anamnesis ? parseAnamnesis(p.anamnesis.data) : null;

    return {
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      status: p.status as PatientCardData["status"],
      hasAccount: Boolean(p.userId),
      age: ageFrom(p.birthDate),
      sex: p.sex,
      objective: p.objective,
      requestMessage: p.requestMessage,
      weight: last?.weight ?? null,
      weightDelta: first && last && p.assessments.length > 1 ? last.weight - first.weight : null,
      bmi: last ? last.bmi ?? calcBmi(last.weight, last.height) : null,
      bodyFat: last?.bodyFatPercent ?? null,
      assessments: p.assessments.length,
      lastAssessmentAt: iso(last?.date),
      lastLogAt: iso(lastLog),
      logs7d: logs7Map.get(p.id) ?? 0,
      pendingFeedback: p._count.mealLogs,
      unreadMessages: p._count.messages,
      lastMessageAt: iso(lastMessage),
      activePlan: p.mealPlans[0] ? { title: p.mealPlans[0].title, kcal: p.mealPlans[0].targetKcal } : null,
      anamnesisPercent: anamnesis ? anamnesisProgress(anamnesis, { sex: p.sex, role: "NUTRITIONIST" }).percent : null,
      nextAppointment: iso(nextMap.get(p.id)?.startsAt),
      nextAppointmentStatus: nextMap.get(p.id)?.status ?? null,
      nextAppointmentMode: nextMap.get(p.id)?.mode ?? null,
      createdAt: p.createdAt.toISOString(),
      lastActivityAt: (activity ?? p.updatedAt).toISOString(),
    };
  });
}
