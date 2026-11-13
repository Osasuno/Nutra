import "server-only";
import { prisma } from "./db";
import type { Role } from "./roles";

// Contadores do menu e da bolinha no ícone do app instalado.

export type NotificationCounts = {
  unreadMessages: number;
  pendingRequests?: number;
  pendingFeedback?: number;
  pendingAppointments?: number;
};

export async function notificationCounts(userId: string, role: Role): Promise<NotificationCounts> {
  if (role === "NUTRITIONIST") {
    const [unreadMessages, pendingRequests, pendingFeedback, pendingAppointments] = await Promise.all([
      prisma.message.count({
        where: { readAt: null, senderId: { not: userId }, patient: { nutritionistId: userId, status: "ACTIVE" } },
      }),
      prisma.patient.count({ where: { nutritionistId: userId, status: "PENDING" } }),
      prisma.mealLog.count({ where: { feedback: null, patient: { nutritionistId: userId, status: "ACTIVE" } } }),
      prisma.appointment.count({ where: { nutritionistId: userId, status: "REQUESTED", startsAt: { gte: new Date() } } }),
    ]);
    return { unreadMessages, pendingRequests, pendingFeedback, pendingAppointments };
  }
  const unreadMessages = await prisma.message.count({
    where: { readAt: null, senderId: { not: userId }, patient: { userId, status: "ACTIVE" } },
  });
  return { unreadMessages };
}

/**
 * Número da bolinha: o que espera uma ação da pessoa (mensagens, pedidos e consultas a
 * confirmar). Refeições sem feedback ficam de fora: são rotina, não aviso.
 */
export const badgeTotal = (c: NotificationCounts) => c.unreadMessages + (c.pendingRequests ?? 0) + (c.pendingAppointments ?? 0);
