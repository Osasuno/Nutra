import { prisma } from "@/lib/db";
import { ApiError, apiUser, route } from "@/lib/api";
import { availableDays, getScheduleSettings } from "@/lib/appointments";
import { DATE_KEY_RE, addDays, bookingWindow, dateKeyOf } from "@/lib/schedule";

/** Horários livres da agenda (paciente: da sua nutricionista; nutricionista: a própria). */
export const GET = route(async (request: Request) => {
  const user = await apiUser();
  const url = new URL(request.url);
  const now = new Date();

  let nutritionistId: string;
  let excludeId: string | null = null;
  const exclude = url.searchParams.get("exclude");

  if (user.role === "PATIENT") {
    const link = await prisma.patient.findFirst({ where: { userId: user.id, status: "ACTIVE" }, select: { id: true, nutritionistId: true } });
    if (!link) throw new ApiError(403, "Você ainda não está em acompanhamento.");
    nutritionistId = link.nutritionistId;
    if (exclude) {
      const own = await prisma.appointment.findFirst({ where: { id: exclude, patientId: link.id }, select: { id: true } });
      excludeId = own?.id ?? null;
    }
  } else {
    nutritionistId = user.id;
    if (exclude) {
      const own = await prisma.appointment.findFirst({ where: { id: exclude, nutritionistId: user.id }, select: { id: true } });
      excludeId = own?.id ?? null;
    }
  }

  const settings = await getScheduleSettings(nutritionistId);
  const today = dateKeyOf(now);
  const { latestDay } = bookingWindow(settings, now);
  const fromParam = url.searchParams.get("from");
  const from = fromParam && DATE_KEY_RE.test(fromParam) && fromParam > today ? fromParam : today;
  const requested = Math.min(21, Math.max(1, Number(url.searchParams.get("days") ?? 14) || 14));
  const lastDay = addDays(from, requested - 1);
  const days = from > latestDay ? 0 : Math.min(requested, Math.round((Date.parse(latestDay) - Date.parse(from)) / 86_400_000) + 1);

  return Response.json({
    settings: {
      slotMinutes: settings.slotMinutes,
      modes: settings.modes,
      minNoticeHours: settings.minNoticeHours,
      maxDaysAhead: settings.maxDaysAhead,
    },
    today,
    from,
    latestDay,
    hasMore: lastDay < latestDay,
    days: days > 0 ? await availableDays(nutritionistId, settings, from, days, now, excludeId) : [],
  });
});
