import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { prisma } from "./db";
import { getCurrentUser, type CurrentUser } from "./dal";
import type { Role } from "./roles";
import type { Patient } from "@/generated/prisma/client";

// Helpers para Route Handlers (rotas /api).

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Envolve um handler convertendo erros em respostas JSON padronizadas. */
export function route<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Erros internos do Next.js (pré-renderização, redirect...) seguem para o framework.
      unstable_rethrow(error);
      if (error instanceof ApiError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof z.ZodError) {
        const first = error.issues[0];
        return Response.json(
          { error: first?.message ?? "Dados inválidos.", issues: error.issues },
          { status: 400 },
        );
      }
      console.error(error);
      return Response.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
    }
  };
}

export async function readJson<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "Corpo da requisição inválido.");
  }
  return schema.parse(body);
}

export async function apiUser(role?: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Sua sessão expirou. Faça login novamente.");
  if (role && user.role !== role) throw new ApiError(403, "Acesso não permitido.");
  return user;
}

export type PatientAccess = {
  user: CurrentUser;
  patient: Patient;
  as: Role;
};

/**
 * Garante que o usuário logado pode acessar o prontuário:
 * - a nutricionista dona do paciente, ou
 * - o próprio paciente, se o vínculo estiver ativo.
 */
export async function apiPatientAccess(patientId: string, role?: Role): Promise<PatientAccess> {
  const user = await apiUser(role);
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (patient) {
    if (user.role === "NUTRITIONIST" && patient.nutritionistId === user.id) {
      return { user, patient, as: "NUTRITIONIST" };
    }
    if (user.role === "PATIENT" && patient.userId === user.id && patient.status === "ACTIVE") {
      return { user, patient, as: "PATIENT" };
    }
  }
  throw new ApiError(404, "Paciente não encontrado.");
}
