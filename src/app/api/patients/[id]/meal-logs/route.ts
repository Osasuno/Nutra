import { prisma } from "@/lib/db";
import { ApiError, apiPatientAccess, route } from "@/lib/api";
import { FOLLOWED_PLAN, MEAL_TYPES, MOODS } from "@/lib/meal-log";
import { deleteUpload, saveImage } from "@/lib/uploads";
import { z } from "@/lib/validation";

const scale = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().int().min(0).max(10).nullable(),
);
const optional = (values: readonly string[]) =>
  z.preprocess((v) => (v ? v : null), z.enum(values as [string, ...string[]]).nullable());

const schema = z.object({
  date: z.iso.datetime({ error: "Data/hora inválida." }),
  mealType: z.enum(MEAL_TYPES as [string, ...string[]]),
  description: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(3000).nullable()),
  hunger: scale,
  satiety: scale,
  mood: optional(MOODS),
  followedPlan: optional(FOLLOWED_PLAN.map((f) => f.value)),
});

/** O paciente registra uma refeição no diário (foto opcional). */
export const POST = route(async (request: Request, ctx: RouteContext<"/api/patients/[id]/meal-logs">) => {
  const { id } = await ctx.params;
  await apiPatientAccess(id, "PATIENT");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError(400, "Não foi possível ler o envio. Se a foto for muito grande, tente outra.");
  }
  const field = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" ? v : null;
  };
  const data = schema.parse({
    date: field("date"),
    mealType: field("mealType"),
    description: field("description"),
    hunger: field("hunger"),
    satiety: field("satiety"),
    mood: field("mood"),
    followedPlan: field("followedPlan"),
  });

  const date = new Date(data.date);
  if (date.getTime() > Date.now() + 10 * 60 * 1000) throw new ApiError(400, "A data não pode estar no futuro.");

  const photo = form.get("photo");
  if (!data.description && !(photo instanceof File && photo.size > 0)) {
    throw new ApiError(400, "Envie uma foto ou descreva o que comeu.");
  }

  const photoPath = photo instanceof File && photo.size > 0 ? await saveImage(photo) : null;
  try {
    const log = await prisma.mealLog.create({
      data: { patientId: id, ...data, date, photoPath },
      select: { id: true },
    });
    return Response.json(log, { status: 201 });
  } catch (error) {
    await deleteUpload(photoPath);
    throw error;
  }
});
