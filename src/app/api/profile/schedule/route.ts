import { prisma } from "@/lib/db";
import { ApiError, apiUser, readJson, route } from "@/lib/api";
import { MODES, TIME_RE, WEEKDAYS, hasOverlappingRanges, normalizeSchedule, toMinutes } from "@/lib/schedule";
import { optionalUrl, z } from "@/lib/validation";

const range = z.object({
  start: z.string().regex(TIME_RE, { error: "Horário inválido." }),
  end: z.string().regex(TIME_RE, { error: "Horário inválido." }),
});

const schema = z.object({
  slotMinutes: z.number().int().min(15).max(240),
  minNoticeHours: z.number().int().min(0).max(168),
  maxDaysAhead: z.number().int().min(7).max(180),
  modes: z.array(z.enum(MODES)).min(1, { error: "Escolha pelo menos uma modalidade." }),
  address: z.string().trim().max(300),
  meetingUrl: optionalUrl,
  days: z.array(z.array(range).max(4)).length(7),
});

/** Horários de atendimento da nutricionista. */
export const PUT = route(async (request: Request) => {
  const user = await apiUser("NUTRITIONIST");
  const data = await readJson(request, schema);
  data.days.forEach((ranges, day) => {
    if (ranges.some((r) => toMinutes(r.end) <= toMinutes(r.start))) {
      throw new ApiError(400, `${WEEKDAYS[day]}: o horário final deve ser depois do inicial.`);
    }
    if (hasOverlappingRanges(ranges)) throw new ApiError(400, `${WEEKDAYS[day]}: há faixas de horário sobrepostas.`);
  });
  const settings = normalizeSchedule({ ...data, meetingUrl: data.meetingUrl ?? "" });
  await prisma.nutritionistProfile.update({
    where: { userId: user.id },
    data: { scheduleSettings: JSON.stringify(settings) },
  });
  return Response.json({ ok: true });
});
