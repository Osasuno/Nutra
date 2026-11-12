import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "./db";
import { decrypt, SESSION_COOKIE } from "./session";
import { homeFor, type Role } from "./roles";

// Camada de acesso a dados (DAL): toda leitura protegida passa por aqui.

export const getSession = cache(async () => {
  const store = await cookies();
  return decrypt(store.get(SESSION_COOKIE)?.value);
});

export type CurrentUser = { id: string; name: string; email: string; role: Role };

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) return null;
  return { ...user, role: user.role as Role };
});

/** Exige login (e opcionalmente um papel). Redireciona quando não atende. */
export async function requireUser(role?: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    // Sessão válida para uma conta inexistente (ex.: banco recriado): limpa o cookie.
    const session = await getSession();
    redirect(session ? "/api/auth/logout" : "/login");
  }
  if (role && user.role !== role) redirect(homeFor(user.role));
  return user;
}

/** Paciente que pertence à nutricionista logada (404 caso contrário). */
export const requireNutriPatient = cache(async (patientId: string) => {
  const user = await requireUser("NUTRITIONIST");
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, nutritionistId: user.id },
  });
  if (!patient) notFound();
  return { user, patient };
});

/** Vínculo ativo do paciente logado com uma nutricionista (ou null). */
export const getPatientLinks = cache(async () => {
  const user = await requireUser("PATIENT");
  const links = await prisma.patient.findMany({
    where: { userId: user.id, status: { in: ["ACTIVE", "PENDING"] } },
    orderBy: { updatedAt: "desc" },
    include: {
      nutritionist: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          nutritionistProfile: {
            select: { crn: true, specialties: true, city: true, state: true, bio: true },
          },
        },
      },
    },
  });
  const active = links.find((l) => l.status === "ACTIVE") ?? null;
  const pending = links.filter((l) => l.status === "PENDING");
  return { user, active, pending };
});
