import { prisma } from "@/lib/db";
import { ApiError, apiPatientAccess, route } from "@/lib/api";
import { saveExam } from "@/lib/exams";
import { firstName, pushAfter } from "@/lib/push";

/** Envia um exame (PDF ou imagem). O paciente envia; a nutricionista também pode anexar. */
export const POST = route(async (request: Request, ctx: RouteContext<"/api/patients/[id]/exams">) => {
  const { id } = await ctx.params;
  const { user, as, patient } = await apiPatientAccess(id);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError(400, "Não foi possível ler o envio. Se o arquivo for muito grande, tente outro.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Escolha um arquivo.");
  const raw = form.get("description");
  const description = typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 300) : null;

  const exam = await saveExam(file, { patientId: id, uploadedById: user.id, description });

  // Aviso no chat e notificação para a nutricionista ver que chegou exame novo.
  if (as === "PATIENT") {
    await prisma.message.create({
      data: {
        patientId: patient.id,
        senderId: user.id,
        content: `📎 Enviei um exame: ${exam.fileName}${description ? ` (${description})` : ""}. Está na aba Anamnese.`,
      },
    });
    pushAfter(patient.nutritionistId, {
      title: `${firstName(patient.name)} enviou um exame`,
      body: "Toque para ver na anamnese.",
      url: `/nutri/pacientes/${id}/anamnese#exames`,
      tag: `exame-${id}`,
    });
  }
  await prisma.patient.update({ where: { id }, data: { updatedAt: new Date() } });
  return Response.json({ id: exam.id }, { status: 201 });
});
