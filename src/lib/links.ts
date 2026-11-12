import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { prisma } from "./db";
import { ApiError } from "./api";

// Regras de vínculo entre paciente (conta) e nutricionista.

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I

export function generateInviteCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export async function uniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateInviteCode();
    const exists = await prisma.nutritionistProfile.findUnique({ where: { inviteCode: code } });
    if (!exists) return code;
  }
  return generateInviteCode(8);
}

export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

type PatientUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  birthDate?: Date | null;
  sex?: string | null;
};

async function loadPatientUser(userId: string): Promise<PatientUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, birthDate: true, sex: true, role: true },
  });
  if (!user || user.role !== "PATIENT") throw new ApiError(403, "Apenas pacientes podem se vincular.");
  return user;
}

/** Impede dois acompanhamentos ativos ao mesmo tempo. */
export async function ensureNoOtherActiveLink(userId: string, nutritionistId: string) {
  const active = await prisma.patient.findFirst({
    where: { userId, status: "ACTIVE", NOT: { nutritionistId } },
    include: { nutritionist: { select: { name: true } } },
  });
  if (active) {
    throw new ApiError(
      409,
      `Você já está em acompanhamento com ${active.nutritionist.name}. Encerre o vínculo atual (em Meu perfil) antes de se conectar a outra nutricionista.`,
    );
  }
}

export async function findProfileByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  return prisma.nutritionistProfile.findUnique({
    where: { inviteCode: normalized },
    include: { user: { select: { id: true, name: true } } },
  });
}

/** Código da nutricionista: vínculo ativo imediato. */
export async function connectByCode(userId: string, code: string) {
  const profile = await findProfileByCode(code);
  if (!profile) throw new ApiError(404, "Código não encontrado. Confira com a sua nutricionista.");
  const user = await loadPatientUser(userId);
  await ensureNoOtherActiveLink(user.id, profile.userId);

  const existing = await prisma.patient.findUnique({
    where: { nutritionistId_userId: { nutritionistId: profile.userId, userId: user.id } },
  });
  if (existing) {
    return prisma.patient.update({ where: { id: existing.id }, data: { status: "ACTIVE" } });
  }
  return prisma.patient.create({
    data: {
      nutritionistId: profile.userId,
      userId: user.id,
      status: "ACTIVE",
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      birthDate: user.birthDate ?? null,
      sex: user.sex ?? null,
    },
  });
}

/** Solicitação pelo diretório: fica pendente até a nutricionista aceitar. */
export async function requestLink(userId: string, nutritionistId: string, message: string | null) {
  const profile = await prisma.nutritionistProfile.findUnique({ where: { userId: nutritionistId } });
  if (!profile || !profile.acceptingPatients || !profile.showInDirectory) {
    throw new ApiError(404, "Esta nutricionista não está aceitando novos pacientes no momento.");
  }
  const user = await loadPatientUser(userId);
  await ensureNoOtherActiveLink(user.id, nutritionistId);

  const existing = await prisma.patient.findUnique({
    where: { nutritionistId_userId: { nutritionistId, userId: user.id } },
  });
  if (existing?.status === "ACTIVE") throw new ApiError(409, "Você já está vinculado a esta nutricionista.");
  if (existing) {
    return prisma.patient.update({
      where: { id: existing.id },
      data: { status: "PENDING", requestMessage: message },
    });
  }
  return prisma.patient.create({
    data: {
      nutritionistId,
      userId: user.id,
      status: "PENDING",
      requestMessage: message,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      birthDate: user.birthDate ?? null,
      sex: user.sex ?? null,
    },
  });
}

export async function findInvite(token: string) {
  if (!token || token.length > 100) return null;
  return prisma.patient.findUnique({
    where: { inviteToken: token },
    include: { nutritionist: { select: { id: true, name: true } } },
  });
}

/** Convite individual criado pela nutricionista para um paciente já cadastrado por ela. */
export async function acceptInvite(userId: string, token: string) {
  const invite = await findInvite(token);
  if (!invite || invite.userId) throw new ApiError(404, "Convite inválido ou já utilizado.");
  const user = await loadPatientUser(userId);
  await ensureNoOtherActiveLink(user.id, invite.nutritionistId);

  const duplicate = await prisma.patient.findUnique({
    where: { nutritionistId_userId: { nutritionistId: invite.nutritionistId, userId: user.id } },
  });
  if (duplicate) {
    throw new ApiError(409, "Sua conta já está vinculada a esta nutricionista. Peça para ela verificar o cadastro.");
  }

  return prisma.patient.update({
    where: { id: invite.id },
    data: {
      userId: user.id,
      status: "ACTIVE",
      inviteToken: null,
      email: invite.email ?? user.email,
      phone: invite.phone ?? user.phone ?? null,
      birthDate: invite.birthDate ?? user.birthDate ?? null,
      sex: invite.sex ?? user.sex ?? null,
    },
  });
}
