import { prisma } from "@/lib/db";
import { ApiError, readJson, route } from "@/lib/api";
import { createSession } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { acceptInvite, connectByCode, findInvite, findProfileByCode, uniqueInviteCode } from "@/lib/links";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { homeFor } from "@/lib/roles";
import {
  dateOnlySchema,
  emailSchema,
  nameSchema,
  passwordSchema,
  phoneSchema,
  sexSchema,
  z,
} from "@/lib/validation";

const schema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("NUTRITIONIST"),
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    phone: phoneSchema,
    crn: z.string().trim().min(3, { error: "Informe o número do CRN." }).max(30),
  }),
  z.object({
    role: z.literal("PATIENT"),
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    phone: phoneSchema,
    birthDate: dateOnlySchema,
    sex: sexSchema,
    code: z.string().trim().max(20).nullish(),
    invite: z.string().trim().max(100).nullish(),
    consent: z.literal(true, { error: "É necessário aceitar o termo de consentimento." }),
  }),
]);

export const POST = route(async (request: Request) => {
  const limit = rateLimit(`register:${clientIp(request)}`, 10, 60 * 60 * 1000);
  if (!limit.ok) throw new ApiError(429, "Muitas tentativas de cadastro. Tente novamente mais tarde.");

  const data = await readJson(request, schema);

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new ApiError(409, "Este e-mail já está cadastrado. Faça login.");

  // Valida código/convite antes de criar a conta, para o usuário poder corrigir.
  if (data.role === "PATIENT") {
    if (data.invite) {
      const invite = await findInvite(data.invite);
      if (!invite || invite.userId) throw new ApiError(404, "Convite inválido ou já utilizado.");
    } else if (data.code) {
      const profile = await findProfileByCode(data.code);
      if (!profile) throw new ApiError(404, "Código da nutricionista não encontrado.");
    }
  }

  const passwordHash = await hashPassword(data.password);

  const user =
    data.role === "NUTRITIONIST"
      ? await prisma.user.create({
          data: {
            name: data.name,
            email: data.email,
            passwordHash,
            role: "NUTRITIONIST",
            phone: data.phone,
            nutritionistProfile: {
              create: { crn: data.crn, inviteCode: await uniqueInviteCode() },
            },
          },
        })
      : await prisma.user.create({
          data: {
            name: data.name,
            email: data.email,
            passwordHash,
            role: "PATIENT",
            phone: data.phone,
            birthDate: data.birthDate,
            sex: data.sex,
          },
        });

  let warning: string | null = null;
  if (data.role === "PATIENT") {
    try {
      if (data.invite) await acceptInvite(user.id, data.invite);
      else if (data.code) await connectByCode(user.id, data.code);
    } catch (error) {
      warning =
        error instanceof ApiError
          ? error.message
          : "Conta criada, mas não foi possível concluir o vínculo com a nutricionista.";
    }
  }

  await createSession({ userId: user.id, role: user.role as "NUTRITIONIST" | "PATIENT" });
  return Response.json({ redirect: homeFor(user.role as "NUTRITIONIST" | "PATIENT"), warning }, { status: 201 });
});
